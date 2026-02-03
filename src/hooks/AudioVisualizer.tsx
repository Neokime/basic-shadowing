import { useEffect, useRef } from "react";
import "./AudioVisualizer.css";

type Props = {
  getAnalyserData: (() => Uint8Array | null) | null;
};

export default function AudioVisualizer({ getAnalyserData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!getAnalyserData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const data = getAnalyserData();
      if (!data) return;

      const width = canvas.width;
      const height = canvas.height;
      const barCount = 32;
      const barWidth = width / barCount;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < barCount; i++) {
        const value = data[i];
        const barHeight = (value / 255) * height * 0.8;
        const x = i * barWidth;
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, "#00ff88");
        gradient.addColorStop(0.5, "#00dd77");
        gradient.addColorStop(1, "#00aa55");

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0, 255, 136, 0.5)";
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [getAnalyserData]);

  return (
    <div className="audio-visualizer">
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="visualizer-canvas"
      />
      <div className="visualizer-label">Recording...</div>
    </div>
  );
}