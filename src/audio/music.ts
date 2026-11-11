/**
 * Background music. Plays the recorded track `public/sounds/music.mp3`
 * ("Parisian" by Kevin MacLeod, CC BY 4.0) on a loop. If the file can't be
 * loaded, falls back to "Valse de la rue des Roses", a small original musette waltz synthesised
 * live with the Web Audio API (no audio files). The tune is a 3/4 bal-musette:
 * an accordion melody with a slightly detuned double reed, an oom-pah-pah left
 * hand (bass on beat one, short chords on two and three), and a soft room reverb.
 */
import { audioOutput } from './audioEngine'
import { loadSample } from './samples'

const BPM = 126
const BEAT = 60 / BPM

type Chord = 'Am' | 'Dm' | 'G7' | 'C' | 'E7' | 'F'

/** Left hand: alternating bass notes and the chord voicing (MIDI numbers). */
const CHORDS: Record<Chord, { bass: [number, number]; notes: number[] }> = {
  Am: { bass: [45, 52], notes: [57, 60, 64] },
  Dm: { bass: [50, 45], notes: [57, 62, 65] },
  G7: { bass: [43, 50], notes: [59, 62, 65] },
  C: { bass: [48, 43], notes: [55, 60, 64] },
  E7: { bass: [40, 47], notes: [56, 62, 64] },
  F: { bass: [41, 48], notes: [57, 60, 65] },
}

/** One bar: its chord and the melody as [midi, beats] (0 = rest). Three beats per bar. */
type Bar = [Chord, Array<[number, number]>]

const A: Bar[] = [
  ['Am', [[64, 1], [69, 1], [67, 0.5], [65, 0.5]]],
  ['Am', [[64, 2], [60, 1]]],
  ['Dm', [[62, 1], [65, 1], [69, 0.5], [67, 0.5]]],
  ['Dm', [[65, 2], [62, 1]]],
  ['G7', [[59, 1], [62, 1], [65, 1]]],
  ['G7', [[67, 1.5], [65, 0.5], [62, 1]]],
  ['C', [[64, 1], [60, 1], [67, 1]]],
  ['E7', [[68, 1.5], [64, 0.5], [59, 1]]],
  ['Am', [[64, 1], [69, 1], [71, 0.5], [72, 0.5]]],
  ['Am', [[69, 2], [64, 1]]],
  ['Dm', [[65, 1], [69, 1], [74, 1]]],
  ['Dm', [[72, 1], [69, 1], [65, 1]]],
  ['E7', [[64, 1], [68, 1], [71, 1]]],
  ['E7', [[74, 1.5], [71, 0.5], [68, 1]]],
  ['Am', [[69, 1], [64, 1], [60, 1]]],
  ['Am', [[57, 2], [0, 1]]],
]

const B: Bar[] = [
  ['C', [[67, 1], [72, 1], [71, 0.5], [69, 0.5]]],
  ['C', [[67, 2], [64, 1]]],
  ['F', [[65, 1], [69, 1], [72, 1]]],
  ['F', [[69, 2], [65, 1]]],
  ['G7', [[62, 1], [65, 1], [71, 1]]],
  ['G7', [[69, 1], [67, 1], [65, 1]]],
  ['C', [[64, 1.5], [67, 0.5], [72, 1]]],
  ['E7', [[71, 1], [68, 1], [64, 1]]],
]

const SONG: Bar[] = [...A, ...B]

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

interface Player {
  stop: () => void
}

let player: Player | null = null
let volume = 0.7
let bus: GainNode | null = null
const LEVEL = 0.28
/** The recording is mastered much louder than the synth voices. */
const FILE_LEVEL = 2.2

function impulse(ac: AudioContext, seconds = 2.2) {
  const len = Math.floor(ac.sampleRate * seconds)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  return buf
}

function start(): Player {
  const { ac, master } = audioOutput()

  // Output chain: music bus → gentle top-end roll-off → dry + reverb → master.
  const out = ac.createGain()
  bus = out
  out.gain.value = 0
  out.gain.linearRampToValueAtTime(LEVEL * volume, ac.currentTime + 2.5)
  const tone = ac.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 5200
  const reverb = ac.createConvolver()
  reverb.buffer = impulse(ac)
  const wet = ac.createGain()
  wet.gain.value = 0.28
  // The recording goes straight out; the synth fallback gets the tone filter and reverb.
  tone.connect(master)
  tone.connect(reverb).connect(wet).connect(master)

  /** Accordion reed: two saws a few cents apart (the musette "wobble") plus a soft square an octave down. */
  function accordion(midi: number, t: number, dur: number, vel: number, bright = 1900) {
    const f = hz(midi)
    const env = ac.createGain()
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = bright
    lp.Q.value = 0.6
    const peak = 0.11 * vel
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(peak, t + 0.035)
    env.gain.linearRampToValueAtTime(peak * 0.78, t + 0.18)
    env.gain.setValueAtTime(peak * 0.78, t + Math.max(0.19, dur - 0.06))
    env.gain.linearRampToValueAtTime(0, t + dur + 0.1)
    const voices: Array<[OscillatorType, number, number]> = [
      ['sawtooth', f * Math.pow(2, -7 / 1200), 0.5],
      ['sawtooth', f * Math.pow(2, 8 / 1200), 0.5],
      ['square', f / 2, 0.18],
    ]
    for (const [type, freq, g] of voices) {
      const o = ac.createOscillator()
      o.type = type
      o.frequency.value = freq
      const vg = ac.createGain()
      vg.gain.value = g
      o.connect(vg).connect(lp)
      o.start(t)
      o.stop(t + dur + 0.15)
    }
    lp.connect(env).connect(out)
  }

  /** Plucked bass (left-hand bass button). */
  function bass(midi: number, t: number) {
    const o = ac.createOscillator()
    o.type = 'triangle'
    o.frequency.value = hz(midi)
    const g = ac.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.32, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.95)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + BEAT)
  }

  let bar = 0
  let next = 0

  function scheduleBar(t0: number) {
    const [chord, melody] = SONG[bar % SONG.length]
    const c = CHORDS[chord]
    // A touch of human timing so it doesn't sound like a music box.
    const j = () => (Math.random() - 0.5) * 0.012
    bass(c.bass[bar % 2], t0 + j())
    for (const beat of [1, 2]) for (const n of c.notes) accordion(n, t0 + beat * BEAT + j(), BEAT * 0.42, 0.42, 1300)
    let at = 0
    melody.forEach(([midi, beats], i) => {
      // Lean on the first note of each bar, lighter on the rest.
      if (midi) accordion(midi, t0 + at * BEAT + j(), beats * BEAT * 0.94, i === 0 ? 1 : 0.85)
      at += beats
    })
    bar++
  }

  let timer = 0
  let track: AudioBufferSourceNode | null = null
  let stopped = false
  void loadSample(ac, 'music').then((buf) => {
    if (stopped) return
    if (buf) {
      track = ac.createBufferSource()
      track.buffer = buf
      track.loop = true
      const level = ac.createGain()
      level.gain.value = FILE_LEVEL
      track.connect(level).connect(out)
      out.connect(master)
      track.start()
      return
    }
    // No recording: play the synthesised waltz with a look-ahead scheduler.
    out.connect(tone)
    next = ac.currentTime + 0.15
    timer = window.setInterval(() => {
      while (next < ac.currentTime + 0.5) {
        scheduleBar(next)
        next += BEAT * 3
      }
    }, 60)
  })

  return {
    stop() {
      stopped = true
      window.clearInterval(timer)
      track?.stop(ac.currentTime + 1.3)
      const t = ac.currentTime
      if (bus === out) bus = null
      out.gain.cancelScheduledValues(t)
      out.gain.setValueAtTime(out.gain.value, t)
      out.gain.linearRampToValueAtTime(0, t + 1.2)
      window.setTimeout(() => {
        out.disconnect()
        tone.disconnect()
        wet.disconnect()
      }, 4000)
    },
  }
}

/** 0..1 */
export function setMusicVolume(v: number) {
  volume = v
  if (bus) {
    const t = bus.context.currentTime
    bus.gain.cancelScheduledValues(t)
    bus.gain.setTargetAtTime(LEVEL * v, t, 0.08)
  }
}

export function setMusicEnabled(on: boolean) {
  if (on && !player) player = start()
  else if (!on && player) {
    player.stop()
    player = null
  }
}
