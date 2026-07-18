"use client";

import { Howl } from "howler";

type SoundName = "dice" | "purchase" | "rent" | "win" | "jail" | "start" | "build";

/** Lightweight synthesized data-URI beeps so the game works without binary assets */
const TONES: Record<SoundName, string> = {
  dice: makeTone(440, 0.08),
  purchase: makeTone(660, 0.12),
  rent: makeTone(330, 0.1),
  win: makeTone(880, 0.25),
  jail: makeTone(220, 0.18),
  start: makeTone(523, 0.15),
  build: makeTone(587, 0.1),
};

const cache = new Map<SoundName, Howl>();

function makeTone(freq: number, duration: number): string {
  // Minimal WAV generator (mono 8-bit)
  const sampleRate = 8000;
  const samples = Math.floor(sampleRate * duration);
  const data = new Uint8Array(44 + samples);
  const view = new DataView(data.buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeStr(36, "data");
  view.setUint32(40, samples, true);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, (samples - i) / (sampleRate * 0.04));
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
    data[44 + i] = Math.floor((sample + 1) * 127.5);
  }

  let binary = "";
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function playSound(name: SoundName) {
  if (typeof window === "undefined") return;
  let howl = cache.get(name);
  if (!howl) {
    howl = new Howl({ src: [TONES[name]], volume: 0.35 });
    cache.set(name, howl);
  }
  howl.play();
}
