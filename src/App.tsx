import { useEffect, useState } from "react";
import VideoPlayer from "./components/videoPlayer";
import "./App.css";

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
  const [sessionResults, setSessionResults] =
  useState<SessionResult[]>([]);



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
    <div className="app-container">
      <h2 className="app-title">English Shadowing Player v0</h2>

      <VideoPlayer
        onDone={fetchHistory}
        onResult={(result: SessionResult) =>
          setSessionResults(prev => [...prev, result])
        }
        onSessionEnd={endSession}
      />

      <div className="debug-section">
        <h3 className="debug-title">Session (debug)</h3>
        <pre className="debug-content">{JSON.stringify(sessionResults, null, 2)}</pre>
      </div>

      {sessionSummary && (
      <div className="session-summary">
        <h3 className="session-summary-title">Session Summary</h3>
        <p>연습 문장 수: <span>{sessionSummary.totalAttempts}</span></p>
        <p>평균 점수: <span>{sessionSummary.avgScore}</span></p>
        <p>최고 점수: <span>{sessionSummary.bestScore}</span></p>
        <p>가장 어려웠던 문장: <span>{sessionSummary.weakestItemId}</span></p>
      </div>
      )}


      <div className="debug-section">
        <h3 className="debug-title">Practice History (debug)</h3>
        <pre className="debug-content">{JSON.stringify(history, null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;