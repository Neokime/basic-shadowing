import { useEffect, useState } from "react";
import VideoPlayer from "./components/videoPlayer";

function App() {
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = () => {
    fetch("http://localhost:8087/practice/history")
      .then(res => res.json())
      .then(setHistory);
  };

  useEffect(() => {
    fetchHistory(); // 최초 로드
  }, []);

  return (
    <div>
      <h2>English Shadowing Player v0</h2>

      {/* DONE 시점에 history 갱신 */}
      <VideoPlayer onDone={fetchHistory} />

      <h3>Practice History (debug)</h3>
      <pre>{JSON.stringify(history, null, 2)}</pre>
    </div>
  );
}

export default App;
