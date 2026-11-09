import { forwardRef, useImperativeHandle, useRef } from 'react'
import { LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type Group, type Mesh } from 'three'
import { MATERIALS } from '../materials'
import { Box } from './primitives'
import { MergeStatic, NO_MERGE } from '../components/three/MergeStatic'

/** Machine-local anchor points (origin = counter top under the machine, facing +Z). */
export const MACHINE = {
  brewGroupX: -0.13,
  spoutY: 0.178,
  cupSpot: [-0.13, 0.068, 0.23] as [number, number, number],
  /** On the counter in front of the machine: milk is poured and art is drawn here. */
  pourSpot: [0.02, 0.0, 0.4] as [number, number, number],
  wandTip: [0.33, 0.14, 0.25] as [number, number, number],
  pitcherRest: [0.5, 0, 0.1] as [number, number, number],
  traySpot: [0, 0.068, 0.2] as [number, number, number],
}

export const LACQUER = new MeshPhysicalMaterial({ color: '#E3A9B1', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 })
const GAUGE_FACE = new MeshStandardMaterial({ color: '#FBF4EA', roughness: 0.5 })
const NEEDLE = new MeshStandardMaterial({ color: '#B23A3A', roughness: 0.4 })
const BTN_GREEN = new MeshStandardMaterial({ color: '#A8B5A0', roughness: 0.35, emissive: '#5E7F55', emissiveIntensity: 0 })
const BTN_CREAM = new MeshStandardMaterial({ color: '#F5EBDD', roughness: 0.35, emissive: '#FFD9A0', emissiveIntensity: 0 })
export const PILOT_LIGHT = new MeshStandardMaterial({ color: '#FFB867', emissive: '#FF9A3C', emissiveIntensity: 0.4 })
export const BUTTON_MATERIALS = { brew: BTN_GREEN, steam: BTN_CREAM }

export const PITCHER_GEO = new LatheGeometry([[0, 0], [0.038, 0], [0.042, 0.01], [0.04, 0.07], [0.034, 0.1], [0.036, 0.11], [0.033, 0.112], [0, 0.112]].map(([r, y]) => new Vector2(r, y)), 28)

/** Refs to all animated sub-parts, consumed by the brewing animation. */
export interface MachineParts {
  root: Group | null
  brewButton: Mesh | null
  steamButton: Mesh | null
  needle: Group | null
  portafilter: Group | null
  wand: Group | null
  pitcher: Group | null
  streams: Array<Mesh | null>
  milkStream: Mesh | null
}

export const EspressoMachine = forwardRef<MachineParts>(function EspressoMachine(_, ref) {
  const root = useRef<Group>(null)
  const brewButton = useRef<Mesh>(null)
  const steamButton = useRef<Mesh>(null)
  const needle = useRef<Group>(null)
  const portafilter = useRef<Group>(null)
  const wand = useRef<Group>(null)
  const pitcher = useRef<Group>(null)
  const streamA = useRef<Mesh>(null)
  const streamB = useRef<Mesh>(null)
  const milkStream = useRef<Mesh>(null)

  useImperativeHandle(ref, () => ({
    get root() { return root.current },
    get brewButton() { return brewButton.current },
    get steamButton() { return steamButton.current },
    get needle() { return needle.current },
    get portafilter() { return portafilter.current },
    get wand() { return wand.current },
    get pitcher() { return pitcher.current },
    get streams() { return [streamA.current, streamB.current] },
    get milkStream() { return milkStream.current },
  }))

  return (
    <group ref={root}>
      <MergeStatic>
      {/* Feet and body */}
      {[-0.28, 0.28].flatMap((x) => [-0.17, 0.17].map((z) => (
        <mesh key={`${x}${z}`} material={MATERIALS.brass} position={[x, 0.02, z]}>
          <cylinderGeometry args={[0.02, 0.025, 0.04, 12]} />
        </mesh>
      )))}
      <Box position={[0, 0.245, 0]} size={[0.66, 0.41, 0.44]} material={LACQUER} />
      <Box position={[0, 0.06, 0]} size={[0.68, 0.04, 0.46]} material={MATERIALS.steel} />
      <Box position={[0, 0.462, 0]} size={[0.69, 0.025, 0.47]} material={MATERIALS.steel} />
      {/* Cup rail and warming cups on top */}
      {[-0.22, 0.22].map((z) => (
        <Box key={z} position={[0, 0.51, z]} size={[0.64, 0.012, 0.012]} material={MATERIALS.chrome} cast={false} />
      ))}
      {[-0.3, 0.3].map((x) => (
        <Box key={x} position={[x, 0.49, 0]} size={[0.012, 0.04, 0.45]} material={MATERIALS.chrome} cast={false} />
      ))}
      <mesh material={MATERIALS.brass} position={[0, 0.475, -0.02]} castShadow>
        <sphereGeometry args={[0.11, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={MATERIALS.brass} position={[0, 0.6, -0.02]}>
        <sphereGeometry args={[0.025, 14, 10]} />
      </mesh>
      {/* Chrome front fascia with brass trim */}
      <Box position={[0, 0.37, 0.222]} size={[0.62, 0.13, 0.01]} material={MATERIALS.steel} cast={false} />
      <Box position={[0, 0.3, 0.222]} size={[0.66, 0.012, 0.012]} material={MATERIALS.brass} cast={false} />
      {/* Pressure gauge */}
      <group position={[0, 0.37, 0.23]}>
        <mesh rotation-x={Math.PI / 2} material={MATERIALS.brass}>
          <torusGeometry args={[0.042, 0.007, 8, 32]} />
        </mesh>
        <mesh material={GAUGE_FACE} position={[0, 0, 0.001]}>
          <circleGeometry args={[0.04, 32]} />
        </mesh>
        <group ref={needle} userData={NO_MERGE} position={[0, 0, 0.004]} rotation={[0, 0, 2.2]}>
          <Box position={[0, 0.016, 0]} size={[0.003, 0.034, 0.002]} material={NEEDLE} cast={false} />
        </group>
      </group>
      {/* Buttons (brew = left, steam = right) and pilot light */}
      <mesh ref={brewButton} userData={NO_MERGE} material={BTN_GREEN} position={[-0.21, 0.37, 0.232]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, 0.016, 20]} />
      </mesh>
      <mesh ref={steamButton} userData={NO_MERGE} material={BTN_CREAM} position={[0.21, 0.37, 0.232]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, 0.016, 20]} />
      </mesh>
      <mesh material={PILOT_LIGHT} position={[-0.27, 0.37, 0.229]}>
        <sphereGeometry args={[0.007, 10, 8]} />
      </mesh>
      {/* Two group heads; the left one has the working portafilter */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} material={MATERIALS.steel} position={[x, 0.25, 0.25]} castShadow>
          <cylinderGeometry args={[0.048, 0.04, 0.06, 24]} />
        </mesh>
      ))}
      {[-0.13, 0.13].map((x, i) => (
        <group key={x} ref={i === 0 ? portafilter : undefined} userData={i === 0 ? NO_MERGE : undefined} position={[x, 0.205, 0.25]}>
          <mesh material={MATERIALS.steel} castShadow>
            <cylinderGeometry args={[0.042, 0.036, 0.03, 24]} />
          </mesh>
          <mesh material={MATERIALS.chrome} position={[0, -0.002, 0.08]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.008, 0.01, 0.09, 10]} />
          </mesh>
          <mesh material={MATERIALS.darkWood} position={[0, -0.004, 0.16]} rotation-x={Math.PI / 2} castShadow>
            <capsuleGeometry args={[0.014, 0.07, 6, 12]} />
          </mesh>
          {[-0.012, 0.012].map((sx) => (
            <mesh key={sx} material={MATERIALS.chrome} position={[sx, -0.022, 0]}>
              <cylinderGeometry args={[0.004, 0.005, 0.016, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Espresso streams (scaled in Y while brewing; unit height, top-anchored) */}
      {[-0.012, 0.012].map((sx, i) => (
        <mesh key={sx} ref={i === 0 ? streamA : streamB} userData={NO_MERGE} material={MATERIALS.coffeeBean} position={[MACHINE.brewGroupX + sx, MACHINE.spoutY, 0.25]} scale={[1, 0.0001, 1]} visible={false}>
          <cylinderGeometry args={[0.0022, 0.0016, 1, 6]} />
        </mesh>
      ))}
      {/* Drip tray with grill */}
      <Box position={[0, 0.052, 0.2]} size={[0.62, 0.03, 0.2]} material={MATERIALS.steel} />
      {Array.from({ length: 9 }, (_, i) => (
        <Box key={i} position={[-0.26 + i * 0.065, 0.068, 0.2]} size={[0.008, 0.004, 0.18]} material={MATERIALS.iron} cast={false} />
      ))}
      {/* Steam wand on a ball joint */}
      <group ref={wand} userData={NO_MERGE} position={[0.3, 0.32, 0.2]} rotation={[0, 0, 0.15]}>
        <mesh material={MATERIALS.chrome}>
          <sphereGeometry args={[0.016, 12, 10]} />
        </mesh>
        <mesh material={MATERIALS.chrome} position={[0.01, -0.09, 0.02]} rotation={[0.25, 0, 0.12]}>
          <cylinderGeometry args={[0.006, 0.006, 0.19, 8]} />
        </mesh>
        <mesh material={MATERIALS.darkWood} position={[0.003, -0.03, 0.005]} rotation={[0.25, 0, 0.12]}>
          <cylinderGeometry args={[0.011, 0.011, 0.05, 10]} />
        </mesh>
      </group>
      <mesh material={MATERIALS.brass} position={[0.33, 0.42, 0.23]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.022, 0.022, 0.03, 14]} />
      </mesh>
      {/* Milk pitcher (moves under the wand, then pours) */}
      <group ref={pitcher} userData={NO_MERGE} position={MACHINE.pitcherRest}>
        <mesh geometry={PITCHER_GEO} material={MATERIALS.steel} castShadow />
        <mesh material={MATERIALS.milk} position={[0, 0.085, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.036, 24]} />
        </mesh>
        <mesh material={MATERIALS.chrome} position={[0.052, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.025, 0.005, 6, 14, Math.PI]} />
        </mesh>
        <mesh material={MATERIALS.chrome} position={[-0.04, 0.108, 0]} rotation={[0, 0, 0.6]}>
          <coneGeometry args={[0.012, 0.025, 10, 1, true]} />
        </mesh>
      </group>
      <mesh ref={milkStream} userData={NO_MERGE} material={MATERIALS.milk} visible={false}>
        <cylinderGeometry args={[0.004, 0.003, 1, 8]} />
      </mesh>
      </MergeStatic>
    </group>
  )
})
