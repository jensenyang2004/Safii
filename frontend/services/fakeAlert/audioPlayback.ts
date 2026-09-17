import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioSource } from 'expo-audio';

let ringtonePlayer: AudioPlayer | null = null;
let hasConfiguredAudioMode = false;

const ensureAudioMode = async () => {
  if (hasConfiguredAudioMode) return;
  // Ringtone needs to be heard even if the phone's silent switch is on —
  // otherwise a "fake call" that never makes a sound doesn't sell the story.
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
    shouldPlayInBackground: false,
  });
  hasConfiguredAudioMode = true;
};

/**
 * Plays a looping ringtone for the full-screen fake call UI (stage 2).
 *
 * Ringtone asset lives at `frontend/assets/sounds/fake_call_ringtone_iphone_X.mp3`.
 * Stage 2 passes it as `source`, e.g.
 * `require('@/assets/sounds/fake_call_ringtone_iphone_X.mp3')`.
 */
export const playRingtone = async (source: AudioSource, volume: number = 1.0) => {
  await stopRingtone();
  await ensureAudioMode();
  const player = createAudioPlayer(source);
  player.loop = true;
  player.volume = volume;
  player.play();
  ringtonePlayer = player;
};

export const stopRingtone = async () => {
  if (!ringtonePlayer) return;
  const player = ringtonePlayer;
  ringtonePlayer = null;
  try {
    player.pause();
  } catch {
    // already stopped/removed — ignore
  }
  try {
    player.remove();
  } catch {
    // ignore
  }
};

export const isRingtonePlaying = (): boolean => ringtonePlayer !== null;
