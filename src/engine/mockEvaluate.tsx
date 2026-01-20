type Segment = {
  contentId: string;
  startTime: number;
  endTime: number;
  playbackRate: number;
};


export function mockEvaluate(segment: Segment) {
  const duration = segment.endTime - segment.startTime;

  return {
    score: Math.max(0.4, Math.min(0.9, 0.6 + Math.random() * 0.3)),
    state: duration < 1.5 ? "global_mismatch" : "partial_mismatch",
    message:
      duration < 1.5
        ? "구간이 짧아요. 조금 더 길게 연습해보세요."
        : "일부 구간에서 발음 차이가 있어요.",
    weakSegments: [
      {
        start: segment.startTime + 0.3,
        end: segment.startTime + 0.8,
      },
    ],
  };
}
