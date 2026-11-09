/**
 * Procedural "complex" models of the café: bistro chair, Parisian street lamp,
 * animated ceiling fan, croissant and a vintage bicycle.
 *
 * These are exported to GLB by `npm run build:models` (see scripts/build-models.ts)
 * and loaded at runtime through useGLTF. If loading fails, the same builder is used
 * directly as a procedural fallback, so the scene never breaks.
 */
import {
  AnimationClip,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Quaternion,
  QuaternionKeyframeTrack,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { PartBuilder, lathe, stdMat, tube } from './common.ts'

const HALF_PI = Math.PI / 2

/* ------------------------------------------------------------------ */
/* Bistro chair — bent-iron frame with a round oak seat. Faces +Z.     */
/* ------------------------------------------------------------------ */
export function buildBistroChair() {
  const iron = stdMat('ChairIron', '#22282A', 0.42, 0.75)
  const wood = stdMat('ChairSeat', '#9A6A45', 0.55, 0)
  const pb = new PartBuilder()

  // One continuous bent tube forms both back legs and the backrest hoop.
  pb.add(iron, tube([
    [-0.2, 0, -0.25], [-0.18, 0.44, -0.17], [-0.185, 0.68, -0.205], [-0.13, 0.84, -0.22],
    [0, 0.885, -0.225], [0.13, 0.84, -0.22], [0.185, 0.68, -0.205], [0.18, 0.44, -0.17], [0.2, 0, -0.25],
  ], 0.012, 96, 8))
  // Decorative inner loop and a scroll in the backrest.
  pb.add(iron, tube([[-0.1, 0.47, -0.18], [-0.11, 0.66, -0.2], [0, 0.77, -0.212], [0.11, 0.66, -0.2], [0.1, 0.47, -0.18]], 0.008, 48, 6))
  pb.add(iron, tube([[0, 0.47, -0.18], [0.03, 0.56, -0.19], [0, 0.62, -0.198], [-0.03, 0.56, -0.19], [0, 0.5, -0.183]], 0.006, 32, 6))
  // Front legs.
  for (const side of [-1, 1]) pb.add(iron, tube([[side * 0.15, 0.45, 0.1], [side * 0.18, 0.2, 0.15], [side * 0.2, 0, 0.19]], 0.012, 16, 8))
  // Seat ring and the leg stretcher ring.
  pb.add(iron, new TorusGeometry(0.212, 0.011, 8, 48), [0, 0.445, -0.03], [HALF_PI, 0, 0])
  pb.add(iron, new TorusGeometry(0.165, 0.007, 6, 40), [0, 0.17, -0.03], [HALF_PI, 0, 0])
  // Feet caps.
  for (const [x, z] of [[-0.2, 0.19], [0.2, 0.19], [-0.2, -0.25], [0.2, -0.25]]) pb.add(iron, new SphereGeometry(0.016, 8, 6), [x, 0.008, z])
  // Seat: slightly domed disc.
  pb.add(wood, lathe([[0, 0.475], [0.12, 0.474], [0.19, 0.47], [0.208, 0.462], [0.21, 0.448], [0, 0.448]], 40), [0, 0, -0.03])

  return pb.build('BistroChair')
}

/* ------------------------------------------------------------------ */
/* Parisian street lamp (≈3.9 m).                                      */
/* ------------------------------------------------------------------ */
export function buildStreetLamp() {
  const iron = stdMat('LampIron', '#1F2B26', 0.45, 0.6)
  const glass = stdMat('LampGlass', '#FFE7C2', 0.2, 0, { emissive: new Color('#FFC873'), emissiveIntensity: 2.2 })
  const pb = new PartBuilder()

  pb.add(iron, lathe([[0, 0], [0.21, 0], [0.21, 0.07], [0.16, 0.12], [0.15, 0.36], [0.105, 0.42], [0.12, 0.5], [0.075, 0.58], [0.06, 0.62], [0, 0.62]], 24))
  pb.add(iron, new CylinderGeometry(0.035, 0.048, 2.6, 16), [0, 1.9, 0])
  // Fluting ribs on the lower pole.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    pb.add(iron, new BoxGeometry(0.012, 1.0, 0.012), [Math.cos(a) * 0.047, 1.1, Math.sin(a) * 0.047])
  }
  pb.add(iron, new TorusGeometry(0.06, 0.016, 8, 24), [0, 1.65, 0], [HALF_PI, 0, 0])
  pb.add(iron, new TorusGeometry(0.05, 0.012, 8, 24), [0, 3.0, 0], [HALF_PI, 0, 0])
  // Capital + decorative scrolls supporting the lantern.
  pb.add(iron, lathe([[0, 3.18], [0.04, 3.18], [0.09, 3.24], [0.1, 3.27], [0, 3.27]], 20))
  for (const side of [-1, 1]) pb.add(iron, tube([[0, 3.0, 0], [side * 0.12, 3.06, 0], [side * 0.15, 3.16, 0], [side * 0.1, 3.24, 0]], 0.01, 16, 6))
  // Lantern: glass body, cage posts and roof.
  pb.add(glass, lathe([[0.095, 3.3], [0.16, 3.6], [0.155, 3.62], [0, 3.62], [0, 3.3]], 6))
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    const p0 = new Vector3(Math.cos(a) * 0.1, 3.3, Math.sin(a) * 0.1)
    const p1 = new Vector3(Math.cos(a) * 0.165, 3.61, Math.sin(a) * 0.165)
    pb.add(iron, tube([[p0.x, p0.y, p0.z], [p1.x, p1.y, p1.z]], 0.007, 2, 4))
  }
  pb.add(iron, new CylinderGeometry(0.1, 0.07, 0.04, 6), [0, 3.29, 0])
  pb.add(iron, new ConeGeometry(0.21, 0.2, 6), [0, 3.72, 0])
  pb.add(iron, new SphereGeometry(0.03, 10, 8), [0, 3.84, 0])

  return pb.build('StreetLamp')
}

/* ------------------------------------------------------------------ */
/* Ceiling fan with a baked "Spin" animation clip (played with AnimationMixer). */
/* Origin is the ceiling mount; the fan hangs toward -Y.               */
/* ------------------------------------------------------------------ */
export function buildCeilingFan() {
  const brass = stdMat('FanBrass', '#C9A063', 0.32, 0.85)
  const blade = stdMat('FanBlade', '#6B4530', 0.5, 0)
  const bowl = stdMat('FanBowl', '#FFF4E0', 0.3, 0, { emissive: new Color('#FFD9A0'), emissiveIntensity: 1.4 })

  const fixed = new PartBuilder()
  fixed.add(brass, lathe([[0, 0], [0.09, 0], [0.09, -0.02], [0.05, -0.07], [0, -0.07]], 24))
  fixed.add(brass, new CylinderGeometry(0.013, 0.013, 0.36, 10), [0, -0.25, 0])
  const root = new Group()
  root.name = 'CeilingFan'
  root.add(fixed.build('FanMount'))

  const rotorParts = new PartBuilder()
  rotorParts.add(brass, lathe([[0, 0.05], [0.07, 0.04], [0.11, 0], [0.1, -0.05], [0.06, -0.08], [0, -0.08]], 28))
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const c = Math.cos(a), s = Math.sin(a)
    rotorParts.add(brass, new BoxGeometry(0.2, 0.012, 0.04), [c * 0.17, -0.01, -s * 0.17], [0, a, 0])
    rotorParts.add(blade, new BoxGeometry(0.58, 0.01, 0.13), [c * 0.52, -0.015, -s * 0.52], [0.08, a, 0])
  }
  rotorParts.add(bowl, new SphereGeometry(0.075, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), [0, -0.08, 0])
  const rotor = rotorParts.build('Rotor', false)
  rotor.position.set(0, -0.48, 0)
  root.add(rotor)

  // Full revolution in 4 s, sampled every quarter turn for clean slerp.
  const times = [0, 1, 2, 3, 4]
  const values: number[] = []
  const q = new Quaternion()
  for (let i = 0; i < times.length; i++) {
    q.setFromAxisAngle(new Vector3(0, 1, 0), (i * Math.PI) / 2)
    values.push(q.x, q.y, q.z, q.w)
  }
  const clip = new AnimationClip('Spin', 4, [new QuaternionKeyframeTrack('Rotor.quaternion', times, values)])
  root.animations = [clip]
  return root
}

/* ------------------------------------------------------------------ */
/* Croissant — overlapping laminated segments along a crescent arc.    */
/* ------------------------------------------------------------------ */
export function buildCroissant() {
  const pastry = stdMat('Croissant', '#C98B4A', 0.48, 0)
  const tips = stdMat('CroissantTips', '#A8682F', 0.55, 0)
  const pb = new PartBuilder()
  const sphere = new SphereGeometry(1, 18, 12)
  const R = 0.065
  const N = 9
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * 2 - 1
    const a = t * 1.25
    const s = 0.034 * (1 - 0.62 * t * t)
    const mat = Math.abs(t) > 0.8 ? tips : pastry
    pb.add(mat, sphere, [Math.sin(a) * R, s * 0.78, Math.cos(a) * R - R * 0.55], [0, a + HALF_PI, (i % 2 ? 0.12 : -0.12)], [s * 0.85, s * 0.78, s * 1.25])
  }
  return pb.build('Croissant', false)
}

/* ------------------------------------------------------------------ */
/* Vintage mint bicycle with a wicker basket (baguette + flowers).     */
/* Length along X, origin on the ground.                               */
/* ------------------------------------------------------------------ */
export function buildBicycle() {
  const frame = stdMat('BikeFrame', '#8FB3A2', 0.35, 0.45)
  const rubber = stdMat('BikeTire', '#1A1A1A', 0.85, 0)
  const chrome = stdMat('BikeChrome', '#D8D8D8', 0.2, 1)
  const leather = stdMat('BikeLeather', '#6B4530', 0.6, 0)
  const wicker = stdMat('BikeWicker', '#B8875A', 0.8, 0)
  const bread = stdMat('Baguette', '#D49A55', 0.6, 0)
  const petals = stdMat('BikeFlowers', '#E9BFC4', 0.6, 0)
  const pb = new PartBuilder()

  const wheelR = 0.33
  for (const x of [-0.52, 0.52]) {
    pb.add(rubber, new TorusGeometry(wheelR, 0.02, 10, 48), [x, wheelR + 0.01, 0])
    pb.add(chrome, new TorusGeometry(wheelR - 0.025, 0.008, 6, 48), [x, wheelR + 0.01, 0])
    pb.add(chrome, new CylinderGeometry(0.025, 0.025, 0.08, 12), [x, wheelR + 0.01, 0], [HALF_PI, 0, 0])
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI
      pb.add(chrome, new CylinderGeometry(0.0025, 0.0025, (wheelR - 0.03) * 2, 3), [x, wheelR + 0.01, 0], [0, 0, a])
    }
    // Fender arc.
    pb.add(frame, new TorusGeometry(wheelR + 0.04, 0.012, 6, 32, Math.PI * 0.9), [x, wheelR + 0.01, 0], [0, 0, Math.PI * 0.05])
  }
  const t = (pts: Array<[number, number, number]>, r = 0.018) => pb.add(frame, tube(pts, r, 8, 8))
  t([[0, 0.3, 0], [-0.12, 0.82, 0]])
  t([[-0.11, 0.78, 0], [0.42, 0.8, 0]])
  t([[0, 0.3, 0], [0.42, 0.74, 0]])
  for (const z of [-0.04, 0.04]) {
    t([[0, 0.3, z * 0.5], [-0.52, 0.34, z]], 0.011)
    t([[-0.11, 0.77, z * 0.3], [-0.52, 0.34, z]], 0.011)
    t([[0.42, 0.8, z * 0.4], [0.47, 0.55, z], [0.52, 0.34, z]], 0.013)
  }
  pb.add(chrome, tube([[0.42, 0.78, 0], [0.4, 0.98, 0]], 0.012, 4, 8))
  pb.add(chrome, tube([[0.3, 0.99, -0.26], [0.42, 0.99, -0.18], [0.4, 0.98, 0], [0.42, 0.99, 0.18], [0.3, 0.99, 0.26]], 0.011, 24, 8))
  for (const z of [-0.26, 0.26]) pb.add(leather, new CylinderGeometry(0.017, 0.017, 0.09, 10), [0.27, 0.99, z], [0, 0, HALF_PI])
  pb.add(chrome, new CylinderGeometry(0.01, 0.01, 0.14, 8), [-0.13, 0.88, 0])
  pb.add(leather, new SphereGeometry(1, 16, 10), [-0.15, 0.96, 0], [0, 0, 0], [0.13, 0.035, 0.075])
  pb.add(chrome, new CylinderGeometry(0.05, 0.05, 0.015, 16), [0, 0.3, 0.03], [HALF_PI, 0, 0])
  for (const z of [-0.09, 0.09]) pb.add(chrome, new BoxGeometry(0.08, 0.015, 0.04), [0, 0.3 + (z > 0 ? 0.12 : -0.12), z])
  // Basket with a baguette and a small bouquet.
  pb.add(wicker, new CylinderGeometry(0.17, 0.14, 0.18, 20, 1, true), [0.62, 0.98, 0])
  pb.add(wicker, new CylinderGeometry(0.14, 0.14, 0.01, 20), [0.62, 0.895, 0])
  pb.add(wicker, new TorusGeometry(0.17, 0.012, 6, 24), [0.62, 1.07, 0], [HALF_PI, 0, 0])
  pb.add(bread, new CapsuleGeometry(0.03, 0.5, 6, 12), [0.66, 1.12, 0.04], [0.2, 0, -0.55])
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1
    pb.add(petals, new SphereGeometry(0.035, 10, 8), [0.58 + Math.cos(a) * 0.06, 1.1 + (i % 2) * 0.03, -0.06 + Math.sin(a) * 0.05])
  }
  const bike = pb.build('Bicycle')
  return bike
}

export const MODEL_BUILDERS = {
  chair: buildBistroChair,
  lamp: buildStreetLamp,
  fan: buildCeilingFan,
  croissant: buildCroissant,
  bicycle: buildBicycle,
} as const

export type ModelKey = keyof typeof MODEL_BUILDERS
