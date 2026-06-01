#!/usr/bin/env node
/**
 * Génère les WAV d’appel style WhatsApp (2 notes entrantes + ringback dual-tone).
 * Usage: node scripts/generate-call-sounds.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.resolve(__dirname, '../assets/sounds');

function fadeEnvelope(i, n, attackSec, releaseSec) {
  const attack = Math.floor(SAMPLE_RATE * attackSec);
  const release = Math.floor(SAMPLE_RATE * releaseSec);
  let env = 1;
  if (i < attack) env = i / Math.max(1, attack);
  if (i > n - release) env = Math.max(0, (n - i) / Math.max(1, release));
  return env;
}

/** Sinusoïde + harmoniques légères (effet cloche / marimba). */
function synthTone(freq, durationSec, volume, opts = {}) {
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  const attack = opts.attackSec ?? 0.008;
  const release = opts.releaseSec ?? 0.06;
  const h2 = opts.h2 ?? 0.22;
  const h3 = opts.h3 ?? 0.08;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = fadeEnvelope(i, n, attack, release);
    const s =
      Math.sin(2 * Math.PI * freq * t) +
      h2 * Math.sin(2 * Math.PI * freq * 2 * t) +
      h3 * Math.sin(2 * Math.PI * freq * 3 * t);
    out[i] = s * volume * env;
  }
  return out;
}

function silence(durationSec) {
  return new Float32Array(Math.floor(durationSec * SAMPLE_RATE));
}

function concat(chunks) {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function normalize(samples, peak = 0.92) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  if (max < 1e-6) return samples;
  const gain = peak / max;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;
  return out;
}

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

/**
 * Entrant WhatsApp : deux notes montantes-descendantes « ti — ti » (~1,95 s).
 * Calqué sur le motif double chime (B5 → F#5) entendu sur WhatsApp / Instagram.
 */
function buildIncomingWhatsApp() {
  return normalize(
    concat([
      synthTone(987.77, 0.34, 0.42, { releaseSec: 0.12 }), // B5
      silence(0.1),
      synthTone(739.99, 0.52, 0.48, { releaseSec: 0.22 }), // F#5, plus long
      silence(0.08),
      synthTone(987.77, 0.34, 0.38, { releaseSec: 0.18 }), // répétition légère fin de rafale
      silence(0.09),
      synthTone(739.99, 0.48, 0.4, { releaseSec: 0.2 }),
    ]),
  );
}

/**
 * Ringback appelant : dual-tone télécom 425 + 475 Hz (~1,15 s).
 * Son distinct de l’entrant — ce que l’appelant entend en attendant.
 */
function buildOutgoingRingback() {
  const durationSec = 1.15;
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  const f1 = 425;
  const f2 = 475;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = fadeEnvelope(i, n, 0.015, 0.08);
    const s = Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t);
    out[i] = s * 0.28 * env;
  }
  return normalize(out, 0.88);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const incomingPath = path.join(OUT_DIR, 'incoming_call.wav');
  const outgoingPath = path.join(OUT_DIR, 'outgoing_ringback.wav');

  writeWav(incomingPath, buildIncomingWhatsApp());
  writeWav(outgoingPath, buildOutgoingRingback());

  console.log('[generate-call-sounds] OK');
  console.log('  incoming:', incomingPath, '(double chime ~2 s)');
  console.log('  outgoing:', outgoingPath, '(dual-tone ringback ~1,15 s)');
}

main();
