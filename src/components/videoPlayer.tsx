import { useEffect, useMemo, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";
import { useKeyboardControl } from "../hooks/useKeyboardControl";
import { useRecordSegment } from "../hooks/useRecordSegment";
import { mockEvaluate } from "../engine/mockEvaluate";
import data from "../data/index.json";
import "./VideoPlayer.css";

export type PracticeMode = "LISTEN" | "SHADOWING" | "DICTATION";

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
  onModeChange?: (mode: PracticeMode) => void;
};

/* ===== Dictation Diff 유틸 ===== */

type DiffToken = {
  text: string;
  state: "correct" | "wrong" | "extra";
};

function normalizeForCompare(s: string) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[""]/g, '"')
    .replace(/[']/g, "'")
    .replace(/[^\w\s'".,!?-]/g, "");
}

function tokenize(s: string) {
  return s.trim().length ? s.trim().split(/\s+/) : [];
}

function buildTokenDiff(userRaw: string, correctRaw: string): DiffToken[] {
  const user = tokenize(normalizeForCompare(userRaw));
  const correct = tokenize(normalizeForCompare(correctRaw));
  const out: DiffToken[] = [];
  const n = Math.max(user.length, correct.length);

  for (let i = 0; i < n; i++) {
    const u = user[i];
    const c = correct[i];

    if (u == null) break;
    if (c == null) {
      out.push({ text: u, state: "extra" });
      continue;
    }
    out.push({ text: u, state: u === c ? "correct" : "wrong" });
  }

  return out;
}

export default function VideoPlayer({
  onDone,
  onResult,
  onSessionEnd,
  onModeChange,
}: Props) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const [index, setIndex] = useState(0);
  const item: Item = data[index];

  const [mode, setMode] = useState<PracticeMode>("LISTEN");
  const [showSubtitle, setShowSubtitle] = useState(true);

  /* Dictation */
  const [dictationText, setDictationText] = useState("");
  const [dictationSubmitted, setDictationSubmitted] = useState(false);
  const [dictationOpen, setDictationOpen] = useState(false);

  /* Common */
  const [A, setA] = useState<number | null>(null);
  const [B, setB] = useState<number | null>(null);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  /* 시간 정보 */
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  const correctText = useMemo(() => {
    if ("text" in item) return item.text;
    return item.lines.map((l) => l.text).join(" ");
  }, [item]);

  const dictationDiff = useMemo(() => {
    if (!dictationSubmitted) return [];
    return buildTokenDiff(dictationText, correctText);
  }, [dictationSubmitted, dictationText, correctText]);

  /* 시간 포맷 */
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /* Play / Pause */
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
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration);

    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  /* LISTEN: video subtitle sync */
  /* 시간 업데이트 + 자막 동기화 통합 */
useEffect(() => {
  const el = mediaRef.current;
  if (!el) return;

  const onEnded = () => setIsPlaying(false);
  
  const onTimeUpdate = () => {
    // 1. 시간 업데이트 (모든 모드)
    setCurrentTime(el.currentTime);
    
    // 2. 자막 동기화 (LISTEN + video only)
    if (mode === "LISTEN" && item.media.type === "video" && "lines" in item) {
      const t = el.currentTime;
      const idx = item.lines.findIndex((l) => t >= l.start && t < l.end);
      if (idx !== -1 && idx !== activeLineIndex) {
        setActiveLineIndex(idx);
      }
    }
  };
  
  const onLoadedMetadata = () => setDuration(el.duration);

  el.addEventListener("ended", onEnded);
  el.addEventListener("timeupdate", onTimeUpdate);
  el.addEventListener("loadedmetadata", onLoadedMetadata);

  return () => {
    el.removeEventListener("ended", onEnded);
    el.removeEventListener("timeupdate", onTimeUpdate);
    el.removeEventListener("loadedmetadata", onLoadedMetadata);
  };
}, [mode, item, activeLineIndex]); // 의존성 추가

/* 기존의 별도 자막 동기화 useEffect는 삭제 */

  /* SHADOWING record done */
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

  const { recordState, start, stop, reset } = useRecordSegment(onRecordDone);

  /* A–B Loop */
  const applyLoop = () => {
    if (A == null || B == null) return;

    const start = Math.min(A, B);
    const end = Math.max(A, B);

    setLoopRange(start, end);
    startLoop(true);
  };


  useKeyboardControl({
    setA: () => setA(getTime()),
    setB: () => setB(getTime()),
    toggleLoop: applyLoop,
    stop: stopLoop,
  });

  useEffect(() => {
    if (A != null && B != null) {
      setLoopRange(Math.min(A, B), Math.max(A, B));
    }
  }, [A, B]);


  /* Reset on index / mode */
  useEffect(() => {
    setDictationText("");
    setDictationSubmitted(false);
    setDictationOpen(false);
    setCurrentTime(0);
    setDuration(0);
  }, [index, mode]);

  /* Navigation */
  const next = () => {
    stopLoop();
    reset();
    setA(null);
    setB(null);
    setEvalResult(null);
    setIsPlaying(false);
    setActiveLineIndex(0);
    setIndex((i) => (i + 1) % data.length);
    onSessionEnd?.();
  };

  const prev = () => {
    stopLoop();
    reset();
    setA(null);
    setB(null);
    setEvalResult(null);
    setIsPlaying(false);
    setActiveLineIndex(0);
    setIndex((i) => (i - 1 + data.length) % data.length);
    onSessionEnd?.();
  };

  const speedPresets = [0.5, 0.75, 1, 1.25];

  const subtitleText =
    "text" in item ? item.text : item.lines[activeLineIndex]?.text;

  const changeMode = (m: PracticeMode) => {
    setMode(m);
    onModeChange?.(m);
    if (m === "DICTATION") setShowSubtitle(false);
  };

  return (
    <div className={`video-player ${mode === "DICTATION" ? "dictation-mode" : ""}`}>
      {/* Header */}
      <div className="player-header">
        <div className="mode-selector">
          <button
            onClick={() => changeMode("LISTEN")}
            className={mode === "LISTEN" ? "active" : ""}
          >
            Listen
          </button>
          <button
            onClick={() => changeMode("SHADOWING")}
            className={mode === "SHADOWING" ? "active" : ""}
          >
            Shadowing
          </button>
          <button
            onClick={() => changeMode("DICTATION")}
            className={mode === "DICTATION" ? "active" : ""}
          >
            Dictation
          </button>
        </div>

        <div className="sentence-nav">
          <button className="nav-btn" onClick={prev}>
            ←
          </button>
          <span className="nav-counter">
            {index + 1} / {data.length}
          </span>
          <button className="nav-btn" onClick={next}>
            →
          </button>
        </div>
      </div>

      {/* Media */}
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

      {/* 플레이어 정보 바 */}
      <div className="player-info">
        <div className="time-info">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>

        {(A !== null || B !== null) && (
          <div className="loop-info">
            <span className="loop-label">Loop:</span>
            <span className="loop-range">
              {A !== null ? formatTime(A) : "--"} → {B !== null ? formatTime(B) : "--"}
            </span>
          </div>
        )}

        <div className="playback-info">
          <span className="playback-rate">{playbackRate.toFixed(2)}×</span>
        </div>
      </div>

      {/* Subtitle toggle */}
      <div className="subtitle-toggle">
        <button
          className="btn-subtitle-toggle"
          onClick={() => setShowSubtitle((v) => !v)}
        >
          {showSubtitle ? "Hide subtitle" : "Show subtitle"}
        </button>
      </div>

      {/* Subtitle */}
      {showSubtitle && <div className="subtitle">{subtitleText}</div>}

      {/* Controls */}
      <div className="controls">
        {/* Play */}
        <div className="play-section">
          <button
            className={`btn-play ${isPlaying ? "playing" : ""}`}
            onClick={togglePlay}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>

        {/* Loop */}
        <div className="loop-section">
          <button className="btn-link" onClick={() => setA(getTime())}>
            Set A
          </button>
          <button className="btn-link" onClick={() => setB(getTime())}>
            Set B
          </button>
          <button className="btn-loop" onClick={applyLoop}>
            A–B Loop
          </button>
          <button className="btn-link" onClick={stopLoop}>
            Loop Stop
          </button>
        </div>

        {/* Speed */}
        <div className="speed-section">
          {speedPresets.map((s) => (
            <button
              key={s}
              className={`speed-chip ${
                Math.abs(playbackRate - s) < 0.01 ? "active" : ""
              }`}
              onClick={() => setPlaybackRate(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* SHADOWING */}
        {mode === "SHADOWING" && (
          <div className="record-section">
            {recordState === "READY" && (
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
        )}

        {/* DICTATION */}
        {mode === "DICTATION" && (
          <div className="dictation-panel">
            <button
              className="dictation-toggle"
              onClick={() => setDictationOpen((v) => !v)}
            >
              {dictationOpen ? "Hide dictation" : "Start dictation"}
            </button>

            {dictationOpen && (
              <div className="dictation-body">
                {!dictationSubmitted ? (
                  <>
                    <textarea
                      className="dictation-input"
                      value={dictationText}
                      onChange={(e) => setDictationText(e.target.value)}
                      placeholder="Type exactly what you heard…"
                    />
                    <button
                      className="btn-record"
                      onClick={() => setDictationSubmitted(true)}
                    >
                      Submit
                    </button>
                  </>
                ) : (
                  <div className="dictation-result">
                    {/* 통계 */}
                    <div className="dictation-stats">
                      <div className="stat-item">
                        <span className="stat-dot correct"></span>
                        <span className="stat-count">
                          {dictationDiff.filter((t) => t.state === "correct").length}
                        </span>
                        <span className="stat-label">correct</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-dot wrong"></span>
                        <span className="stat-count">
                          {dictationDiff.filter((t) => t.state === "wrong").length}
                        </span>
                        <span className="stat-label">wrong</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-dot extra"></span>
                        <span className="stat-count">
                          {dictationDiff.filter((t) => t.state === "extra").length}
                        </span>
                        <span className="stat-label">extra</span>
                      </div>
                    </div>

                    <div className="dictation-block">
                      <div className="dictation-label">Your answer</div>
                      <div className="dictation-diff">
                        {dictationDiff.length === 0 ? (
                          <span className="tok empty">—</span>
                        ) : (
                          dictationDiff.map((t, i) => (
                            <span key={i} className={`tok ${t.state}`}>
                              {t.text}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="dictation-block">
                      <div className="dictation-label">Correct sentence</div>
                      <div className="dictation-correct">{correctText}</div>
                    </div>

                    <div className="dictation-actions">
                      <button
                        className="btn-reset"
                        onClick={() => {
                          setDictationText("");
                          setDictationSubmitted(false);
                        }}
                      >
                        Try Again
                      </button>
                      <button className="btn-next" onClick={next}>
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Evaluation (SHADOWING only) */}
      {mode === "SHADOWING" && evalResult && (
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