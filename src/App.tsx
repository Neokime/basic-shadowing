import { useEffect, useState } from "react";
import VideoPlayer from "./components/videoPlayer";

type SessionResult = {
  itemId: string;
  score: number;
  state: string;
  startTime: number;
  endTime: number;
};

type SessionSummary = {
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  weakestItemId: string;
};

function App() {
  /** 서버 히스토리 */
  const [history, setHistory] = useState<any[]>([]);

  /** 세션 단위 결과 */
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);

  /** 세션 요약 */
  const [sessionSummary, setSessionSummary] =
    useState<SessionSummary | null>(null);

  const fetchHistory = () => {
    fetch("http://localhost:8087/practice/history")
      .then(res => res.json())
      .then(setHistory);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  /** 세션 요약 계산 */
  function buildSessionSummary(
    results: SessionResult[]
  ): SessionSummary | null {
    if (results.length === 0) return null;

    let best = results[0];
    let worst = results[0];

    let sum = 0;
    for (const r of results) {
      sum += r.score;
      if (r.score > best.score) best = r;
      if (r.score < worst.score) worst = r;
    }

    return {
      totalAttempts: results.length,
      avgScore: Number((sum / results.length).toFixed(2)),
      bestScore: best.score,
      worstScore: worst.score,
      weakestItemId: worst.itemId,
    };
  }

  /** 세션 종료 */
  const endSession = () => {
    const summary = buildSessionSummary(sessionResults);
    setSessionSummary(summary);
    setSessionResults([]);
  };

  return (
    <div>
      <h2>English Shadowing Player v0</h2>

      <VideoPlayer
        onDone={fetchHistory}
        onResult={(result: SessionResult) =>
          setSessionResults(prev => [...prev, result])
        }
        onSessionEnd={endSession}
      />

      <h3>Session (debug)</h3>
      <pre>{JSON.stringify(sessionResults, null, 2)}</pre>

      <h3>Session Summary (debug)</h3>
      <pre>{JSON.stringify(sessionSummary, null, 2)}</pre>

      <h3>Practice History (debug)</h3>
      <pre>{JSON.stringify(history, null, 2)}</pre>
    </div>
  );
}

export default App;
