// VideoPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";
import { useKeyboardControl } from "../hooks/useKeyboardControl";
import { useRecordSegment } from "../hooks/useRecordSegment";

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    play, pause,
    startLoop, stopLoop,
    setPlaybackRate, playbackRate,
    setLoopRange, getTime
  } = useVideoControl(videoRef);

  // ⭐ record hook 연결
  const {
    recordState,
    start: startRecord,
    stop: stopRecord,
    reset: resetRecord,
  } = useRecordSegment();

  // 실험용: 숫자 고정 A/B
  const [A, setAVal] = useState(1.20);
  const [B, setBVal] = useState(2.80);

  useKeyboardControl({
    setA: () => {
      const t = getTime();
      setAVal(t);
      setLoopRange(t, B);
      console.log("[A SET]", t);
    },
    setB: () => {
      const t = getTime();
      setBVal(t);
      setLoopRange(A, t);
      console.log("[B SET]", t);
    },
    toggleLoop: () => {
      startLoop(true);
      startRecord(getTime()); // 수동 녹음 시작
      console.log("[LOOP TOGGLE + RECORD START]");
    },
    stop: () => {
      stopLoop();
      console.log("[LOOP OFF]");
    }
  });

  // 페이지 로드 시 범위 세팅
  useEffect(() => {
    setLoopRange(A, B);
  }, [A, B, setLoopRange]);

  // DONE 상태 확인 (지금은 로그만)
  useEffect(() => {
    if (recordState === "DONE") {
      console.log(" 평가 구간 확정");
    }
  }, [recordState]);

  return (
    <div>
      <video
        ref={videoRef}
        width={640}
        controls
        src="/videos/example.mp4"
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>

        <button onClick={() => setLoopRange(A, B)}>
          Apply A/B (Fixed)
        </button>

        {/* A–B 루프 시작 = 연습 시작 */}
        <button
          onClick={() => {
            startLoop(true);
            startRecord(getTime());
          }}
        >
          A–B Loop (Debug)
        </button>

        <button onClick={stopLoop}>Stop</button>

        <button onClick={() => setPlaybackRate(playbackRate - 0.05)}>- Speed</button>
        <button onClick={() => setPlaybackRate(playbackRate + 0.05)}>+ Speed</button>

        <button onClick={() => console.log("[TIME]", getTime())}>
          Print currentTime
        </button>

        {/* 수동 완료 버튼 */}
        {recordState === "RECORDING" && (
          <button
            onClick={() => stopRecord(getTime())}
            style={{ marginLeft: 8 }}
          >
            완료
          </button>
        )}

        {/* DONE 후 리셋 (선택) */}
        {recordState === "DONE" && (
          <button
            onClick={resetRecord}
            style={{ marginLeft: 8 }}
          >
            다시 연습
          </button>
        )}

        <span style={{ marginLeft: 12 }}>
          Speed: {playbackRate.toFixed(2)}x
        </span>
        <span style={{ marginLeft: 12 }}>
          A: {A.toFixed(2)} / B: {B.toFixed(2)}
        </span>
        <span style={{ marginLeft: 12 }}>
          State: {recordState}
        </span>
      </div>
    </div>
  );
}
