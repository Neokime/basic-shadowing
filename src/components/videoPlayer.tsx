import { useEffect, useRef, useState } from "react";
import { useVideoControl } from "../hooks/useVideoControl";
import { useKeyboardControl } from "../hooks/useKeyboardControl";
import { useRecordSegment } from "../hooks/useRecordSegment";
import { subtitles } from "../hooks/subtitles";
import { mockEvaluate } from "../engine/mockEvaluate";
import { useSpeech } from "../speech/useSpeech";

/*타입선언 */

type Segment = {
  contentId: string;
  startTime: number;
  endTime: number;
  playbackRate: number;        //컴파일 타임 전용
};

type EvalResult = {
  score: number;
  state: "good" | "partial_mismatch" | "global_mismatch";
  message: string;
  weakSegments: { start: number; end: number }[];
};

type PracticeMode = "LISTEN" | "SHADOWING" | "DICTATION";  //유니온 리터럴 타입


/* ---------- 컴포넌트 ---------- */

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);  //Dom을 조작하는 핸들
                                                           // 전체 기능의 기준점

  /* ---------- 상태 ---------- */

  const [mode, setMode] = useState<PracticeMode>("SHADOWING");     // 전체 동작 분기 스위치
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const [A, setAVal] = useState<number | null>(null);         //구간 기준점
  const [B, setBVal] = useState<number | null>(null);

  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);  // 평가 결과 캐시

  /* ---------- 비디오 ---------- */
                                   
  const {                    //dom 조작 로직을 외부 hook 분리
    play,                    // ui는 명령만 호출
    pause,
    startLoop,
    stopLoop,
    setPlaybackRate,
    playbackRate,
    setLoopRange,
    getTime,
  } = useVideoControl(videoRef);

  /* ---------- 녹음(시간 기준) ---------- */

  const {
    recordState,
    start: startRecord,     //시작 시간/종료시간만 기록
    stop: stopRecord,
    reset: resetRecord,
    startTimeRef,
    endTimeRef,
  } = useRecordSegment();

  /* ---------- Speech (DICTATION 전용) ---------- */

  const speech = useSpeech("en-US");

  useEffect(() => {
    if (mode !== "DICTATION") return;          // 어떤 상태 조합이 되었을 때 자동으로 실행되는 로직

    if (recordState === "RECORDING") {
      speech.start();
    }

    if (recordState === "DONE") {
      speech.stop();
      console.log("[DICTATION]", {
        spoken: speech.hasSpoken,
        transcript: speech.transcript,
      });
    }
  }, [recordState, mode]);

  /* ---------- 공통 동작 ---------- */

  const applyLoop = () => {
    if (A == null || B == null) return;
    setLoopRange(A, B);
    startLoop(true);
  };

  const beginRecord = () => startRecord(getTime());
  const finishRecord = () => stopRecord(getTime());

  /* ---------- 키보드 ---------- */

  useKeyboardControl({
    setA: () => setAVal(getTime()),     //키보드 비디오 제어 명령
    setB: () => setBVal(getTime()),
    toggleLoop: applyLoop,
    stop: stopLoop,
  });

  /* ---------- A/B 변경 시 루프 갱신 ---------- */

  useEffect(() => {
    if (A != null && B != null) {
      setLoopRange(A, B);
    }
  }, [A, B, setLoopRange]);

  /* ---------- SHADOWING 평가 ---------- */

  useEffect(() => {
    if (mode !== "SHADOWING") return;     // 녹음 상태에 따라 음성 인식 엔진 on/off 
    if (recordState !== "DONE") return;

    const st = startTimeRef.current;
    const et = endTimeRef.current;

    if (st == null || et == null || et <= st) {
      console.log("[EVAL SKIP] invalid segment", { st, et });
      return;
    }

    const segment: Segment = {        //녹음이 끝난 구간을 평가엔진 입력으로 변환
      contentId: "test.mp4",
      startTime: st,
      endTime: et,
      playbackRate,
    };

    const result = mockEvaluate(segment);
    setEvalResult(result);
    console.log("[EVAL RESULT]", result);
  }, [recordState, mode, playbackRate]);

  /* ---------- 자막 ---------- */

  const activeSubtitle = subtitles.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  /* ---------- UI ---------- */

  return (
    <div style={{ width: 640 }}>
      {/* 모드 */}
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setMode("LISTEN")}>Listen</button>
        <button onClick={() => setMode("SHADOWING")}>Shadowing</button>
        <button onClick={() => setMode("DICTATION")}>Dictation</button>
      </div>

      {/* 비디오 */}
      <div style={{ position: "relative", width: 640 }}>
        <video
          ref={videoRef}
          width={640}
          controls
          src="/videos/test.mp4"
          onTimeUpdate={() => setCurrentTime(getTime())}
        />

        {showSubtitle && activeSubtitle && (
          <div
            style={{
              position: "absolute",
              bottom: 64,
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: 22,
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
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
        {mode !== "LISTEN" && recordState === "READY" && (
          <button onClick={beginRecord}>녹음 시작</button>
        )}
        {recordState === "RECORDING" && (
          <button onClick={finishRecord}>완료</button>
        )}
        {recordState === "DONE" && (
          <button onClick={resetRecord}>다시 연습</button>
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
