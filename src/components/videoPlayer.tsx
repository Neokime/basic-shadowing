import { useEffect, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";
import { useKeyboardControl } from "../hooks/useKeyboardControl";
import { useRecordSegment } from "../hooks/useRecordSegment";
import { subtitles } from "../hooks/subtitles";
import { mockEvaluate } from "../engine/mockEvaluate";

/* ---------- 타입 ---------- */

type Segment = {
  contentId: string;
  startTime: number;
  endTime: number;
  playbackRate: number;
};

type EvalResult = {
  score: number;
  state: "good" | "partial_mismatch" | "global_mismatch";
  message: string;
  weakSegments: { start: number; end: number }[];
};

/* ---------- 컴포넌트 ---------- */

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ---------- 상태 ---------- */

  const [showSubtitle, setShowSubtitle] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  // A/B = 루프 기준
  const [A, setAVal] = useState<number | null>(null);
  const [B, setBVal] = useState<number | null>(null);

  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);

  /* ---------- 비디오 제어 ---------- */

  const {
    play,
    pause,
    startLoop,
    stopLoop,
    setPlaybackRate,
    playbackRate,
    setLoopRange,
    getTime,
  } = useVideoControl(videoRef);

  /* ---------- 녹음 제어 (시간 기반) ---------- */

  const {
    recordState,
    start: startRecord,
    stop: stopRecord,
    reset: resetRecord,
    startTimeRef,
    endTimeRef,
  } = useRecordSegment();

  /* ---------- 공통 동작 ---------- */

  const applyLoop = () => {
    if (A == null || B == null) return;
    setLoopRange(A, B);
    startLoop(true);
  };

  const beginRecord = () => {
    startRecord(getTime());
  };

  const finishRecord = () => {
    stopRecord(getTime());
  };

  /* ---------- 키보드 ---------- */

  useKeyboardControl({
    setA: () => {
      const t = getTime();
      setAVal(t);
      console.log("[A SET]", t);
    },
    setB: () => {
      const t = getTime();
      setBVal(t);
      console.log("[B SET]", t);
    },
    toggleLoop: () => {
      applyLoop();
    },
    stop: () => {
      stopLoop();
    },
  });

  /* ---------- A/B 변경 시 루프 갱신 ---------- */

  useEffect(() => {
    if (A != null && B != null) {
      setLoopRange(A, B);
    }
  }, [A, B, setLoopRange]);

  /* ---------- 녹음 완료 → 평가(mock) ---------- */

  useEffect(() => {
    if (recordState !== "DONE") return;

    const st = startTimeRef.current;
    const et = endTimeRef.current;

    // 방어
    if (st == null || et == null || et <= st) {
      console.log("[EVAL SKIP] invalid segment", { st, et });
      return;
    }

    const segment: Segment = {
      contentId: "test.mp4",
      startTime: st,
      endTime: et,
      playbackRate,
    };

    const result: EvalResult = mockEvaluate(segment);
    setEvalResult(result);

    console.log("[EVAL RESULT]", result);
  }, [recordState, playbackRate, startTimeRef, endTimeRef]);

  /* ---------- 자막 ---------- */

  function getActiveSubtitle(time: number) {
    return subtitles.find(
      (s) => time >= s.start && time <= s.end
    );
  }

  const activeSubtitle = getActiveSubtitle(currentTime);

  /* ---------- UI ---------- */

  return (
    <div style={{ width: 640 }}>
      {/* 비디오 + 자막 */}
      <div style={{ position: "relative", width: 640 }}>
        <video
          ref={videoRef}
          width={640}
          controls
          src="/videos/test.mp4"
          onTimeUpdate={() => setCurrentTime(getTime())}
        />

        {/* 자막 오버레이 */}
        {showSubtitle && activeSubtitle && (
          <div
            style={{
              position: "absolute",
              bottom: 64,
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "90%",
              textAlign: "center",
              color: "white",
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1.4,
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
              pointerEvents: "none",
              padding: "6px 10px",
            }}
          >
            {activeSubtitle.text}
          </div>
        )}
      </div>

      {/* 컨트롤 */}
      <div style={{ marginTop: 10 }}>
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>

        <button onClick={() => setAVal(getTime())}>Set A</button>
        <button onClick={() => setBVal(getTime())}>Set B</button>

        <button onClick={applyLoop} disabled={A == null || B == null}>
          A–B Loop
        </button>
        <button onClick={stopLoop}>Loop Stop</button>

        <button onClick={() => setPlaybackRate(playbackRate - 0.05)}>
          - Speed
        </button>
        <button onClick={() => setPlaybackRate(playbackRate + 0.05)}>
          + Speed
        </button>

        <button onClick={() => setShowSubtitle((v) => !v)}>
          {showSubtitle ? "자막 끄기" : "자막 켜기"}
        </button>

        {/* 녹음 */}
        {recordState === "READY" && (
          <button onClick={beginRecord}>녹음 시작</button>
        )}
        {recordState === "RECORDING" && (
          <button onClick={finishRecord}>완료</button>
        )}
        {recordState === "DONE" && (
          <button onClick={resetRecord}>다시 연습</button>
        )}

        <div style={{ marginTop: 8 }}>
          <span>Speed: {playbackRate.toFixed(2)}x</span>{" "}
          <span>
            A: {A?.toFixed(2) ?? "-"} / B: {B?.toFixed(2) ?? "-"}
          </span>{" "}
          <span>State: {recordState}</span>
        </div>

        {/* 평가 결과 */}
        {evalResult && (
          <div style={{ marginTop: 8 }}>
            <div>Score: {evalResult.score.toFixed(2)}</div>
            <div>{evalResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
