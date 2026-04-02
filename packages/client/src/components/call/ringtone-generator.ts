import { RINGTONE_CONFIG } from "./ringtone-config";

export function generateRingtoneDataUrl(): string {
  const { notes, repetitions, volume, noteDuration, notePause } =
    RINGTONE_CONFIG.GENERATED;

  const sampleRate = 44100;
  const noteSamples = Math.floor(noteDuration * sampleRate);
  const pauseSamples = Math.floor(notePause * sampleRate);
  const patternSamples = notes.length * (noteSamples + pauseSamples);
  const totalSamples = patternSamples * repetitions;

  const wavData = new Int16Array(totalSamples);

  let offset = 0;
  for (let rep = 0; rep < repetitions; rep++) {
    for (const frequency of notes) {
      // Generate note with smooth fade in/out
      for (let i = 0; i < noteSamples; i++) {
        const t = i / sampleRate;
        const fadeIn = Math.min(1, i / (sampleRate * 0.01));
        const fadeOut = Math.min(1, (noteSamples - i) / (sampleRate * 0.01));
        const envelope = fadeIn * fadeOut;
        const sample =
          Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
        wavData[offset + i] = Math.floor(sample * 32767);
      }
      offset += noteSamples;

      // Add pause (silence)
      for (let i = 0; i < pauseSamples; i++) {
        wavData[offset + i] = 0;
      }
      offset += pauseSamples;
    }
  }

  // Create WAV file format
  const wavBuffer = new ArrayBuffer(44 + wavData.length * 2);
  const view = new DataView(wavBuffer);

  // WAV header
  const writeString = (position: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(position + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + wavData.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, wavData.length * 2, true);

  for (let i = 0; i < wavData.length; i++) {
    view.setInt16(44 + i * 2, wavData[i], true);
  }

  // Convert to base64
  const bytes = new Uint8Array(wavBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return `data:audio/wav;base64,${base64}`;
}
