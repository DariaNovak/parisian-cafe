import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { ConeGeometry, InstancedMesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D } from 'three'
import { COUNTER_TOP, GRINDER_POS, INTERIOR, LAYOUT, TRAY_POS } from '../constants/layout'
import { MATERIALS } from '../materials'
import { Box } from './primitives'
import { Croissant } from './Desserts'

const C = LAYOUT.counter
const BACK_Z = C.frontZ - C.depth
const { floorY } = LAYOUT

/** Warm beige cloth on the tray (plain white blooms under the bar spotlight). */
const TRAY_CLOTH = new MeshStandardMaterial({ color: '#CDB89C', roughness: 1 })

const GLASS_DOME = new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false })

/** Scattered coffee beans (instanced) near the grinder. */
function CoffeeBeans() {
  const ref = useRef<InstancedMesh>(null)
  const n = 40
  useLayoutEffect(() => {
    const o = new Object3D()
    let s = 17
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * 0.09
      o.position.set(GRINDER_POS[0] + 0.25 + Math.cos(a) * d, COUNTER_TOP + 0.004, GRINDER_POS[2] + 0.18 + Math.sin(a) * d * 0.6)
      o.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.4, r() * Math.PI, 0)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    }
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, MATERIALS.coffeeBean, n]}>
      <sphereGeometry args={[0.006, 8, 6]} />
    </instancedMesh>
  )
}

export const BEAN_FILL_GEO = new ConeGeometry(0.075, 0.12, 20, 1, false).rotateX(Math.PI)
const HOPPER_GLASS = new MeshPhysicalMaterial({ color: '#F5F1E8', roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false })

/** Burr grinder; `hopperChildren` lets the coffee station animate the beans. */
export function Grinder({ hopperChildren }: { hopperChildren?: ReactNode }) {
  return (
    <group>
      <Box position={[0, 0.05, 0.02]} size={[0.17, 0.1, 0.24]} material={MATERIALS.chrome} />
      <mesh material={MATERIALS.chrome} position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.24, 24]} />
      </mesh>
      <mesh material={MATERIALS.terracotta} position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.072, 0.082, 0.1, 24]} />
      </mesh>
      {/* Doser chute and portafilter fork */}
      <mesh material={MATERIALS.chrome} position={[0, 0.18, 0.09]} rotation-x={0.6}>
        <cylinderGeometry args={[0.018, 0.024, 0.06, 12]} />
      </mesh>
      <Box position={[0, 0.12, 0.1]} size={[0.06, 0.008, 0.05]} material={MATERIALS.chrome} />
      {/* Bean hopper */}
      <group position={[0, 0.42, 0]}>
        {hopperChildren ?? <mesh geometry={BEAN_FILL_GEO} material={MATERIALS.coffeeBean} position={[0, -0.025, 0]} />}
        <mesh material={HOPPER_GLASS} renderOrder={2}>
          <cylinderGeometry args={[0.09, 0.03, 0.18, 24, 1, true]} />
        </mesh>
        <mesh material={MATERIALS.iron} position={[0, 0.095, 0]}>
          <cylinderGeometry args={[0.094, 0.094, 0.015, 24]} />
        </mesh>
      </group>
    </group>
  )
}

function CashRegister() {
  return (
    <group position={[0.85, COUNTER_TOP, -6.0]} rotation={[0, -0.35, 0]}>
      <Box position={[0, 0.09, 0]} size={[0.34, 0.18, 0.3]} material={MATERIALS.brass} />
      <Box position={[0, 0.2, -0.06]} size={[0.3, 0.12, 0.08]} material={MATERIALS.brass} />
      <Box position={[0, 0.27, -0.06]} size={[0.14, 0.06, 0.02]} material={MATERIALS.linen} cast={false} />
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} material={MATERIALS.linen} position={[-0.11 + (i % 4) * 0.073, 0.185 + Math.floor(i / 4) * 0.01, 0.1 - Math.floor(i / 4) * 0.04]}>
          <cylinderGeometry args={[0.013, 0.013, 0.012, 12]} />
        </mesh>
      ))}
    </group>
  )
}

/** Serving tray where finished coffees and ordered desserts land (physics collider lives in PhysicsWorld). */
export function ServingTray() {
  return (
    <group position={TRAY_POS}>
      <Box position={[0, 0.006, 0]} size={[0.56, 0.012, 0.38]} material={MATERIALS.walnut} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box position={[s * 0.28, 0.025, 0]} size={[0.015, 0.04, 0.38]} material={MATERIALS.walnut} />
          <Box position={[0, 0.025, s * 0.19]} size={[0.56, 0.04, 0.015]} material={MATERIALS.walnut} />
        </group>
      ))}
      <mesh material={TRAY_CLOTH} position={[0.1, 0.0125, 0.0]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <circleGeometry args={[0.12, 32]} />
      </mesh>
    </group>
  )
}

const CROISSANT_SPOTS: Array<[number, number, number, number]> = [[0, 0, 0, 0], [0.07, 0, 0.04, 1.4], [-0.06, 0, 0.05, 2.6], [0.01, 0.035, 0.02, 0.8]]

export function Counter({ machine, grinder }: { machine: ReactNode; grinder: ReactNode }) {
  const w = C.maxX - C.minX
  const cx = (C.minX + C.maxX) / 2
  return (
    <group>
      {/* Main counter: panelled walnut front, marble top, brass foot rail */}
      <Box min={[C.minX, floorY, BACK_Z]} max={[C.maxX, COUNTER_TOP - 0.04, C.frontZ]} material={MATERIALS.darkWood} />
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} position={[C.minX + (i + 0.5) * (w / 6), floorY + (C.height - 0.04) / 2, C.frontZ + 0.012]} size={[w / 6 - 0.12, C.height * 0.66, 0.025]} material={MATERIALS.walnut} />
      ))}
      <Box min={[C.minX - 0.04, COUNTER_TOP - 0.04, BACK_Z - 0.02]} max={[C.maxX + 0.04, COUNTER_TOP, C.frontZ + 0.07]} material={MATERIALS.marble} />
      <mesh material={MATERIALS.brass} position={[cx, floorY + 0.16, C.frontZ + 0.16]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, w, 12]} />
      </mesh>
      {[C.minX + 0.3, cx, C.maxX - 0.3].map((x) => (
        <Box key={x} position={[x, floorY + 0.1, C.frontZ + 0.09]} size={[0.025, 0.14, 0.14]} material={MATERIALS.brass} cast={false} />
      ))}
      {/* Barista side: oak cupboards, a steel under-counter fridge and brass pulls */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = C.minX + (i + 0.5) * (w / 6)
        const fridge = i === 2 || i === 3
        return (
          <group key={`back-${i}`}>
            {/* Drawer below the worktop, cupboard (or fridge) door below that. */}
            <Box position={[x, COUNTER_TOP - 0.13, BACK_Z - 0.012]} size={[w / 6 - 0.012, 0.16, 0.024]} material={MATERIALS.trimCream} />
            <Box position={[x, floorY + 0.42, BACK_Z - 0.012]} size={[w / 6 - 0.012, 0.72, 0.024]} material={fridge ? MATERIALS.steel : MATERIALS.trimCream} />
            <Box position={[x, COUNTER_TOP - 0.13, BACK_Z - 0.032]} size={[w / 14, 0.014, 0.018]} material={MATERIALS.brass} cast={false} />
            <Box position={[x, floorY + 0.7, BACK_Z - 0.032]} size={[w / 10, 0.016, 0.02]} material={MATERIALS.brass} cast={false} />
          </group>
        )
      })}
      {/* Rubber mat the barista stands on */}
      <Box min={[C.minX + 0.2, floorY, BACK_Z - 0.85]} max={[C.maxX - 0.2, floorY + 0.008, BACK_Z - 0.15]} material={MATERIALS.blackboard} cast={false} />
      {/* Back counter with cupboards */}
      <Box min={[-4.55, floorY, INTERIOR.minZ]} max={[2.0, floorY + 0.9, INTERIOR.minZ + 0.55]} material={MATERIALS.darkWood} />
      <Box min={[-4.58, floorY + 0.9, INTERIOR.minZ]} max={[2.03, floorY + 0.94, INTERIOR.minZ + 0.58]} material={MATERIALS.marble} />
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i}>
          <Box position={[-4.55 + (i + 0.5) * (6.55 / 8), floorY + 0.45, INTERIOR.minZ + 0.56]} size={[6.55 / 8 - 0.06, 0.74, 0.02]} material={MATERIALS.walnut} />
          <Box position={[-4.55 + (i + 0.5) * (6.55 / 8) + 0.28, floorY + 0.6, INTERIOR.minZ + 0.58]} size={[0.015, 0.1, 0.02]} material={MATERIALS.brass} cast={false} />
        </group>
      ))}
      {/* Patisserie dome with croissants, at the far end of the counter */}
      <group position={[C.minX + 0.3, COUNTER_TOP, -5.95]}>
        <mesh material={MATERIALS.ceramic} position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.05, 0.12, 16]} />
        </mesh>
        <mesh material={MATERIALS.ceramic} position={[0, 0.125, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.16, 0.012, 32]} />
        </mesh>
        {CROISSANT_SPOTS.map(([x, y, z, r]) => (
          <group key={r} position={[x, 0.132 + y, z]} rotation={[0, r, 0]}>
            <Croissant />
          </group>
        ))}
        <mesh material={GLASS_DOME} position={[0, 0.13, 0]} renderOrder={2}>
          <sphereGeometry args={[0.16, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={MATERIALS.brass} position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.018, 12, 8]} />
        </mesh>
      </group>
      {/* Napkin holder + sugar jar near the register */}
      <group position={[0.25, COUNTER_TOP, -5.8]}>
        <Box position={[0, 0.05, 0]} size={[0.12, 0.1, 0.06]} material={MATERIALS.chrome} />
        <Box position={[0, 0.07, 0]} size={[0.11, 0.1, 0.045]} material={MATERIALS.linen} cast={false} />
        <mesh material={MATERIALS.ceramicSage} position={[-0.17, 0.05, 0.02]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 20]} />
        </mesh>
        <mesh material={MATERIALS.brass} position={[-0.17, 0.105, 0.02]}>
          <sphereGeometry args={[0.03, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      <CashRegister />
      <ServingTray />
      <CoffeeBeans />
      <group position={GRINDER_POS}>{grinder}</group>
      {machine}
    </group>
  )
}

