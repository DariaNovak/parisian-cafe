import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { LAYOUT } from '../constants/layout'
import { MATERIALS } from '../materials'
import { InstancedModel, ModelInstance, type InstanceTransform } from './ModelSource'
import { cobblestoneMaterial } from '../shaders/street/wetCobblestone'

const { floorY, road, sidewalk, farSidewalk, streetHalfLength: L } = LAYOUT

/** Deterministic random for stable layouts. */
function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/**
 * Thousands of individually jittered cobblestones in a single InstancedMesh.
 * Per-instance colours give natural variation; the shared material carries the
 * wet-street GLSL patch (puddles + ripples).
 */
function Cobblestones() {
  const ref = useRef<InstancedMesh>(null)
  const stone = 0.22
  const minX = -L, maxX = L
  const minZ = road.minZ + 0.32, maxZ = road.maxZ - 0.32
  const cols = Math.floor((maxX - minX) / stone)
  const rows = Math.floor((maxZ - minZ) / stone)
  const count = cols * rows
  const geometry = useMemo(() => new RoundedBoxGeometry(stone * 0.9, 0.1, stone * 0.86, 1, 0.035), [])

  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    const rand = seeded(42)
    const o = new Object3D()
    const c = new Color()
    const base = [new Color('#9C948A'), new Color('#8A8279'), new Color('#A89E90'), new Color('#7E7870'), new Color('#B3A795')]
    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = minX + (col + 0.5 + (r % 2) * 0.5) * stone
        const z = minZ + (r + 0.5) * stone
        o.position.set(x + (rand() - 0.5) * 0.02, -0.025 + rand() * 0.012, z + (rand() - 0.5) * 0.02)
        o.rotation.set((rand() - 0.5) * 0.06, (rand() - 0.5) * 0.25, (rand() - 0.5) * 0.06)
        const s = 0.88 + rand() * 0.2
        o.scale.set(s, 0.8 + rand() * 0.4, 0.9 + rand() * 0.15)
        o.updateMatrix()
        im.setMatrixAt(i, o.matrix)
        c.copy(base[Math.floor(rand() * base.length)]).multiplyScalar(0.9 + rand() * 0.2)
        im.setColorAt(i, c)
        i++
      }
    }
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
  }, [cols, rows, minX, minZ])

  return <instancedMesh ref={ref} args={[geometry, cobblestoneMaterial, count]} receiveShadow />
}

const GROUT = new MeshStandardMaterial({ color: '#4A4540', roughness: 0.95 })

function Trees() {
  // Stylised Parisian plane trees: trunk + clustered foliage, all foliage instanced.
  const ref = useRef<InstancedMesh>(null)
  const trees: Array<[number, number]> = [[-12.5, 12.4], [11.5, 12.4], [-20, 12.4], [19.5, 12.4]]
  const perTree = 14
  const geo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    const rand = seeded(7)
    const o = new Object3D()
    const c = new Color()
    let i = 0
    for (const [tx, tz] of trees) {
      for (let k = 0; k < perTree; k++) {
        const a = rand() * Math.PI * 2
        const r = rand() * 1.3
        o.position.set(tx + Math.cos(a) * r, 4.6 + rand() * 1.8, tz + Math.sin(a) * r)
        o.scale.setScalar(0.75 + rand() * 0.6)
        o.rotation.set(rand(), rand(), rand())
        o.updateMatrix()
        im.setMatrixAt(i, o.matrix)
        c.set(rand() > 0.5 ? '#6F8F5E' : '#87A26F').multiplyScalar(0.85 + rand() * 0.25)
        im.setColorAt(i, c)
        i++
      }
    }
    im.instanceMatrix.needsUpdate = true
    im.computeBoundingSphere()
  }, [])
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, MATERIALS.leafLight, trees.length * perTree]} castShadow receiveShadow />
      {trees.map(([x, z]) => (
        <group key={`${x}`} position={[x, floorY, z]}>
          <mesh position={[0, 2.2, 0]} material={MATERIALS.walnut} castShadow>
            <cylinderGeometry args={[0.12, 0.17, 4.4, 10]} />
          </mesh>
          <mesh position={[0, 0.005, 0]} material={MATERIALS.balconyIron} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.3, 0.7, 24]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const LAMPS: InstanceTransform[] = [
  { position: [-7.6, floorY, sidewalk.maxZ - 0.45] },
  { position: [7.6, floorY, sidewalk.maxZ - 0.45] },
  { position: [-3, floorY, farSidewalk.minZ + 0.45] },
  { position: [15, floorY, farSidewalk.minZ + 0.45] },
  { position: [-17, floorY, sidewalk.maxZ - 0.45] },
  { position: [18, floorY, sidewalk.maxZ - 0.45] },
]
export const LAMP_POSITIONS = LAMPS.map((l) => l.position)

export function Street() {
  const length = L * 2
  return (
    <group>
      {/* Grout bed visible between cobblestones. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, (road.minZ + road.maxZ) / 2]} material={GROUT} receiveShadow>
        <planeGeometry args={[length, road.maxZ - road.minZ]} />
      </mesh>
      <Cobblestones />
      {/* Gutters along both curbs. */}
      {[road.minZ + 0.16, road.maxZ - 0.16].map((z) => (
        <mesh key={z} position={[0, -0.01, z]} material={MATERIALS.curb} receiveShadow>
          <boxGeometry args={[length, 0.02, 0.32]} />
        </mesh>
      ))}
      {/* Sidewalks with granite curbs. */}
      <mesh position={[0, floorY / 2 - 0.01, (sidewalk.minZ + sidewalk.maxZ) / 2]} material={MATERIALS.sidewalk} receiveShadow>
        <boxGeometry args={[length, floorY, sidewalk.maxZ - sidewalk.minZ]} />
      </mesh>
      <mesh position={[0, floorY / 2 - 0.01, (farSidewalk.minZ + farSidewalk.maxZ) / 2]} material={MATERIALS.farSidewalk} receiveShadow>
        <boxGeometry args={[length, floorY, farSidewalk.maxZ - farSidewalk.minZ]} />
      </mesh>
      {[sidewalk.maxZ - 0.1, farSidewalk.minZ + 0.1].map((z) => (
        <mesh key={z} position={[0, floorY / 2, z]} material={MATERIALS.curb} receiveShadow castShadow>
          <boxGeometry args={[length, floorY + 0.02, 0.2]} />
        </mesh>
      ))}
      {/* Ground beyond the far buildings so the horizon never shows a void. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]} material={GROUT}>
        <planeGeometry args={[160, 160]} />
      </mesh>

      <InstancedModel model="lamp" transforms={LAMPS} />
      <ModelInstance model="bicycle" position={[-8.35, floorY, 3.7]} rotation={[0, 0.12, -0.05]} />
      <Trees />
    </group>
  )
}
