import { useState, useRef } from "react";

//상태분리
type RecordState = "READY" | "RECORDING" | "DONE";

export function useRecordSegment() {
  const [recordState, setRecordState] = useState<RecordState>("READY"); //상태설정

  const startTimeRef = useRef<number | null>(null);  //녹음 시작 박스
  const endTimeRef = useRef<number | null>(null);    // 녹음 끝나는 박스

  function start(currentTime: number) {           // 녹음 시작 메서드
    if (recordState !== "READY") return;          // 상태전이 함수에서는 return없음

    startTimeRef.current = currentTime;
    endTimeRef.current = null;
    setRecordState("RECORDING");     
  }

  function stop(currentTime: number) {                  //녹음 하는중
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
