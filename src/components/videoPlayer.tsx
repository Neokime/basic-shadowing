import { useEffect, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";
import { useKeyboardControl } from "../hooks/useKeyboardControl";
import { useRecordSegment } from "../hooks/useRecordSegment";
import { mockEvaluate } from "../engine/mockEvaluate";
import data from "../data/index.json";

type PracticeMode = "LISTEN" | "SHADOWING" | "DICTATION";

type Media =
  | { type: "audio"; src: string }
  | { type: "video"; src: string };

type Item = {
  id: string;
  media: Media;
  text: string;
};

type Props = {
  onDone?: () => void;
  onResult?: (result: any) => void;
  onSessionEnd?: () => void;
};

export default function VideoPlayer({
  onDone,
  onResult,
  onSessionEnd,
}: Props) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const [index, setIndex] = useState(0);
  const item: Item = data[index];

  const [mode, setMode] = useState<PracticeMode>("SHADOWING");
  const [showSubtitle, setShowSubtitle] = useState(true);

  const [A, setA] = useState<number | null>(null);
  const [B, setB] = useState<number | null>(null);
  const [evalResult, setEvalResult] = useState<any>(null);

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

  /* ================= 녹음 완료 콜백 ================= */
  const onRecordDone = async ({
    startTime,
    endTime,
    audioBlob,
  }: {
    startTime: number;
    endTime: number;
    audioBlob: Blob;
  }) => {
    /* 1. 녹음 파일 업로드 */
    const formData = new FormData();
    formData.append("itemId", item.id);
    formData.append("audio", audioBlob, "recording.webm");

    await fetch("http://localhost:8087/practice/record", {
      method: "POST",
      body: formData,
    });

    /* 2. 평가 */
    const result = mockEvaluate({
      contentId: item.id,
      startTime,
      endTime,
      playbackRate,
    });

    setEvalResult(result);

    /* 3. 세션 결과 전달 */
    onResult?.({
      itemId: item.id,
      score: result.score,
      state: result.state,
      startTime,
      endTime,
    });

    /* 4. 히스토리 갱신 */
    onDone?.();
  };

  const { recordState, start, stop, reset } =
    useRecordSegment(onRecordDone);

  /* ================= 루프 ================= */
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

  /* ================= 다음 콘텐츠 ================= */
  const next = () => {
    stopLoop();
    setA(null);
    setB(null);
    setEvalResult(null);
    reset();
    setIndex((i) => (i + 1) % data.length);
    onSessionEnd?.();
  };

  return (
    <div style={{ width: 640 }}>
      {/* 모드 */}
      <div>
        <button onClick={() => setMode("LISTEN")}>Listen</button>
        <button onClick={() => setMode("SHADOWING")}>Shadowing</button>
        <button onClick={() => setMode("DICTATION")}>Dictation</button>
      </div>

      {/* 미디어 */}
      {item.media.type === "video" ? (
        <video
          ref={mediaRef as any}
          controls
          width={640}
          src={item.media.src}
        />
      ) : (
        <audio ref={mediaRef as any} controls src={item.media.src} />
      )}

      {/* 자막 */}
      {showSubtitle && <div>{item.text}</div>}

      {/* 컨트롤 */}
      <div>
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>

        <button onClick={() => setA(getTime())}>Set A</button>
        <button onClick={() => setB(getTime())}>Set B</button>
        <button onClick={applyLoop}>A–B Loop</button>
        <button onClick={stopLoop}>Loop Stop</button>

        <button onClick={() => setPlaybackRate(playbackRate - 0.05)}>
          - Speed
        </button>
        <button onClick={() => setPlaybackRate(playbackRate + 0.05)}>
          + Speed
        </button>

        <button onClick={() => setShowSubtitle((v) => !v)}>
          자막 {showSubtitle ? "끄기" : "켜기"}
        </button>

        {/* 녹음 */}
        {recordState === "READY" && mode !== "LISTEN" && (
          <button onClick={() => start(getTime())}>녹음 시작</button>
        )}
        {recordState === "RECORDING" && (
          <button onClick={() => stop(getTime())}>완료</button>
        )}
        {recordState === "DONE" && (
          <>
            <button onClick={reset}>다시 연습</button>
            <button onClick={next}>다음</button>
          </>
        )}
      </div>

      {/* 평가 결과 */}
      {evalResult && (
        <div>
          <div>Score: {evalResult.score.toFixed(2)}</div>
          <div>{evalResult.message}</div>
        </div>
      )}
    </div>
  );
}
