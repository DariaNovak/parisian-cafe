/**
 * Tiny procedural audio engine (Web Audio API). Every sound is synthesised at
 * runtime, so the experience has ambience and feedback without any audio files.
 * Browsers keep audio suspended until the first user gesture; the context is
 * resumed on the first click, tap or key press.
 */
import { loadSample, preloadEffects, sample, type SampleId } from './samples'

type Sfx = 'tap' | 'clink' | 'grind' | 'pour' | 'steam' | 'success' | 'bell' | 'pop' | 'cash' | 'fail' | 'door' | 'deskBell' | 'ticket'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambience: { stop: () => void } | null = null
let sfxOn = true
let noiseBuffer: AudioBuffer | null = null

function context() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
    preloadEffects(ctx)
  }
  return ctx
}

interface SampleOptions {
  gain?: number
  /** Cut the sample short (with a fade) after this many seconds. */
  maxDuration?: number
  delay?: number
  /** Playback rate (pitch + speed). */
  rate?: number
  /** Start this many seconds into the file. */
  offset?: number
}

/** Plays a recorded sample if it has loaded. Returns false so callers can fall back to synthesis. */
function playSample(id: SampleId, { gain = 1, maxDuration, delay = 0, rate = 1, offset = 0 }: SampleOptions = {}) {
  const buf = sample(id)
  if (!buf) return false
  const ac = context()
  const src = ac.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const g = ac.createGain()
  const t = ac.currentTime + delay
  g.gain.setValueAtTime(gain, t)
  src.connect(g).connect(master!)
  src.start(t, offset)
  if (maxDuration && maxDuration < (buf.duration - offset) / rate) {
    g.gain.setValueAtTime(gain, t + maxDuration - 0.25)
    g.gain.linearRampToValueAtTime(0, t + maxDuration)
    src.stop(t + maxDuration + 0.02)
  }
  return true
}

/** Which recording stands in for each effect, and how it is trimmed to fit the animation. */
const SFX_SAMPLES: Partial<Record<Sfx, [SampleId, SampleOptions]>> = {
  deskBell: ['deskBell', { gain: 0.4 }],
  door: ['door', { gain: 0.55, maxDuration: 2.2 }],
  cash: ['cash', { gain: 0.75 }],
  grind: ['grind', { gain: 0.32, maxDuration: 1.7, offset: 3 }],
  pour: ['pour', { gain: 0.9, maxDuration: 2.4, offset: 0.4 }],
  steam: ['steam', { gain: 1.4, maxDuration: 2.8, offset: 9 }],
  clink: ['clink', { gain: 0.7 }],
}

// Wake the audio context on the first user gesture (required by browsers).
if (typeof window !== 'undefined') {
  const unlock = () => void ctx?.resume()
  window.addEventListener('pointerdown', unlock, { capture: true })
  window.addEventListener('keydown', unlock, { capture: true })
}

function noise(ac: AudioContext) {
  if (noiseBuffer) return noiseBuffer
  const len = ac.sampleRate * 2
  noiseBuffer = ac.createBuffer(1, len, ac.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  // Brown-ish noise: integrated white noise, softer than pure white.
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.04 * white) / 1.04
    data[i] = last * 3.2
  }
  return noiseBuffer
}

function noiseBurst(ac: AudioContext, opts: { duration: number; freq: number; q?: number; gain: number; type?: BiquadFilterType; attack?: number; sweepTo?: number }) {
  const src = ac.createBufferSource()
  src.buffer = noise(ac)
  src.loop = true
  const filter = ac.createBiquadFilter()
  filter.type = opts.type ?? 'bandpass'
  filter.frequency.value = opts.freq
  filter.Q.value = opts.q ?? 1
  const g = ac.createGain()
  const t = ac.currentTime
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.05))
  g.gain.setValueAtTime(opts.gain, t + opts.duration * 0.7)
  g.gain.linearRampToValueAtTime(0, t + opts.duration)
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.duration)
  src.connect(filter).connect(g).connect(master!)
  src.start(t, Math.random())
  src.stop(t + opts.duration + 0.05)
}

function tone(ac: AudioContext, freq: number, duration: number, gain: number, delay = 0, type: OscillatorType = 'sine') {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  const g = ac.createGain()
  const t = ac.currentTime + delay
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g).connect(master!)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

/** A struck metal bell: a few inharmonic partials with long, staggered decays. */
function strike(ac: AudioContext, freq: number, gain: number, delay = 0) {
  const partials: Array<[number, number, number]> = [[1, 1, 1.4], [2.32, 0.45, 0.9], [4.25, 0.22, 0.5], [6.1, 0.1, 0.3]]
  for (const [ratio, g, decay] of partials) tone(ac, freq * ratio, decay, gain * g, delay)
}

export function playSfx(name: Sfx) {
  if (!sfxOn) return
  const ac = context()
  const recorded = SFX_SAMPLES[name]
  if (recorded && playSample(recorded[0], recorded[1])) return
  switch (name) {
    case 'tap': return tone(ac, 880, 0.08, 0.05, 0, 'triangle')
    case 'pop': return tone(ac, 620, 0.12, 0.07, 0, 'sine')
    case 'clink': tone(ac, 2400, 0.35, 0.05); return tone(ac, 3170, 0.25, 0.03, 0.01)
    case 'bell': tone(ac, 1318, 0.9, 0.06); return tone(ac, 1976, 0.7, 0.03, 0.12)
    case 'cash': [2637, 3136, 2349, 3520].forEach((f, i) => tone(ac, f, 0.18, 0.035, i * 0.06, 'triangle')); return tone(ac, 1568, 0.6, 0.05, 0.28)
    case 'fail': tone(ac, 330, 0.25, 0.06, 0, 'triangle'); return tone(ac, 247, 0.4, 0.06, 0.18, 'triangle')
    case 'door': tone(ac, 1760, 0.5, 0.03); return tone(ac, 2217, 0.45, 0.025, 0.09)
    case 'deskBell': return strike(ac, 2093, 0.06)
    case 'ticket': {
      // Order taken: a quick note jotted on the pad, then a soft "noted" chime.
      const wrote = playSample('ticket', { gain: 2.4, maxDuration: 1.2 })
      if (playSample('orderChime', { gain: 0.2, delay: wrote ? 0.75 : 0, maxDuration: 1.6 })) return
      tone(ac, 1046, 0.6, 0.025, 0.75, 'sine')
      return tone(ac, 1318, 0.8, 0.02, 0.85, 'sine')
    }
    case 'success': [523, 659, 784, 1046].forEach((f, i) => tone(ac, f, 0.5, 0.06, i * 0.09, 'triangle')); return
    case 'grind': return noiseBurst(ac, { duration: 1.6, freq: 900, q: 0.8, gain: 0.35, type: 'bandpass' })
    case 'pour': return noiseBurst(ac, { duration: 2.4, freq: 520, q: 2.2, gain: 0.22, attack: 0.3 })
    case 'steam': return noiseBurst(ac, { duration: 2.6, freq: 4200, q: 0.6, gain: 0.18, type: 'highpass', attack: 0.15, sweepTo: 2600 })
  }
}

/**
 * Café murmur: a looped recording of a restaurant crowd when available,
 * otherwise a low filtered noise bed with occasional synthesised cup clinks.
 */
function startAmbience(ac: AudioContext) {
  const g = ac.createGain()
  g.gain.value = 0
  g.connect(master!)
  let src: AudioBufferSourceNode | null = null
  let timer = 0
  let stopped = false
  void loadSample(ac, 'ambience').then((buf) => {
    if (stopped) return
    src = ac.createBufferSource()
    src.loop = true
    if (buf) {
      src.buffer = buf
      src.connect(g)
      g.gain.linearRampToValueAtTime(0.26, ac.currentTime + 2.5)
      src.start(ac.currentTime, Math.random() * buf.duration)
    } else {
      src.buffer = noise(ac)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 420
      src.connect(lp).connect(g)
      g.gain.linearRampToValueAtTime(0.16, ac.currentTime + 2)
      src.start()
      timer = window.setInterval(() => {
        if (Math.random() < 0.45) tone(ac, 2200 + Math.random() * 1400, 0.3, 0.012 + Math.random() * 0.015)
      }, 1700)
    }
  })
  return {
    stop() {
      stopped = true
      window.clearInterval(timer)
      g.gain.cancelScheduledValues(ac.currentTime)
      g.gain.setValueAtTime(g.gain.value, ac.currentTime)
      g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6)
      src?.stop(ac.currentTime + 0.7)
    },
  }
}

/** A guest's "Thank you!" when they pay; `voice` (Hz) shifts it a little per guest. */
export function playThanks(voice: number, delay = 0) {
  if (!sfxOn) return
  // The recording is a woman's voice (~220 Hz); keep the shift subtle so it stays natural.
  const rate = Math.min(1.12, Math.max(0.86, Math.pow(voice / 220, 0.35)))
  playSample('thanks', { gain: 0.35, delay, rate })
}

export function setSfxEnabled(on: boolean) {
  sfxOn = on
}

export function setAmbienceEnabled(on: boolean) {
  if (on) {
    if (!ambience) ambience = startAmbience(context())
  } else {
    ambience?.stop()
    ambience = null
  }
}

/** Shared context + output bus for other audio modules (e.g. the music player). */
export function audioOutput() {
  const ac = context()
  void ac.resume()
  return { ac, master: master! }
}
