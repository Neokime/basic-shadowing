import { useState, useRef } from "react";

type RecordState = "READY" | "RECORDING" | "DONE";

export function useRecordSegment(
  onDone: (data: {
    startTime: number;
    endTime: number;
    audioBlob: Blob;
  }) => void
) {
  const [recordState, setRecordState] = useState<RecordState>("READY");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  
  // 오디오 스트림과 분석기 추가
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const start = async (currentTime: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 오디오 컨텍스트 설정
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];
      startTimeRef.current = currentTime;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        onDone({
          startTime: startTimeRef.current,
          endTime: currentTime,
          audioBlob: blob,
        });
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      recorder.start();
      setRecordState("RECORDING");
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stop = (currentTime: number) => {
    if (mediaRecorder.current && recordState === "RECORDING") {
      mediaRecorder.current.stop();
      setRecordState("DONE");
    }
  };

  const reset = () => {
    setRecordState("READY");
    chunks.current = [];
  };

  // 분석 데이터를 가져오는 함수
  const getAnalyserData = () => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      return dataArrayRef.current;
    }
    return null;
  };

  return { 
    recordState, 
    start, 
    stop, 
    reset,
    getAnalyserData 
  };
}