/**
 * Ambient focus sounds, synthesized with the Web Audio API: no audio files, a few KB of code.
 *
 * Everything is built from short looping noise buffers run through filters, so it costs almost nothing
 * to play. Browsers only start audio after a user gesture, so playback always begins from a click.
 */

export type AmbientKind = 'rain' | 'cafe' | 'white'

export const AMBIENT_KINDS: { kind: AmbientKind; label: string }[] = [
  { kind: 'rain', label: 'Rain' },
  { kind: 'cafe', label: 'Cafe' },
  { kind: 'white', label: 'White noise' },
]

type NoiseColor = 'white' | 'pink' | 'brown'

const NOISE_SECONDS = 4
const FADE = 0.4

function makeNoise(ctx: AudioContext, color: NoiseColor, seconds = NOISE_SECONDS): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'white') data[i] = white * 0.5
    else if (color === 'pink') {
      // Paul Kellet's economy pink-noise filter
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    } else {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  }
  // Short crossfade at the seam so the loop never clicks.
  const n = Math.min(2048, data.length >> 2)
  for (let i = 0; i < n; i++) {
    const t = i / n
    data[i] = data[i] * t + data[data.length - n + i] * (1 - t)
  }
  return buffer
}

interface Voice {
  /** Where the voice's sound arrives; the player fades this node. */
  out: GainNode
  stop: () => void
}

export class AmbientPlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voice: Voice | null = null
  private volume = 0.4
  private current: AmbientKind | null = null
  private buffers: Partial<Record<NoiseColor, AudioBuffer>> = {}

  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

  get kind() {
    return this.current
  }

  /** 0 to 1. Applies smoothly to whatever is playing. */
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05)
  }

  play(kind: AmbientKind) {
    if (this.current === kind) return
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    void ctx.resume?.()
    this.fadeOutVoice()
    this.voice = this.build(kind, ctx)
    this.voice.out.connect(this.master)
    this.voice.out.gain.setValueAtTime(0, ctx.currentTime)
    this.voice.out.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE)
    this.current = kind
  }

  stop() {
    this.fadeOutVoice()
    this.current = null
  }

  /** Releases the audio hardware. The player can be used again afterwards. */
  dispose() {
    this.stop()
    const ctx = this.ctx
    this.ctx = null
    this.master = null
    this.buffers = {}
    window.setTimeout(() => void ctx?.close?.(), FADE * 1000 + 100)
  }

  private ensureContext() {
    if (!this.ctx) {
      try {
        this.ctx = this.createContext()
      } catch {
        return null // no Web Audio here
      }
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  private fadeOutVoice() {
    const v = this.voice
    this.voice = null
    if (!v || !this.ctx) return
    const now = this.ctx.currentTime
    v.out.gain.cancelScheduledValues(now)
    v.out.gain.setValueAtTime(v.out.gain.value, now)
    v.out.gain.linearRampToValueAtTime(0, now + FADE)
    window.setTimeout(() => v.stop(), FADE * 1000 + 50)
  }

  private noise(ctx: AudioContext, color: NoiseColor) {
    const src = ctx.createBufferSource()
    src.buffer = this.buffers[color] ??= makeNoise(ctx, color)
    src.loop = true
    return src
  }

  private build(kind: AmbientKind, ctx: AudioContext): Voice {
    const out = ctx.createGain()
    const sources: AudioScheduledSourceNode[] = []
    const timers: number[] = []
    const nodes: AudioNode[] = [out]
    const keep = <T extends AudioNode>(n: T) => (nodes.push(n), n)

    const filter = (type: BiquadFilterType, freq: number, q = 0.7) => {
      const f = keep(ctx.createBiquadFilter())
      f.type = type
      f.frequency.value = freq
      f.Q.value = q
      return f
    }
    const gain = (v: number) => {
      const g = keep(ctx.createGain())
      g.gain.value = v
      return g
    }
    const loop = (color: NoiseColor) => {
      const s = this.noise(ctx, color)
      sources.push(s)
      return s
    }
    /** Calls `fn` at random intervals until stopped. */
    const every = (minMs: number, maxMs: number, fn: () => void) => {
      const tick = () => {
        fn()
        timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)))
      }
      timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)))
    }

    if (kind === 'white') {
      loop('white').connect(gain(0.45)).connect(out)
    } else if (kind === 'rain') {
      // steady wash + distant rumble + individual drops
      loop('pink').connect(filter('highpass', 450)).connect(filter('lowpass', 8500)).connect(gain(0.55)).connect(out)
      loop('brown').connect(filter('lowpass', 380)).connect(gain(0.28)).connect(out)
      every(25, 90, () => {
        const drop = ctx.createBufferSource()
        drop.buffer = this.buffers.white ??= makeNoise(ctx, 'white')
        const bp = filter('bandpass', 1800 + Math.random() * 3800, 2.5)
        const env = gain(0)
        const t = ctx.currentTime
        env.gain.setValueAtTime(0, t)
        env.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.14, t + 0.004)
        env.gain.exponentialRampToValueAtTime(0.0008, t + 0.05)
        drop.connect(bp).connect(env).connect(out)
        drop.start(t, Math.random() * 3, 0.06)
      })
    } else {
      // cafe: a babble of voices (band-passed noise swelling and fading), a low hum, and the odd clink
      const babble = gain(0.45)
      loop('brown').connect(filter('bandpass', 750, 0.5)).connect(babble).connect(out)
      loop('pink').connect(filter('bandpass', 1400, 0.8)).connect(gain(0.1)).connect(out)
      loop('brown').connect(filter('lowpass', 220)).connect(gain(0.22)).connect(out)
      every(110, 340, () => babble.gain.setTargetAtTime(0.25 + Math.random() * 0.5, ctx.currentTime, 0.06))
      every(2500, 7000, () => {
        const osc = ctx.createOscillator()
        const env = gain(0)
        const t = ctx.currentTime
        osc.frequency.value = 2400 + Math.random() * 2200
        env.gain.setValueAtTime(0, t)
        env.gain.linearRampToValueAtTime(0.045, t + 0.003)
        env.gain.exponentialRampToValueAtTime(0.0005, t + 0.35)
        osc.connect(env).connect(out)
        osc.start(t)
        osc.stop(t + 0.4)
      })
    }

    for (const s of sources) s.start()
    return {
      out,
      stop: () => {
        for (const t of timers) window.clearTimeout(t)
        for (const s of sources) {
          try {
            s.stop()
          } catch {
            // already stopped
          }
        }
        for (const n of nodes) n.disconnect()
      },
    }
  }
}

/** A short two-note chime for "session finished", played through the same Web Audio context rules. */
export function playChime(createContext: () => AudioContext = () => new AudioContext()) {
  try {
    const ctx = createContext()
    void ctx.resume?.()
    const t = ctx.currentTime
    ;[660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      env.gain.setValueAtTime(0, t + i * 0.18)
      env.gain.linearRampToValueAtTime(0.18, t + i * 0.18 + 0.02)
      env.gain.exponentialRampToValueAtTime(0.0005, t + i * 0.18 + 0.7)
      osc.connect(env).connect(ctx.destination)
      osc.start(t + i * 0.18)
      osc.stop(t + i * 0.18 + 0.75)
    })
    window.setTimeout(() => void ctx.close?.(), 1500)
  } catch {
    // No audio available or blocked until a gesture; the notification still tells the user.
  }
}
