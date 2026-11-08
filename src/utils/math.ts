/** Frame-rate independent exponential smoothing toward a target. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Smooth 0→1 ramp of `t` between edges a and b. */
export function smoothstep(a: number, b: number, t: number) {
  const x = clamp((t - a) / (b - a), 0, 1)
  return x * x * (3 - 2 * x)
}

/** Maps t∈[a,b] linearly to [0,1] (clamped). */
export const progress = (a: number, b: number, t: number) => clamp((t - a) / (b - a), 0, 1)

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
