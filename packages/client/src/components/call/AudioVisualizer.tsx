import { useEffect, useRef } from "react";
import { Box, alpha, useTheme } from "@mui/material";

type AudioVisualizerProps = {
  stream: MediaStream | null;
  size?: number;
};

export default function AudioVisualizer({
  stream,
  size = 40,
}: AudioVisualizerProps) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return undefined;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || !canvasRef.current) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      const average =
        dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
      const normalizedVolume = average / 255;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const radius = (canvas.width / 2) * normalizedVolume;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(radius, 2), 0, 2 * Math.PI);
      ctx.fillStyle = theme.palette.success.main;
      ctx.globalAlpha = 0.6;
      ctx.fill();

      const barWidth = 2;
      const barSpacing = 1;
      const barsCount = 8;
      const startX = centerX - ((barWidth + barSpacing) * barsCount) / 2;

      for (let i = 0; i < barsCount; i++) {
        const barHeight = (dataArray[i * 4] / 255) * (canvas.height * 0.6);
        const x = startX + i * (barWidth + barSpacing);
        const y = centerY - barHeight / 2;

        ctx.fillStyle = theme.palette.success.main;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, theme]);

  if (!stream) return null;

  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        bgcolor: alpha(theme.palette.success.main, 0.1),
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
        }}
      />
    </Box>
  );
}
