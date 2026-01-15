// hooks/useVideoControl.ts
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

type Range = { a: number | null; b: number | null };

export function useVideoControl(videoRef: RefObject<HTMLVideoElement | null>) {
  const [playbackRate, setPlaybackRateState] = useState(1.0);

  const rangeRef = useRef<Range>({ a: null, b: null });
  const loopingRef = useRef(false);

  // 실험용: 반복 횟수/오차 기록
  const countRef = useRef(0);

  const getTime = useCallback(() => {
    const v = videoRef.current;
    return v ? v.currentTime : 0;
  }, [videoRef]);

  const play = useCallback(() => videoRef.current?.play(), [videoRef]);
  const pause = useCallback(() => videoRef.current?.pause(), [videoRef]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const v = videoRef.current;
      if (!v) return;
      const next = Math.min(2.0, Math.max(0.5, rate));
      v.playbackRate = next;
      setPlaybackRateState(next);
      console.log("[RATE]", next);
    },
    [videoRef]
  );

  const setLoopRange = useCallback((a: number, b: number) => {
    
    const aa = Math.max(0, Math.min(a, b));
    const bb = Math.max(aa + 0.01, Math.max(a, b));

    rangeRef.current = { a: aa, b: bb };
    countRef.current = 0;
    console.log("[RANGE SET]", { A: aa.toFixed(3), B: bb.toFixed(3) });
  }, []);

  const startLoop = useCallback((debug = false) => {
    const v = videoRef.current;
    const { a, b } = rangeRef.current;
    if (!v || a == null || b == null) return;

    loopingRef.current = true;
    countRef.current = 0;

    console.log("[LOOP ON]", { A: a.toFixed(3), B: b.toFixed(3), debug });

    // 즉시 A로 이동 후 재생(실험 안정화)
    v.currentTime = a;
    v.play();

    // debug 플래그는 timeupdate에서 사용
    (v as any).__loopDebug = debug;
  }, [videoRef]);

  const stopLoop = useCallback(() => {
    const v = videoRef.current;
    loopingRef.current = false;
    if (v) (v as any).__loopDebug = false;
    console.log("[LOOP OFF]");
  }, [videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      if (!loopingRef.current) return;

      const { a, b } = rangeRef.current;
      if (a == null || b == null) return;

      const t = v.currentTime;

      //  핵심 조건: B를 넘으면 A로 점프
      if (t >= b) {
        countRef.current += 1;

        const before = t;
        v.currentTime = a;
        const after = v.currentTime; // 세팅 직후 값(대개 a 근처)

        const debug = Boolean((v as any).__loopDebug);

        if (debug) {
          // 오차: 실제 점프 후 시간이 A와 얼마나 차이 나는지
          const err = after - a;

          console.log(
            `[JUMP #${countRef.current}] before=${before.toFixed(3)} -> after=${after.toFixed(3)} (A=${a.toFixed(3)}, B=${b.toFixed(3)}, err=${err.toFixed(4)})`
          );
        }
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef]);

  // 초기 playbackRate 동기화(선택)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
  }, [videoRef, playbackRate]);

  return {
    play,
    pause,
    startLoop,
    stopLoop,
    setPlaybackRate,
    playbackRate,
    setLoopRange,
    getTime,
  };
}
