/**
 * BGMManager — plays looping background music from audio files.
 *
 * Audio files live in /game/audio/bgm/*.ogg.
 *
 * Zone mapping:
 *   "mauville"  → mus_mauville.ogg   (Mauville City)
 *   "route"     → mus_route110.ogg   (Route 110 / 111 / 117)
 *   "route118"  → mus_route111.ogg   (Route 118 — reuses 111)
 *   "intro"     → mus_intro.ogg      (Title / intro)
 *
 * Usage:
 *   import { bgm } from "./BGMManager";
 *   bgm.play("mauville");
 *   bgm.pause();
 *   bgm.resume();
 *   bgm.stop();
 */

const BGM_PATH = "/game/audio/bgm";

const TRACK_MAP: Record<string, string> = {
  mauville: "mus_mauville.ogg",
  route: "mus_route110.ogg",
  route118: "mus_route111.ogg",
  intro: "mus_intro.ogg",
};

let currentAudio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let volume = 0.3;

function play(trackName: string): void {
  if (currentTrack === trackName && currentAudio && !currentAudio.paused) return;

  const file = TRACK_MAP[trackName];
  if (!file) return;

  // Stop previous track
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = new Audio(`${BGM_PATH}/${file}`);
  currentAudio.loop = true;
  currentAudio.volume = volume;
  currentTrack = trackName;
  currentAudio.play().catch(() => {}); // swallow autoplay-policy errors
}

function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentTrack = null;
}

function pause(): void {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
  }
}

function resume(): void {
  if (currentAudio && currentAudio.paused && currentTrack) {
    currentAudio.play().catch(() => {});
  }
}

function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (currentAudio) {
    currentAudio.volume = volume;
  }
}

export const bgm = {
  play,
  stop,
  pause,
  resume,
  setVolume,
  get isPlaying() { return currentAudio ? !currentAudio.paused : false; },
  get currentTrack() { return currentTrack; },
};
