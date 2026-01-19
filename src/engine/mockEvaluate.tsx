export function mockEvaluate(segment) {
  const duration = segment.endTime - segment.startTime;

  return {
    score: Math.min(0.95, 0.6 + duration * 0.1),
    weakSegments: [
      {
        start: segment.startTime + duration * 0.3,
        end: segment.startTime + duration * 0.6,
      },
    ],
  };
}
