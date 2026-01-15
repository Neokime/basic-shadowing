// VideoPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    play, pause,
    startLoop, stopLoop,
    setPlaybackRate, playbackRate,
    setLoopRange, getTime
  } = useVideoControl(videoRef);

  // 실험용: 숫자 고정 A/B
  const [A, setAVal] = useState(1.20);
  const [B, setBVal] = useState(2.80);

  // 페이지 로드 시 범위 세팅
  useEffect(() => {
    setLoopRange(A, B);
  }, [A, B, setLoopRange]);

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

        <button onClick={() => startLoop(true)}>A–B Loop (Debug)</button>
        <button onClick={stopLoop}>Stop</button>

        <button onClick={() => setPlaybackRate(playbackRate - 0.05)}>- Speed</button>
        <button onClick={() => setPlaybackRate(playbackRate + 0.05)}>+ Speed</button>

        <button onClick={() => console.log("[TIME]", getTime())}>
          Print currentTime
        </button>

        <span style={{ marginLeft: 12 }}>Speed: {playbackRate.toFixed(2)}x</span>
        <span style={{ marginLeft: 12 }}>A: {A.toFixed(2)} / B: {B.toFixed(2)}</span>
      </div>

      {/* 실험용: A/B 입력을 바꾸고 싶으면 아래 input 추가해도 됨(선택) */}
      {/* 
      <div>
        <input type="number" step="0.01" value={A} onChange={(e)=>setAVal(Number(e.target.value))} />
        <input type="number" step="0.01" value={B} onChange={(e)=>setBVal(Number(e.target.value))} />
      </div>
      */}
    </div>
  );
}
