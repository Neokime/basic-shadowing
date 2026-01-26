import { useState, useRef } from "react";

export type RecordState = "READY" | "RECORDING" | "DONE";

type RecordDonePayload = {
  startTime: number;
  endTime: number;
  audioBlob: Blob;
};

export function useRecordSegment(
  onDone?: (payload: RecordDonePayload) => void
) {
  const [recordState, setRecordState] = useState<RecordState>("READY");

  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function start(currentTime: number) {
    if (recordState !== "READY") return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    recorder.start();

    startTimeRef.current = currentTime;
    endTimeRef.current = null;
    setRecordState("RECORDING");
  }

  function stop(currentTime: number) {
    if (recordState !== "RECORDING") return;

    endTimeRef.current = currentTime;
    setRecordState("DONE");

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.onstop = () => {
      const audioBlob = new Blob(chunksRef.current, {
        type: "audio/webm",
      });

      onDone?.({
        startTime: startTimeRef.current!,
        endTime: endTimeRef.current!,
        audioBlob,
      });

      recorder.stream.getTracks().forEach((t) => t.stop());
    };

    recorder.stop();
  }

  function reset() {
    startTimeRef.current = null;
    endTimeRef.current = null;
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    setRecordState("READY");
  }

  return {
    recordState,
    start,
    stop,
    reset,
  };
}
