import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, LatheGeometry, Object3D, SphereGeometry, Vector2, type Vector3Tuple } from 'three'
import { Interactive } from '../components/three/interactions/Interactive'
import { LAYOUT } from '../constants/layout'
import { MATERIALS } from '../materials'
import { createFoliageMaterial, foliageTime, type FoliageMaterial } from '../shaders/foliage/windSway'
import { emitPetals } from '../components/three/effects/petalBus'
import { playSfx } from '../audio/audioEngine'

const { windows, windowSill, floorY } = LAYOUT

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/* Shared plant geometries (unit-sized, scaled per instance). */
const GEO = {
  stem: new CylinderGeometry(0.004, 0.005, 1, 4).translate(0, 0.5, 0),
  blossom: new IcosahedronGeometry(0.03, 1),
  leaf: new SphereGeometry(1, 8, 6).scale(1, 0.18, 0.55),
  bigLeaf: new SphereGeometry(1, 10, 6).scale(1, 0.06, 0.45).translate(1, 0, 0),
  ivyLeaf: new SphereGeometry(1, 6, 4).scale(1, 1, 0.12),
  pot: new LatheGeometry([[0, 0], [0.16, 0], [0.2, 0.36], [0.23, 0.38], [0.23, 0.44], [0.2, 0.44], [0, 0.42]].map(([r, y]) => new Vector2(r, y)), 24),
  topiary: new IcosahedronGeometry(1, 3),
}

interface BedSpec {
  key: string
  center: Vector3Tuple
  size: [number, number]
  /** Blossom palette for this bed. */
  colors: string[]
  density?: number
  height?: number
}

/** Flower boxes and planters on the facade and terrace. */
const BEDS: BedSpec[] = [
  ...windows.map((w, i) => ({
    key: `window-${i}`,
    center: [(w.minX + w.maxX) / 2, windowSill - 0.09, 0.28] as Vector3Tuple,
    size: [w.maxX - w.minX - 0.4, 0.2] as [number, number],
    colors: i === 0 ? ['#E7848F', '#F2B5BD', '#FFFFFF', '#D9606E'] : ['#F2B5BD', '#FBEFE3', '#C77D62', '#E9BFC4'],
  })),
  { key: 'balcony-a', center: [-4.2, 4.92, 0.2], size: [0.9, 0.18], colors: ['#D9606E', '#F2B5BD'], height: 0.22 },
  { key: 'balcony-b', center: [1.4, 4.92, 0.2], size: [0.9, 0.18], colors: ['#FFFFFF', '#E9BFC4'], height: 0.22 },
  { key: 'door-l', center: [-1.08, floorY + 0.44, 0.45], size: [0.32, 0.32], colors: ['#E7848F', '#FBEFE3'], density: 70 },
  { key: 'door-r', center: [1.08, floorY + 0.44, 0.45], size: [0.32, 0.32], colors: ['#F2B5BD', '#C77D62'], density: 70 },
]

/** One clickable flower bed: stems, leaves and blossoms as three InstancedMeshes. */
function FlowerBed({ bed, seed }: { bed: BedSpec; seed: number }) {
  const stems = useRef<InstancedMesh>(null)
  const leaves = useRef<InstancedMesh>(null)
  const blossoms = useRef<InstancedMesh>(null)
  const area = bed.size[0] * bed.size[1]
  const count = Math.max(10, Math.round(area * (bed.density ?? 48) * 4.5))
  const baseY = bed.center[1]

  const mats = useMemo(
    () => ({
      stem: createFoliageMaterial({ color: '#5E7F55', baseY, amplitude: 0.03 }),
      leaf: createFoliageMaterial({ color: '#ffffff', baseY, amplitude: 0.02, side: 2 }),
      blossom: createFoliageMaterial({ color: '#ffffff', roughness: 0.55, baseY, amplitude: 0.03, emissive: '#ffffff' }),
    }),
    [baseY],
  )

  useLayoutEffect(() => {
    const rand = seeded(seed)
    const o = new Object3D()
    const c = new Color()
    const [cx, cy, cz] = bed.center
    const hMax = bed.height ?? 0.3
    for (let i = 0; i < count; i++) {
      const x = cx + (rand() - 0.5) * bed.size[0]
      const z = cz + (rand() - 0.5) * bed.size[1]
      const h = hMax * (0.45 + rand() * 0.55)
      const lean = (rand() - 0.5) * 0.4
      o.position.set(x, cy, z)
      o.rotation.set(lean, rand() * Math.PI, lean * 0.5)
      o.scale.set(1, h, 1)
      o.updateMatrix()
      stems.current!.setMatrixAt(i, o.matrix)
      // Blossom at the (leaning) stem tip.
      o.position.set(x + Math.sin(lean * 0.5) * h * 0.3, cy + h * Math.cos(lean), z + Math.sin(lean) * h * 0.4)
      o.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      o.scale.setScalar(0.7 + rand() * 0.6)
      o.updateMatrix()
      blossoms.current!.setMatrixAt(i, o.matrix)
      c.set(bed.colors[Math.floor(rand() * bed.colors.length)]).multiplyScalar(0.9 + rand() * 0.15)
      blossoms.current!.setColorAt(i, c)
      // A leaf low on the stem.
      o.position.set(x + (rand() - 0.5) * 0.04, cy + h * (0.15 + rand() * 0.3), z + (rand() - 0.5) * 0.04)
      o.rotation.set((rand() - 0.5) * 0.8, rand() * Math.PI * 2, (rand() - 0.5) * 0.6)
      o.scale.setScalar(0.035 + rand() * 0.025)
      o.updateMatrix()
      leaves.current!.setMatrixAt(i, o.matrix)
      c.set(rand() > 0.5 ? '#5E7F55' : '#77976A').multiplyScalar(0.85 + rand() * 0.3)
      leaves.current!.setColorAt(i, c)
    }
    for (const im of [stems.current!, leaves.current!, blossoms.current!]) {
      im.instanceMatrix.needsUpdate = true
      if (im.instanceColor) im.instanceColor.needsUpdate = true
      im.computeBoundingSphere()
    }
  }, [bed, count, seed])

  // Decay the click pulse (no React state involved).
  useFrame((_, dt) => {
    const u = mats.blossom.userData.foliage.uPulse
    if (u.value <= 0) return
    u.value = Math.max(0, u.value - dt * 0.45)
    mats.stem.userData.foliage.uPulse.value = u.value
    mats.leaf.userData.foliage.uPulse.value = u.value
  })

  const onSelect = (point: { x: number; y: number; z: number }) => {
    for (const m of Object.values(mats) as FoliageMaterial[]) {
      m.userData.foliage.uPulse.value = 1
      m.userData.foliage.uPulseOrigin.value.set(point.x, point.y, point.z)
    }
    emitPetals([point.x, point.y + 0.1, point.z], bed.colors)
    playSfx('pop')
  }

  return (
    <Interactive label="Brush the flowers" onSelect={(e) => onSelect(e.point)}>
      <instancedMesh ref={stems} args={[GEO.stem, mats.stem, count]} />
      <instancedMesh ref={leaves} args={[GEO.leaf, mats.leaf, count]} castShadow />
      <instancedMesh ref={blossoms} args={[GEO.blossom, mats.blossom, count]} castShadow />
    </Interactive>
  )
}

/** Ivy climbing the outer piers: random-walk vines of instanced leaves. */
function Ivy() {
  const ref = useRef<InstancedMesh>(null)
  const mat = useMemo(() => createFoliageMaterial({ color: '#ffffff', baseY: 0.2, amplitude: 0.006, side: 2 }), [])
  const vines: Array<{ x0: number; x1: number }> = [
    { x0: -5.95, x1: -5.35 },
    { x0: 5.35, x1: 5.95 },
  ]
  const perVine = 9
  const leavesPerVine = 46
  const count = vines.length * perVine * leavesPerVine
  useLayoutEffect(() => {
    const rand = seeded(99)
    const o = new Object3D()
    const c = new Color()
    let i = 0
    for (const v of vines) {
      for (let k = 0; k < perVine; k++) {
        let x = v.x0 + rand() * (v.x1 - v.x0)
        let y = 0.15
        const top = 1.6 + rand() * 1.55
        for (let j = 0; j < leavesPerVine; j++) {
          y += top / leavesPerVine
          x = Math.min(v.x1, Math.max(v.x0, x + (rand() - 0.5) * 0.08))
          o.position.set(x + (rand() - 0.5) * 0.05, y, 0.05 + rand() * 0.04)
          o.rotation.set((rand() - 0.5) * 0.6, (rand() - 0.5) * 0.8, rand() * Math.PI * 2)
          o.scale.setScalar(0.028 + rand() * 0.022)
          o.updateMatrix()
          ref.current!.setMatrixAt(i, o.matrix)
          c.set(['#4F7048', '#5E7F55', '#6E8E5F', '#3F5E3A'][Math.floor(rand() * 4)])
          ref.current!.setColorAt(i, c)
          i++
        }
      }
    }
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.instanceColor!.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [])
  return <instancedMesh ref={ref} args={[GEO.ivyLeaf, mat, count]} castShadow />
}

/** Leafy potted plant (fiddle-leaf style) built from instanced leaves. */
export function PottedPlant({ position, scale = 1, leaves = 26, seed = 1 }: { position: Vector3Tuple; scale?: number; leaves?: number; seed?: number }) {
  const ref = useRef<InstancedMesh>(null)
  const mat = useMemo(() => createFoliageMaterial({ color: '#ffffff', baseY: position[1] + 0.4 * scale, amplitude: 0.012, side: 2 }), [position, scale])
  useLayoutEffect(() => {
    const rand = seeded(seed)
    const o = new Object3D()
    const c = new Color()
    for (let i = 0; i < leaves; i++) {
      const t = i / leaves
      const a = i * 2.39996 // golden angle
      o.position.set(Math.cos(a) * 0.05, 0.42 + t * 0.95, Math.sin(a) * 0.05)
      o.rotation.set(0, -a, 0.35 + rand() * 0.5 - t * 0.3)
      o.scale.setScalar(0.12 + (1 - t) * 0.08 + rand() * 0.03)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
      c.set(rand() > 0.4 ? '#4E7349' : '#6B8F5E')
      ref.current!.setColorAt(i, c)
    }
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.instanceColor!.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [leaves, seed])
  return (
    <group position={position} scale={scale}>
      <mesh geometry={GEO.pot} material={MATERIALS.terracotta} castShadow receiveShadow />
      <mesh material={MATERIALS.soil} position={[0, 0.425, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.2, 20]} />
      </mesh>
      <mesh material={MATERIALS.walnut} position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 0.9, 6]} />
      </mesh>
      <instancedMesh ref={ref} args={[GEO.bigLeaf, mat, leaves]} castShadow />
    </group>
  )
}

/** Clipped boxwood ball in a terracotta pot (terrace corners). */
function Topiary({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <mesh geometry={GEO.pot} material={MATERIALS.terracotta} scale={[1.2, 1.3, 1.2]} castShadow receiveShadow />
      <mesh material={MATERIALS.walnut} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.6, 6]} />
      </mesh>
      <mesh geometry={GEO.topiary} material={MATERIALS.leaf} position={[0, 1.2, 0]} scale={0.36} castShadow receiveShadow />
    </group>
  )
}

/** A single cut flower (used in table bud vases). */
export function Flower({ position, color }: { position: Vector3Tuple; color: string }) {
  const mat = useMemo(() => {
    const m = MATERIALS.fabricPink.clone()
    m.color.set(color)
    m.roughness = 0.6
    return m
  }, [color])
  return (
    <group position={position}>
      <mesh geometry={GEO.stem} material={MATERIALS.leaf} scale={[1, 0.1, 1]} />
      <mesh geometry={GEO.blossom} material={mat} position={[0, 0.1, 0]} scale={0.9} castShadow />
      <mesh geometry={GEO.leaf} material={MATERIALS.leaf} position={[0.012, 0.05, 0]} scale={0.025} rotation={[0, 0, 0.5]} />
    </group>
  )
}

/** Updates the shared foliage clock once per frame. */
function FoliageClock() {
  useFrame((state) => {
    foliageTime.value = state.clock.elapsedTime
  })
  return null
}

export function Plants() {
  return (
    <group>
      <FoliageClock />
      {BEDS.map((bed, i) => (
        <FlowerBed key={bed.key} bed={bed} seed={11 + i * 7} />
      ))}
      {/* Planter boxes for the upper balconies and the door-side pots. */}
      {BEDS.slice(2, 4).map((b) => (
        <mesh key={b.key} material={MATERIALS.terracotta} position={[b.center[0], b.center[1] - 0.09, b.center[2]]} castShadow>
          <boxGeometry args={[b.size[0] + 0.1, 0.18, b.size[1] + 0.06]} />
        </mesh>
      ))}
      {[-1.08, 1.08].map((x) => (
        <mesh key={x} geometry={GEO.pot} material={MATERIALS.terracotta} position={[x, floorY, 0.45]} scale={[1, 0.75, 1]} castShadow receiveShadow />
      ))}
      <Ivy />
      <Topiary position={[-5.75, floorY, 0.55]} />
      <Topiary position={[5.75, floorY, 0.55]} />
      {/* Interior greenery */}
      <PottedPlant position={[-5.35, floorY, -0.95]} scale={1.15} seed={3} />
      <PottedPlant position={[5.35, floorY, -0.95]} scale={1.05} seed={5} />
      <PottedPlant position={[5.3, floorY, -7.3]} scale={1.2} seed={8} leaves={30} />
    </group>
  )
}
