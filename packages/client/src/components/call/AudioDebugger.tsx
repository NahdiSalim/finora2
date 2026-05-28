import { useEffect, useState } from "react";
import { Box, Typography, Paper, Chip } from "@mui/material";

type AudioDebuggerProps = {
  localStream: MediaStream | null;
  remoteStreams: Array<{ userId: number; stream: MediaStream }>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
};

export default function AudioDebugger({
  localStream,
  remoteStreams,
  isAudioEnabled,
  isVideoEnabled,
}: AudioDebuggerProps) {
  const [localVolume, setLocalVolume] = useState(0);
  const [remoteVolumes, setRemoteVolumes] = useState<Map<number, number>>(
    new Map(),
  );

  useEffect(() => {
    if (!localStream) return undefined;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(localStream);
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    const interval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      setLocalVolume(Math.round(average));
    }, 100);

    return () => {
      clearInterval(interval);
      audioContext.close();
    };
  }, [localStream]);

  useEffect(() => {
    const contexts: Array<{ userId: number; context: AudioContext }> = [];

    remoteStreams.forEach((rs) => {
      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(rs.stream);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        contexts.push({ userId: rs.userId, context: audioContext });

        setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          setRemoteVolumes((prev) =>
            new Map(prev).set(rs.userId, Math.round(average)),
          );
        }, 100);
      } catch {
        /* ignored */
      }
    });

    return () => {
      contexts.forEach(({ context }) => context.close());
    };
  }, [remoteStreams]);

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 100,
        right: 20,
        p: 2,
        bgcolor: "rgba(0,0,0,0.9)",
        color: "white",
        borderRadius: 2,
        zIndex: 10001,
        minWidth: 280,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Audio Debug Monitor
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
          Local Stream: {localStream ? "✓" : "✗"}
        </Typography>
        {localStream && (
          <>
            <Typography variant="caption" sx={{ display: "block" }}>
              Audio Tracks: {localStream.getAudioTracks().length}
            </Typography>
            {localStream.getAudioTracks().map((track, idx) => (
              <Box key={track.id} sx={{ ml: 1 }}>
                <Chip
                  label={`Track ${idx}: ${track.enabled ? "Enabled" : "Disabled"}`}
                  size="small"
                  color={track.enabled ? "success" : "error"}
                  sx={{ fontSize: 10, height: 20, mt: 0.5 }}
                />
                <Typography
                  variant="caption"
                  sx={{ display: "block", ml: 1, fontSize: 9 }}
                >
                  Volume: {localVolume} | Ready: {track.readyState}
                </Typography>
              </Box>
            ))}
          </>
        )}
      </Box>

      <Box>
        <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
          Remote Streams: {remoteStreams.length}
        </Typography>
        {remoteStreams.map((rs) => (
          <Box key={rs.userId} sx={{ ml: 1, mb: 1 }}>
            <Typography variant="caption" sx={{ display: "block" }}>
              User {rs.userId}: {rs.stream.getAudioTracks().length} audio tracks
            </Typography>
            {rs.stream.getAudioTracks().map((track, idx) => (
              <Box key={track.id} sx={{ ml: 1 }}>
                <Chip
                  label={`${track.enabled ? "Enabled" : "Disabled"}`}
                  size="small"
                  color={track.enabled ? "success" : "error"}
                  sx={{ fontSize: 10, height: 20, mt: 0.5 }}
                />
                <Typography
                  variant="caption"
                  sx={{ display: "block", ml: 1, fontSize: 9 }}
                >
                  Volume: {remoteVolumes.get(rs.userId) || 0}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
