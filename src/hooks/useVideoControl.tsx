// hooks/useVideoControl.ts
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

type Range = { a: number | null; b: number | null };

export function useVideoControl(videoRef: RefObject<HTMLVideoElement | null>) {
  const [playbackRate, setPlaybackRateState] = useState(1.0);

  const rangeRef = useRef<Range>({ a: null, b: null });
  const loopingRef = useRef(false);
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
    },
    [videoRef]
  );

  const setLoopRange = useCallback((a: number, b: number) => {
    const aa = Math.max(0, Math.min(a, b));
    const bb = Math.max(aa + 0.01, Math.max(a, b));
    rangeRef.current = { a: aa, b: bb };
    countRef.current = 0;
    console.log(`[RANGE SET] A=${aa.toFixed(3)}, B=${bb.toFixed(3)}`);
  }, []);

  // 🔑 루프는 언제든 “갱신 가능”
  const startLoop = useCallback(
    (debug = false) => {
      const v = videoRef.current;
      const { a, b } = rangeRef.current;
      if (!v || a == null || b == null) return;

      loopingRef.current = true;
      (v as any).__loopDebug = debug;

      if (v.currentTime < a || v.currentTime > b) {
        v.currentTime = a;
      }

      v.play();
      console.log("[LOOP ON / REFRESH]", a.toFixed(3), b.toFixed(3));
    },
    [videoRef]
  );

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

      if (t < a) {
        v.currentTime = a;
        return;
      }

      if (t >= b) {
        countRef.current += 1;
        const before = t;
        v.currentTime = a;

        if ((v as any).__loopDebug) {
          console.log(
            `[JUMP #${countRef.current}] ${before.toFixed(
              3
            )} → ${a.toFixed(3)}`
          );
        }
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = playbackRate;
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
