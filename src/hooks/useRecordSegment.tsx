import { useState, useRef } from "react";
import { mockEvaluate } from "../engine/mockEvaluate";

type RecordState = "READY" | "RECORDING" | "DONE";

export function useRecordSegment(onDone?: () => void) {
  const [recordState, setRecordState] = useState<RecordState>("READY");

  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);

  function start(currentTime: number) {
    if (recordState !== "READY") return;

    startTimeRef.current = currentTime;
    endTimeRef.current = null;
    setRecordState("RECORDING");
  }

  async function stop(currentTime: number) {
    if (recordState !== "RECORDING") return;

    endTimeRef.current = currentTime;
    setRecordState("DONE");

    const evalResult = mockEvaluate({
      start: startTimeRef.current,
      end: endTimeRef.current,
    });

    const payload = {
      mode: "SHADOWING",
      hasSpoken: true,
      score: evalResult.score ?? null,
      state: evalResult.state ?? null,
      weakSegments: evalResult.weakSegments ?? [],
    };

  
    await fetch("http://localhost:8087/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    
    onDone?.();
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
