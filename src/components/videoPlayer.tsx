import { useEffect, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";
import { useKeyboardControl } from "../hooks/useKeyboardControl";
import { useRecordSegment } from "../hooks/useRecordSegment";
import { mockEvaluate } from "../engine/mockEvaluate";
import { useSpeech } from "../speech/useSpeech";
import data from "../data/index.json";

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

type PracticeMode = "LISTEN" | "SHADOWING" | "DICTATION";

type Media =
  | { type: "audio"; src: string }
  | { type: "video"; src: string };

type Item = {
  id: string;
  media: Media;
  text: string;
};

/* ---------- 컴포넌트 ---------- */

export default function VideoPlayer({ onDone }: { onDone?: () => void }) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  /* ---------- 데이터 ---------- */

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem: Item = data[currentIndex];

  /* ---------- 상태 ---------- */

  const [mode, setMode] = useState<PracticeMode>("SHADOWING");
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const [A, setAVal] = useState<number | null>(null);
  const [B, setBVal] = useState<number | null>(null);

  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);

  /* ---------- 미디어 제어 ---------- */

  const {
    play,
    pause,
    startLoop,
    stopLoop,
    setPlaybackRate,
    playbackRate,
    setLoopRange,
    getTime,
  } = useVideoControl(mediaRef);

  /* ---------- 녹음 ---------- */

  const {
    recordState,
    start: startRecord,
    stop: stopRecord,
    reset: resetRecord,
    startTimeRef,
    endTimeRef,
  } = useRecordSegment(onDone);

  /* ---------- Dictation ---------- */

  const speech = useSpeech("en-US");

  useEffect(() => {
    if (mode !== "DICTATION") return;

    if (recordState === "RECORDING") speech.start();
    if (recordState === "DONE") {
      speech.stop();
      console.log("[DICTATION]", speech.transcript);
    }
  }, [recordState, mode]);

  /* ---------- 루프 ---------- */

  const applyLoop = () => {
    if (A == null || B == null) return;
    setLoopRange(A, B);
    startLoop(true);
  };

  const beginRecord = () => startRecord(getTime());
  const finishRecord = () => stopRecord(getTime());

  /* ---------- 키보드 ---------- */

  useKeyboardControl({
    setA: () => setAVal(getTime()),
    setB: () => setBVal(getTime()),
    toggleLoop: applyLoop,
    stop: stopLoop,
  });

  useEffect(() => {
    if (A != null && B != null) setLoopRange(A, B);
  }, [A, B, setLoopRange]);

  /* ---------- SHADOWING 평가 ---------- */

  useEffect(() => {
    if (mode !== "SHADOWING") return;
    if (recordState !== "DONE") return;

    const st = startTimeRef.current;
    const et = endTimeRef.current;
    if (st == null || et == null || et <= st) return;

    const segment: Segment = {
      contentId: currentItem.id,
      startTime: st,
      endTime: et,
      playbackRate,
    };

    setEvalResult(mockEvaluate(segment));
  }, [recordState, mode, playbackRate, currentItem]);

  /* ---------- 다음 콘텐츠 ---------- */

  const nextItem = () => {
    stopLoop();
    setAVal(null);
    setBVal(null);
    setEvalResult(null);
    resetRecord();
    setCurrentIndex((i) => (i + 1) % data.length);
  };

  /* ---------- UI ---------- */

  return (
    <div style={{ width: 640 }}>
      {/* 모드 */}
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setMode("LISTEN")}>Listen</button>
        <button onClick={() => setMode("SHADOWING")}>Shadowing</button>
        <button onClick={() => setMode("DICTATION")}>Dictation</button>
      </div>

      {/* 미디어 */}
      {currentItem.media.type === "video" ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          controls
          src={currentItem.media.src}
          onTimeUpdate={() => setCurrentTime(getTime())}
          width={640}
        />
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          controls
          src={currentItem.media.src}
          onTimeUpdate={() => setCurrentTime(getTime())}
        />
      )}

      {/* 자막 */}
      {showSubtitle && (
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 500 }}>
          {currentItem.text}
        </div>
      )}

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
        {mode !== "LISTEN" && recordState === "READY" && (
          <button onClick={beginRecord}>녹음 시작</button>
        )}
        {recordState === "RECORDING" && (
          <button onClick={finishRecord}>완료</button>
        )}
        {recordState === "DONE" && (
          <>
            <button onClick={resetRecord}>다시 연습</button>
            <button onClick={nextItem}>다음</button>
          </>
        )}

        <div style={{ marginTop: 8 }}>
          <span>Mode: {mode}</span>{" "}
          <span>Speed: {playbackRate.toFixed(2)}x</span>{" "}
          <span>
            A: {A?.toFixed(2) ?? "-"} / B: {B?.toFixed(2) ?? "-"}
          </span>{" "}
          <span>State: {recordState}</span>
        </div>

        {/* 평가 */}
        {mode === "SHADOWING" && evalResult && (
          <div style={{ marginTop: 8 }}>
            <div>Score: {evalResult.score.toFixed(2)}</div>
            <div>{evalResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
