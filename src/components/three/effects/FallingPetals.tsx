import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three'
import { useCafeStore } from '../../../app/store/useCafeStore'
import { LAYOUT } from '../../../constants/layout'
import { QUALITY_PRESETS } from '../../../constants/quality'
import { drainPetalBursts } from './petalBus'

interface Petal {
  alive: boolean
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  rx: number; ry: number; rz: number
  spin: number
  phase: number
  /** Seconds left once landed (petals rest on the pavement, then shrink away). */
  rest: number
}

const POOL = 160
/** Where ambient petals detach: the two shop-window flower boxes. */
const SOURCES = LAYOUT.windows.map((w) => ({ x0: w.minX + 0.2, x1: w.maxX - 0.2, y: LAYOUT.windowSill + 0.1, z: 0.3 }))
const AMBIENT_COLORS = ['#F2B5BD', '#E7848F', '#FBEFE3', '#E9BFC4']

/**
 * Flower petals drifting down from the window boxes, plus bursts when the user
 * brushes a flower bed. A fixed pool of instances is simulated on the CPU each
 * frame (cheap: < 200 matrices) and rendered with a single draw call.
 */
export function FallingPetals() {
  const ref = useRef<InstancedMesh>(null)
  const quality = useCafeStore((s) => s.quality)
  const ambientRate = 1.6 * QUALITY_PRESETS[quality].particles
  const petals = useMemo<Petal[]>(() => Array.from({ length: POOL }, () => ({ alive: false, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, spin: 0, phase: 0, rest: 0 })), [])
  const geometry = useMemo(() => new SphereGeometry(1, 6, 4).scale(0.016, 0.003, 0.011), [])
  const material = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: DoubleSide }), [])
  const o = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])
  const spawnAcc = useRef(0)
  const cursor = useRef(0)

  const spawn = (x: number, y: number, z: number, burst: boolean, colors: string[]) => {
    for (let k = 0; k < POOL; k++) {
      const i = (cursor.current + k) % POOL
      const p = petals[i]
      if (p.alive) continue
      cursor.current = (i + 1) % POOL
      Object.assign(p, {
        alive: true, x, y, z,
        vx: (Math.random() - 0.5) * (burst ? 0.9 : 0.15),
        vy: burst ? 0.4 + Math.random() * 0.6 : 0,
        vz: (burst ? 0.2 : 0.05) + Math.random() * (burst ? 0.6 : 0.15),
        rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
        spin: 2 + Math.random() * 4, phase: Math.random() * 10, rest: 3 + Math.random() * 3,
      })
      ref.current!.setColorAt(i, color.set(colors[Math.floor(Math.random() * colors.length)]))
      if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
      return
    }
  }

  useLayoutEffect(() => {
    // Park every instance out of sight until it is spawned.
    o.position.set(0, -10, 0)
    o.scale.setScalar(0)
    o.updateMatrix()
    for (let i = 0; i < POOL; i++) {
      ref.current!.setMatrixAt(i, o.matrix)
      ref.current!.setColorAt(i, color.set('#ffffff'))
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [o, color])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const t = state.clock.elapsedTime
    // Ambient detachment.
    spawnAcc.current += dt * ambientRate
    while (spawnAcc.current > 1) {
      spawnAcc.current -= 1
      const s = SOURCES[Math.floor(Math.random() * SOURCES.length)]
      spawn(s.x0 + Math.random() * (s.x1 - s.x0), s.y, s.z, false, AMBIENT_COLORS)
    }
    // Click bursts.
    for (const b of drainPetalBursts()) for (let k = 0; k < 26; k++) spawn(b.origin[0], b.origin[1], b.origin[2], true, b.colors)

    const im = ref.current!
    for (let i = 0; i < POOL; i++) {
      const p = petals[i]
      if (!p.alive) continue
      if (p.y > LAYOUT.floorY + 0.004) {
        // Air drag pulls velocity toward a slow, fluttering terminal fall.
        p.vy += (-0.32 - p.vy) * Math.min(1, dt * 2.5)
        p.vx += Math.sin(t * 2.2 + p.phase) * 0.6 * dt
        p.vz += Math.cos(t * 1.7 + p.phase) * 0.3 * dt
        p.vx *= 1 - dt * 0.8
        p.vz *= 1 - dt * 0.8
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        p.rx += p.spin * dt
        p.rz += p.spin * 0.6 * dt
        if (p.y <= LAYOUT.floorY + 0.004) {
          p.y = LAYOUT.floorY + 0.004
          p.rx = 0
          p.rz = 0
        }
      } else {
        p.rest -= dt
        if (p.rest <= 0) p.alive = false
      }
      o.position.set(p.x, p.y, p.z)
      o.rotation.set(p.rx, p.ry, p.rz)
      o.scale.setScalar(p.alive ? Math.min(1, p.rest) : 0)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
    }
    im.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geometry, material, POOL]} frustumCulled={false} />
}
