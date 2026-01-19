// hooks/useRecordSegment.ts
import { useState, useRef } from "react";

type RecordState = "READY" | "RECORDING" | "DONE";

export function useRecordSegment() {
  const [recordState, setRecordState] = useState<RecordState>("READY");

  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);

  function start(currentTime: number) {
    if (recordState !== "READY") return;
    startTimeRef.current = currentTime;
    endTimeRef.current = null;
    setRecordState("RECORDING");
  }

  function stop(currentTime: number) {
    if (recordState !== "RECORDING") return;
    endTimeRef.current = currentTime;
    setRecordState("DONE");
  }

  function reset() {
    startTimeRef.current = null;
    endTimeRef.current = null;
    setRecordState("READY");
  }

  return {
    recordState,
    start,
    stop,
    reset,
    startTimeRef,
    endTimeRef,
  };
}
