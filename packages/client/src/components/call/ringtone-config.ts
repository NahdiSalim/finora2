export const RINGTONE_CONFIG = {
  // Set to true to use a custom audio file, false to use generated ringtone
  USE_AUDIO_FILE: false,

  // Path to your custom audio file (place in public/sounds/)
  AUDIO_FILE_PATH: "/sounds/ringtone.mp3",

  // Generated ringtone settings (used when USE_AUDIO_FILE is false)
  GENERATED: {
    // Musical notes (frequencies in Hz) - iPhone-style pattern
    notes: [659.25, 554.37, 369.99, 415.3], // E5, C#5, F#4, G#4

    // How many times to repeat the pattern
    repetitions: 3,

    // Volume (0.0 to 1.0)
    volume: 0.5,

    // Duration of each note in seconds
    noteDuration: 0.3,

    // Pause between notes in seconds
    notePause: 0.15,
  },
};
