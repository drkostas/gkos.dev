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
  route118: "mus_route110.ogg",
  intro: "mus_intro.ogg",
  pokecenter: "mus_pokecenter.ogg",
  mart: "mus_mart.ogg",
  gym: "mus_gym.ogg",
  birch: "mus_birch.ogg",
};

let currentAudio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let volume = 0.3;

/** Pre-loaded Audio elements keyed by track name. */
const preloaded: Map<string, HTMLAudioElement> = new Map();

// ── Synthesized BGM tracks (Web Audio API) ───────────────────
// Interior tracks that don't have .ogg files are synthesized
// using square-wave melody + triangle-wave bass, scheduled via
// a lookahead buffer just like a real sequencer.

type Note = [number, number]; // [frequency in Hz, duration in beats]

interface SynthTrack {
  name: string;
  bpm: number;
  melody: Note[];
  bass: Note[];
  melodyGain: number;
  bassGain: number;
}

const SYNTH_TRACKS: Record<string, SynthTrack> = {
  pokecenter: {
    name: "pokecenter",
    bpm: 100,
    melodyGain: 0.25,
    bassGain: 0.18,
    melody: [
      // Gentle ascending/descending C major — 8 bars (32 beats at 4/4)
      [523.25, 1], [659.25, 1], [783.99, 1], [880.00, 1],   // C5 E5 G5 A5
      [783.99, 1], [659.25, 1], [523.25, 2],                 // G5 E5 C5(held)
      [587.33, 1], [659.25, 1], [783.99, 1], [880.00, 1],   // D5 E5 G5 A5
      [783.99, 2], [659.25, 2],                               // G5(held) E5(held)
      [523.25, 1], [659.25, 1], [880.00, 1], [783.99, 1],   // C5 E5 A5 G5
      [659.25, 1], [587.33, 1], [523.25, 2],                 // E5 D5 C5(held)
      [587.33, 1], [523.25, 1], [493.88, 1], [523.25, 1],   // D5 C5 B4 C5
      [659.25, 2], [523.25, 2],                               // E5(held) C5(held)
    ],
    bass: [
      // Simple root notes — whole notes (4 beats each), 8 bars
      [130.81, 4], // C3
      [196.00, 4], // G3
      [220.00, 4], // A3
      [174.61, 4], // F3
      [130.81, 4], // C3
      [196.00, 4], // G3
      [174.61, 4], // F3
      [130.81, 4], // C3
    ],
  },

  mart: {
    name: "mart",
    bpm: 130,
    melodyGain: 0.30,
    bassGain: 0.20,
    melody: [
      // Bouncy G major — 8 bars (32 beats at 4/4)
      [783.99, 0.5], [783.99, 0.5], [987.77, 1], [880.00, 1], [783.99, 1],  // G5 G5 B5 A5 G5
      [987.77, 0.5], [987.77, 0.5], [1174.66, 1], [880.00, 1],              // B5 B5 D6 A5
      [783.99, 1], [880.00, 0.5], [987.77, 0.5], [1174.66, 1], [987.77, 1], // G5 A5 B5 D6 B5
      [880.00, 1], [783.99, 1],                                               // A5 G5
      [1174.66, 0.5], [987.77, 0.5], [880.00, 1], [783.99, 1], [880.00, 1], // D6 B5 A5 G5 A5
      [987.77, 0.5], [880.00, 0.5], [783.99, 1], [659.25, 1],               // B5 A5 G5 E5
      [739.99, 1], [783.99, 0.5], [880.00, 0.5], [987.77, 1], [880.00, 1],  // F#5 G5 A5 B5 A5
      [783.99, 1], [0, 1],                                                    // G5 rest
      [783.99, 0.5], [880.00, 0.5], [987.77, 1], [1174.66, 1], [987.77, 1], // G5 A5 B5 D6 B5
      [880.00, 0.5], [783.99, 0.5], [659.25, 1], [783.99, 1],               // A5 G5 E5 G5
    ],
    bass: [
      // Walking bass G major — 8 bars
      [196.00, 2], [246.94, 2], // G3 B3
      [293.66, 2], [220.00, 2], // D3 A3
      [196.00, 2], [246.94, 2], // G3 B3
      [220.00, 2], [293.66, 2], // A3 D3
      [196.00, 2], [246.94, 2], // G3 B3
      [293.66, 2], [220.00, 2], // D3 A3
      [174.61, 2], [196.00, 2], // F#3 G3
      [220.00, 2], [196.00, 2], // A3 G3
    ],
  },

  gym: {
    name: "gym",
    bpm: 155,
    melodyGain: 0.35,
    bassGain: 0.25,
    melody: [
      // Intense E minor with chromatic tension — 8 bars (32 beats at 4/4)
      [659.25, 0.5], [0, 0.5], [659.25, 0.5], [0, 0.5], [783.99, 0.5], [0, 0.5], [987.77, 1],  // E5 . E5 . G5 . B5
      [880.00, 0.5], [0, 0.5], [783.99, 0.5], [0, 0.5], [659.25, 1],                             // A5 . G5 . E5
      [1174.66, 0.5], [0, 0.5], [987.77, 0.5], [0, 0.5], [880.00, 0.5], [830.61, 0.5], [783.99, 1], // D6 . B5 . A5 Ab5 G5
      [739.99, 0.5], [0, 0.5], [783.99, 0.5], [0, 0.5], [659.25, 1],                             // F#5 . G5 . E5
      [659.25, 0.5], [783.99, 0.5], [987.77, 0.5], [1174.66, 0.5], [987.77, 0.5], [0, 0.5], [880.00, 1], // E5 G5 B5 D6 B5 . A5
      [783.99, 0.5], [0, 0.5], [698.46, 0.5], [659.25, 0.5], [622.25, 0.5], [659.25, 0.5], [783.99, 1], // G5 . F5 E5 Eb5 E5 G5
      [987.77, 0.5], [0, 0.5], [880.00, 0.5], [0, 0.5], [783.99, 0.5], [659.25, 0.5], [587.33, 1], // B5 . A5 . G5 E5 D5
      [659.25, 1], [0, 1],                                                                         // E5 rest
    ],
    bass: [
      // Driving eighth-note bass — E minor
      [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], // E3 E3 E3 E3
      [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], // B2 B2 B2 B2
      [130.81, 0.5], [130.81, 0.5], [130.81, 0.5], [130.81, 0.5], // C3 C3 C3 C3
      [146.83, 0.5], [146.83, 0.5], [146.83, 0.5], [146.83, 0.5], // D3 D3 D3 D3
      [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], // E3 E3 E3 E3
      [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], // B2 B2 B2 B2
      [130.81, 0.5], [130.81, 0.5], [146.83, 0.5], [146.83, 0.5], // C3 C3 D3 D3
      [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], // E3 E3 E3 E3
      [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], // E3 E3 E3 E3
      [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], // B2 B2 B2 B2
      [130.81, 0.5], [130.81, 0.5], [130.81, 0.5], [130.81, 0.5], // C3 C3 C3 C3
      [146.83, 0.5], [146.83, 0.5], [146.83, 0.5], [146.83, 0.5], // D3 D3 D3 D3
      [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], // E3 E3 E3 E3
      [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], [123.47, 0.5], // B2 B2 B2 B2
      [130.81, 0.5], [130.81, 0.5], [146.83, 0.5], [146.83, 0.5], // C3 C3 D3 D3
      [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], [164.81, 0.5], // E3 E3 E3 E3
    ],
  },
};

/** State for an active synthesized track. */
interface SynthState {
  ctx: AudioContext;
  melodyGain: GainNode;
  bassGain: GainNode;
  melodyOscs: OscillatorNode[];
  bassOscs: OscillatorNode[];
  timerId: ReturnType<typeof setInterval> | null;
  stopped: boolean;
}

let synthState: SynthState | null = null;

/**
 * Schedule one full loop of a synth track starting at `startTime`,
 * returning the end-time so the caller knows when to schedule the next loop.
 */
function scheduleSynthLoop(
  ctx: AudioContext,
  track: SynthTrack,
  melodyGain: GainNode,
  bassGain: GainNode,
  startTime: number,
): { endTime: number; melodyOscs: OscillatorNode[]; bassOscs: OscillatorNode[] } {
  const BEAT = 60 / track.bpm;
  const melodyOscs: OscillatorNode[] = [];
  const bassOscs: OscillatorNode[] = [];

  // Schedule melody
  let t = startTime;
  for (const [freq, beats] of track.melody) {
    const dur = beats * BEAT;
    if (freq > 0) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.005);
      env.gain.setValueAtTime(1, t + dur - 0.01);
      env.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(env);
      env.connect(melodyGain);
      osc.start(t);
      osc.stop(t + dur);
      melodyOscs.push(osc);
    }
    t += dur;
  }
  const melodyEnd = t;

  // Schedule bass
  t = startTime;
  for (const [freq, beats] of track.bass) {
    const dur = beats * BEAT;
    if (freq > 0) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.005);
      env.gain.setValueAtTime(1, t + dur - 0.01);
      env.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(env);
      env.connect(bassGain);
      osc.start(t);
      osc.stop(t + dur);
      bassOscs.push(osc);
    }
    t += dur;
  }
  const bassEnd = t;

  return { endTime: Math.max(melodyEnd, bassEnd), melodyOscs, bassOscs };
}

function playSynth(trackName: string): void {
  const track = SYNTH_TRACKS[trackName];
  if (!track) return;

  stopSynth();

  const ctx = new AudioContext();

  const melodyGain = ctx.createGain();
  melodyGain.gain.setValueAtTime(track.melodyGain * volume, ctx.currentTime);
  melodyGain.connect(ctx.destination);

  const bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(track.bassGain * volume, ctx.currentTime);
  bassGain.connect(ctx.destination);

  const state: SynthState = {
    ctx,
    melodyGain,
    bassGain,
    melodyOscs: [],
    bassOscs: [],
    timerId: null,
    stopped: false,
  };
  synthState = state;

  // Schedule first loop
  let { endTime, melodyOscs, bassOscs } = scheduleSynthLoop(
    ctx, track, melodyGain, bassGain, ctx.currentTime,
  );
  state.melodyOscs.push(...melodyOscs);
  state.bassOscs.push(...bassOscs);

  // Lookahead: schedule the next loop before the current one ends
  const LOOKAHEAD = 0.5; // seconds before end to schedule next loop
  const CHECK_INTERVAL = 200; // ms

  state.timerId = setInterval(() => {
    if (state.stopped) return;
    if (ctx.currentTime >= endTime - LOOKAHEAD) {
      const result = scheduleSynthLoop(ctx, track, melodyGain, bassGain, endTime);
      endTime = result.endTime;
      state.melodyOscs.push(...result.melodyOscs);
      state.bassOscs.push(...result.bassOscs);
    }
  }, CHECK_INTERVAL);
}

function stopSynth(): void {
  if (!synthState) return;
  synthState.stopped = true;
  if (synthState.timerId !== null) {
    clearInterval(synthState.timerId);
  }
  // Stop all oscillators gracefully
  const now = synthState.ctx.currentTime;
  for (const osc of [...synthState.melodyOscs, ...synthState.bassOscs]) {
    try { osc.stop(now); } catch { /* already stopped */ }
  }
  synthState.ctx.close().catch(() => {});
  synthState = null;
}

/**
 * Preload all BGM tracks. Returns a promise that resolves when every
 * track has enough data to start playing without delay.
 */
function preloadAll(): Promise<void> {
  const promises = Object.entries(TRACK_MAP).map(([name, file]) => {
    return new Promise<void>((resolve) => {
      const audio = new Audio(`${BGM_PATH}/${file}`);
      audio.loop = true;
      audio.volume = volume;
      audio.preload = "auto";
      audio.addEventListener("canplaythrough", () => resolve(), { once: true });
      audio.addEventListener("error", () => resolve(), { once: true }); // don't block on error
      audio.load();
      preloaded.set(name, audio);
    });
  });
  return Promise.all(promises).then(() => {});
}

function play(trackName: string): void {
  if (currentTrack === trackName) {
    // Already playing this track
    if (SYNTH_TRACKS[trackName] && synthState && !synthState.stopped) return;
    if (currentAudio && !currentAudio.paused) return;
  }

  // Stop any previous playback (both file-based and synth)
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  stopSynth();

  // Prefer audio files over synthesized tracks
  const file = TRACK_MAP[trackName];
  if (!file && SYNTH_TRACKS[trackName]) {
    // No audio file — fall back to synthesizer
    currentTrack = trackName;
    playSynth(trackName);
    return;
  }

  if (!file) return;

  // Use preloaded audio if available, otherwise create new
  const cached = preloaded.get(trackName);
  if (cached) {
    currentAudio = cached;
    currentAudio.currentTime = 0;
    currentAudio.volume = volume;
  } else {
    currentAudio = new Audio(`${BGM_PATH}/${file}`);
    currentAudio.loop = true;
    currentAudio.volume = volume;
  }

  currentTrack = trackName;
  currentAudio.play().catch(() => {}); // swallow autoplay-policy errors
}

function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  stopSynth();
  currentTrack = null;
}

function pause(): void {
  if (synthState && !synthState.stopped) {
    synthState.ctx.suspend().catch(() => {});
    return;
  }
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
  }
}

function resume(): void {
  if (synthState && !synthState.stopped) {
    synthState.ctx.resume().catch(() => {});
    return;
  }
  if (currentAudio && currentAudio.paused && currentTrack) {
    currentAudio.play().catch(() => {});
  }
}

function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (currentAudio) {
    currentAudio.volume = volume;
  }
  // Update synth gain nodes if active
  if (synthState && !synthState.stopped && currentTrack) {
    const track = SYNTH_TRACKS[currentTrack];
    if (track) {
      synthState.melodyGain.gain.setValueAtTime(track.melodyGain * volume, synthState.ctx.currentTime);
      synthState.bassGain.gain.setValueAtTime(track.bassGain * volume, synthState.ctx.currentTime);
    }
  }
}

export const bgm = {
  preloadAll,
  play,
  stop,
  pause,
  resume,
  setVolume,
  get isPlaying() {
    if (synthState && !synthState.stopped) return true;
    return currentAudio ? !currentAudio.paused : false;
  },
  get currentTrack() { return currentTrack; },
};
