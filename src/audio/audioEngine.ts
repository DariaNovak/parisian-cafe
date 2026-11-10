/**
 * Tiny procedural audio engine (Web Audio API). Every sound is synthesised at
 * runtime, so the experience has ambience and feedback without any audio files.
 * Audio stays silent until the user enables it (browsers require a gesture).
 */
type Sfx = 'tap' | 'clink' | 'grind' | 'pour' | 'steam' | 'success' | 'bell' | 'pop'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambience: { stop: () => void } | null = null
let enabled = false
let noiseBuffer: AudioBuffer | null = null

function context() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
  }
  return ctx
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

export function playSfx(name: Sfx) {
  if (!enabled) return
  const ac = context()
  switch (name) {
    case 'tap': return tone(ac, 880, 0.08, 0.05, 0, 'triangle')
    case 'pop': return tone(ac, 620, 0.12, 0.07, 0, 'sine')
    case 'clink': tone(ac, 2400, 0.35, 0.05); return tone(ac, 3170, 0.25, 0.03, 0.01)
    case 'bell': tone(ac, 1318, 0.9, 0.06); return tone(ac, 1976, 0.7, 0.03, 0.12)
    case 'success': [523, 659, 784, 1046].forEach((f, i) => tone(ac, f, 0.5, 0.06, i * 0.09, 'triangle')); return
    case 'grind': return noiseBurst(ac, { duration: 1.6, freq: 900, q: 0.8, gain: 0.35, type: 'bandpass' })
    case 'pour': return noiseBurst(ac, { duration: 2.4, freq: 520, q: 2.2, gain: 0.22, attack: 0.3 })
    case 'steam': return noiseBurst(ac, { duration: 2.6, freq: 4200, q: 0.6, gain: 0.18, type: 'highpass', attack: 0.15, sweepTo: 2600 })
  }
}

/** Café murmur: low filtered noise bed plus occasional cup clinks. */
function startAmbience(ac: AudioContext) {
  const src = ac.createBufferSource()
  src.buffer = noise(ac)
  src.loop = true
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  const g = ac.createGain()
  g.gain.value = 0
  g.gain.linearRampToValueAtTime(0.16, ac.currentTime + 2)
  src.connect(lp).connect(g).connect(master!)
  src.start()
  const timer = window.setInterval(() => {
    if (Math.random() < 0.45) tone(ac, 2200 + Math.random() * 1400, 0.3, 0.012 + Math.random() * 0.015)
  }, 1700)
  return {
    stop() {
      window.clearInterval(timer)
      g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5)
      src.stop(ac.currentTime + 0.6)
    },
  }
}

export function setAudioEnabled(on: boolean) {
  enabled = on
  if (on) {
    const ac = context()
    void ac.resume()
    if (!ambience) ambience = startAmbience(ac)
  } else {
    ambience?.stop()
    ambience = null
  }
}
