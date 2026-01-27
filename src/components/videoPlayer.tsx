import { useEffect, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";
import { useKeyboardControl } from "../hooks/useKeyboardControl";
import { useRecordSegment } from "../hooks/useRecordSegment";
import { mockEvaluate } from "../engine/mockEvaluate";
import data from "../data/index.json";
import "./VideoPlayer.css";

/* ================= 타입 ================= */

type PracticeMode = "LISTEN" | "SHADOWING" | "DICTATION";

type Line = {
  start: number;
  end: number;
  text: string;
};

type AudioItem = {
  id: string;
  media: { type: "audio"; src: string };
  text: string;
};

type VideoItem = {
  id: string;
  media: { type: "video"; src: string };
  lines: Line[];
};

type Item = AudioItem | VideoItem;

type Props = {
  onDone?: () => void;
  onResult?: (result: any) => void;
  onSessionEnd?: () => void;
};

/* ================= 컴포넌트 ================= */

export default function VideoPlayer({
  onDone,
  onResult,
  onSessionEnd,
}: Props) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const [index, setIndex] = useState(0);
  const item: Item = data[index];

  const [mode, setMode] = useState<PracticeMode>("LISTEN");
  const [showSubtitle, setShowSubtitle] = useState(true);

  const [A, setA] = useState<number | null>(null);
  const [B, setB] = useState<number | null>(null);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  /* video + lines */
  const [activeLineIndex, setActiveLineIndex] = useState(0);

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

  /* ================= Play / Pause ================= */

  const togglePlay = () => {
    if (!mediaRef.current) return;

    if (isPlaying) {
      pause();
      setIsPlaying(false);
    } else {
      play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const onEnded = () => setIsPlaying(false);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, []);

  /* ================= LISTEN: video + lines 자동 자막 ================= */

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    if (mode !== "LISTEN") return;
    if (item.media.type !== "video") return;
    if (!("lines" in item)) return;

    const lines = item.lines;

    const onTimeUpdate = () => {
      const t = el.currentTime;
      const idx = lines.findIndex(
        (l) => t >= l.start && t < l.end
      );
      if (idx !== -1 && idx !== activeLineIndex) {
        setActiveLineIndex(idx);
      }
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [item, mode, activeLineIndex]);

  /* ================= 녹음 완료 ================= */

  const onRecordDone = async ({
    startTime,
    endTime,
    audioBlob,
  }: {
    startTime: number;
    endTime: number;
    audioBlob: Blob;
  }) => {
    const formData = new FormData();
    formData.append("itemId", item.id);
    formData.append("audio", audioBlob, "recording.webm");

    await fetch("http://localhost:8087/practice/record", {
      method: "POST",
      body: formData,
    });

    const result = mockEvaluate({
      contentId: item.id,
      startTime,
      endTime,
      playbackRate,
    });

    setEvalResult(result);

    onResult?.({
      itemId: item.id,
      score: result.score,
      state: result.state,
      startTime,
      endTime,
    });

    onDone?.();
  };

  const { recordState, start, stop, reset } =
    useRecordSegment(onRecordDone);

  /* ================= A–B Loop ================= */

  const applyLoop = () => {
    if (A == null || B == null) return;
    setLoopRange(A, B);
    startLoop(true);
  };

  useKeyboardControl({
    setA: () => setA(getTime()),
    setB: () => setB(getTime()),
    toggleLoop: applyLoop,
    stop: stopLoop,
  });

  useEffect(() => {
    if (A != null && B != null) setLoopRange(A, B);
  }, [A, B]);

  /* ================= 네비게이션 ================= */

  const next = () => {
    stopLoop();
    setA(null);
    setB(null);
    setEvalResult(null);
    reset();
    setIsPlaying(false);
    setActiveLineIndex(0);
    setIndex((i) => (i + 1) % data.length);
    onSessionEnd?.();
  };

  const prev = () => {
    stopLoop();
    setA(null);
    setB(null);
    setEvalResult(null);
    reset();
    setIsPlaying(false);
    setActiveLineIndex(0);
    setIndex((i) => (i - 1 + data.length) % data.length);
    onSessionEnd?.();
  };

  const speedPresets = [0.5, 0.75, 1, 1.25];

  /* ================= 렌더 ================= */

  return (
    <div className="video-player">
      {/* 헤더 */}
      <div className="player-header">
        <div className="mode-selector">
          <button 
            onClick={() => setMode("LISTEN")} 
            className={mode === "LISTEN" ? "active" : ""}
          >
            Listen
          </button>
          <button 
            onClick={() => setMode("SHADOWING")} 
            className={mode === "SHADOWING" ? "active" : ""}
          >
            Shadowing
          </button>
          <button 
            onClick={() => setMode("DICTATION")} 
            className={mode === "DICTATION" ? "active" : ""}
          >
            Dictation
          </button>
        </div>

        <div className="sentence-nav">
          <button className="nav-btn" onClick={prev}>←</button>
          <span className="nav-counter">{index + 1} / {data.length}</span>
          <button className="nav-btn" onClick={next}>→</button>
        </div>
      </div>

      {/* 미디어 */}
      {item.media.type === "video" ? (
        <video 
          ref={mediaRef as any} 
          className="media-player" 
          src={item.media.src} 
        />
      ) : (
        <audio 
          ref={mediaRef as any} 
          className="media-player" 
          src={item.media.src} 
        />
      )}

      {/* 자막 토글 */}
      <div className="subtitle-toggle">
        <button
          className="btn-subtitle-toggle"
          onClick={() => setShowSubtitle(v => !v)}
        >
          {showSubtitle ? "Hide subtitle" : "Show subtitle"}
        </button>
      </div>

      {/* 자막 */}
      {showSubtitle && (
        <div className="subtitle">
          {item.media.type === "audio" && "text" in item && item.text}
          {item.media.type === "video" && "lines" in item &&
            item.lines[activeLineIndex]?.text}
        </div>
      )}

      {/* 컨트롤 */}
      <div className="controls">
        {/* Play + Set A/B */}
        <div className="play-section">
          <button
            className={`btn-play ${isPlaying ? "playing" : ""}`}
            onClick={togglePlay}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button className="btn-link" onClick={() => setA(getTime())}>
            Set A
          </button>
          <button className="btn-link" onClick={() => setB(getTime())}>
            Set B
          </button>
        </div>

        {/* Loop 컨트롤 */}
        <div className="loop-section">
          <button className="btn-loop" onClick={applyLoop}>
            A–B Loop
          </button>
          <button className="btn-link" onClick={stopLoop}>
            Loop Stop
          </button>
        </div>

        {/* 속도 선택 */}
        <div className="speed-section">
          {speedPresets.map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackRate(speed)}
              className={`speed-chip ${Math.abs(playbackRate - speed) < 0.01 ? "active" : ""}`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* 녹음 */}
        <div className="record-section">
          {recordState === "READY" && mode !== "LISTEN" && (
            <button 
              className="btn-record" 
              onClick={() => start(getTime())}
            >
              Start Recording
            </button>
          )}

          {recordState === "RECORDING" && (
            <button 
              className="btn-record recording" 
              onClick={() => stop(getTime())}
            >
              Recording…
            </button>
          )}

          {recordState === "DONE" && (
            <div className="done-actions">
              <button className="btn-reset" onClick={reset}>
                Try Again
              </button>
              <button className="btn-next" onClick={next}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 평가 결과 */}
      {evalResult && (
        <div className="eval-result">
          <div className="eval-header">
            <span className="eval-icon">✓</span>
            <span className="eval-score">{evalResult.score.toFixed(0)}</span>
          </div>
          <div className="eval-message">{evalResult.message}</div>
        </div>
      )}
    </div>
  );
}