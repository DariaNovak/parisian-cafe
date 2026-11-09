import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { CircleGeometry, Color, ExtrudeGeometry, Group, InstancedMesh, MeshStandardMaterial, Object3D, Shape } from 'three'
import { useCafeStore } from '../app/store/useCafeStore'
import { Interactive } from '../components/three/interactions/Interactive'
import { PALETTE } from '../constants/colors'
import { FONTS } from '../constants/fonts'
import { LAYOUT } from '../constants/layout'
import { MATERIALS } from '../materials'
import { windowGlassMaterial } from '../shaders/glass/glassMaterial'
import { Box } from './primitives'
import { Railings, type RailSpec } from './Railings'
import { damp } from '../utils/math'
import { NO_MERGE } from '../components/three/MergeStatic'

const { floorY, cafe, door, windows, windowSill, windowTop } = LAYOUT
const T = cafe.wallThickness
const SIGN_BOTTOM = 3.3
const GROUND_TOP = cafe.groundHeight

/* ------------------------------------------------------------------ */
/* French shop window: green frame, divided panes, glass.              */
/* ------------------------------------------------------------------ */
function ShopWindow({ minX, maxX }: { minX: number; maxX: number }) {
  const w = maxX - minX
  const cx = (minX + maxX) / 2
  const h = windowTop - windowSill
  const cy = (windowSill + windowTop) / 2
  const bar = 0.07
  const z = -0.08
  const mullions = [-1 / 6, 1 / 6].map((f) => cx + f * w)
  const transomY = windowTop - 0.55
  return (
    <group>
      <mesh position={[cx, cy, z]} material={windowGlassMaterial} renderOrder={2}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* Outer frame */}
      <Box position={[cx, windowTop - bar / 2, z]} size={[w, bar, 0.1]} material={MATERIALS.frameGreen} />
      <Box position={[cx, windowSill + bar / 2, z]} size={[w, bar, 0.1]} material={MATERIALS.frameGreen} />
      <Box position={[minX + bar / 2, cy, z]} size={[bar, h, 0.1]} material={MATERIALS.frameGreen} />
      <Box position={[maxX - bar / 2, cy, z]} size={[bar, h, 0.1]} material={MATERIALS.frameGreen} />
      {/* Transom bar + mullions */}
      <Box position={[cx, transomY, z]} size={[w, 0.05, 0.08]} material={MATERIALS.frameGreen} />
      {mullions.map((x) => (
        <Box key={x} position={[x, cy, z]} size={[0.045, h, 0.08]} material={MATERIALS.frameGreen} />
      ))}
      {/* Small upper panes: six divisions above the transom */}
      {[-1 / 3, 0, 1 / 3].map((f) => (
        <Box key={f} position={[cx + f * w, (transomY + windowTop) / 2, z]} size={[0.03, 0.55, 0.06]} material={MATERIALS.frameGreen} />
      ))}
      {/* Stone sill with a flower box below */}
      <Box position={[cx, windowSill - 0.03, 0.06]} size={[w + 0.2, 0.06, 0.36]} material={MATERIALS.trimCream} />
      <Box position={[cx, windowSill - 0.22, 0.28]} size={[w - 0.3, 0.26, 0.28]} material={MATERIALS.terracotta} />
      {/* Lower raised panel under the window */}
      <Box position={[cx, windowSill / 2 + 0.02, 0.012]} size={[w - 0.3, windowSill - 0.3, 0.03]} material={MATERIALS.frameGreen} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Double entrance door, hinged on both jambs, opens inward.           */
/* ------------------------------------------------------------------ */
function DoorLeaf({ side }: { side: -1 | 1 }) {
  const w = door.halfWidth
  const h = door.height - floorY
  const s = 0.06
  // Leaf geometry is built extending from the hinge toward the centre (x: 0 → side*-w).
  const dir = -side
  const x = (v: number) => dir * v
  return (
    <group>
      <Box position={[x(w / 2), h / 2, 0]} size={[w, h, 0.05]} material={MATERIALS.frameGreen} />
      {/* Glazed upper part with muntins */}
      <mesh position={[x(w / 2), h * 0.62, 0.03]} material={windowGlassMaterial} renderOrder={2}>
        <planeGeometry args={[w - 0.22, h * 0.58]} />
      </mesh>
      <Box position={[x(w / 2), h * 0.62, 0.01]} size={[w - 0.22, h * 0.58, 0.02]} material={MATERIALS.darkGlass} cast={false} />
      {/* Cross muntins dividing the glazing into four panes */}
      <Box position={[x(w / 2), h * 0.62, 0.035]} size={[w - 0.22, s * 0.5, 0.03]} material={MATERIALS.frameGreen} />
      <Box position={[x(w / 2), h * 0.62, 0.035]} size={[s * 0.5, h * 0.58, 0.03]} material={MATERIALS.frameGreen} />
      {/* Raised lower panel + brass push plate and handle */}
      <Box position={[x(w / 2), h * 0.17, 0.03]} size={[w - 0.2, h * 0.22, 0.02]} material={MATERIALS.darkWood} />
      <Box position={[x(w - 0.09), h * 0.48, 0.05]} size={[0.025, 0.3, 0.025]} material={MATERIALS.brass} />
    </group>
  )
}

function EntranceDoor() {
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const toggleDoor = useCafeStore((s) => s.toggleDoor)
  const angle = useRef(0)

  useFrame((_, dt) => {
    // Read store imperatively: animating the door never re-renders React.
    const target = useCafeStore.getState().doorOpen ? 1.35 : 0
    angle.current = damp(angle.current, target, 3.2, dt)
    if (left.current) left.current.rotation.y = angle.current
    if (right.current) right.current.rotation.y = -angle.current
  })

  return (
    <Interactive label="Open / close the door" onSelect={toggleDoor}>
      <group ref={left} position={[-door.halfWidth, floorY, -0.12]}>
        <DoorLeaf side={-1} />
      </group>
      <group ref={right} position={[door.halfWidth, floorY, -0.12]}>
        <DoorLeaf side={1} />
      </group>
    </Interactive>
  )
}

/* ------------------------------------------------------------------ */
/* Striped awning with scalloped valance.                              */
/* ------------------------------------------------------------------ */
const AWNING = { minX: -5.65, maxX: 5.65, backY: 3.22, frontY: 2.62, frontZ: 2.3 }
/** Support arm end points (facade bracket → front rail). */
const ARM = { y0: 2.45, z0: 0.04, y1: AWNING.frontY - 0.03, z1: AWNING.frontZ - 0.06 }

function Scallops() {
  const ref = useRef<InstancedMesh>(null)
  const width = AWNING.maxX - AWNING.minX
  const n = 32
  const geo = useMemo(() => new CircleGeometry(width / n / 2, 16, Math.PI, Math.PI), [width])
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: 2 }), [])
  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    const o = new Object3D()
    const pink = new Color('#E3A9B1'), cream = new Color('#F7EFE4')
    for (let i = 0; i < n; i++) {
      o.position.set(AWNING.minX + (i + 0.5) * (width / n), AWNING.frontY - 0.24, AWNING.frontZ)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
      im.setColorAt(i, i % 2 ? cream : pink)
    }
    im.instanceMatrix.needsUpdate = true
    im.computeBoundingSphere()
  }, [width])
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow />
}

function Awning() {
  const width = AWNING.maxX - AWNING.minX
  const dz = AWNING.frontZ
  const dy = AWNING.backY - AWNING.frontY
  const len = Math.hypot(dz, dy)
  const tilt = Math.atan2(dy, dz)
  return (
    <group>
      <mesh position={[0, (AWNING.backY + AWNING.frontY) / 2, dz / 2]} rotation={[-Math.PI / 2 + tilt, 0, 0]} material={MATERIALS.awning} castShadow receiveShadow>
        <planeGeometry args={[width, len]} />
      </mesh>
      {/* Front valance (same stripes) */}
      <mesh position={[0, AWNING.frontY - 0.12, AWNING.frontZ]} material={MATERIALS.awning} castShadow>
        <planeGeometry args={[width, 0.24]} />
      </mesh>
      <Scallops />
      {/* Iron support arms: from the facade up to the front rail, just under the canvas */}
      {[AWNING.minX + 0.05, 0, AWNING.maxX - 0.05].map((x) => (
        <mesh key={x} position={[x, (ARM.y0 + ARM.y1) / 2, (ARM.z0 + ARM.z1) / 2]} rotation={[Math.atan2(ARM.z1 - ARM.z0, ARM.y1 - ARM.y0), 0, 0]} material={MATERIALS.balconyIron} castShadow>
          <cylinderGeometry args={[0.014, 0.014, Math.hypot(ARM.z1 - ARM.z0, ARM.y1 - ARM.y0), 6]} />
        </mesh>
      ))}
      <Box position={[0, AWNING.backY + 0.03, 0.06]} size={[width + 0.1, 0.1, 0.12]} material={MATERIALS.frameGreen} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Upper-floor French window with curtains and stone surround.         */
/* ------------------------------------------------------------------ */
const INTERIOR_DARK = new MeshStandardMaterial({ color: '#3B2E26', roughness: 1 })

export function UpperWindow({ x, y, w = 1.0, h = 2.0, curtain = MATERIALS.linen }: { x: number; y: number; w?: number; h?: number; curtain?: MeshStandardMaterial }) {
  return (
    <group position={[x, y + h / 2, 0]}>
      <Box position={[0, 0, 0.005]} size={[w, h, 0.01]} material={INTERIOR_DARK} cast={false} />
      <Box position={[-w * 0.36, 0, 0.012]} size={[w * 0.26, h * 0.96, 0.01]} material={curtain} cast={false} />
      <Box position={[w * 0.36, 0, 0.012]} size={[w * 0.26, h * 0.96, 0.01]} material={curtain} cast={false} />
      <mesh position={[0, 0, 0.03]} material={windowGlassMaterial} renderOrder={2}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <Box position={[0, 0, 0.035]} size={[0.04, h, 0.03]} material={MATERIALS.frameGreen} cast={false} />
      {[-0.2, 0.15].map((f) => (
        <Box key={f} position={[0, f * h, 0.035]} size={[w, 0.03, 0.03]} material={MATERIALS.frameGreen} cast={false} />
      ))}
      {/* Surround, keystone lintel, sill */}
      <Box position={[0, h / 2 + 0.08, 0.03]} size={[w + 0.32, 0.16, 0.08]} material={MATERIALS.trimCream} />
      <Box position={[0, h / 2 + 0.12, 0.06]} size={[0.18, 0.24, 0.1]} material={MATERIALS.trimCream} />
      <Box position={[-w / 2 - 0.08, 0, 0.025]} size={[0.16, h, 0.06]} material={MATERIALS.trimCream} />
      <Box position={[w / 2 + 0.08, 0, 0.025]} size={[0.16, h, 0.06]} material={MATERIALS.trimCream} />
    </group>
  )
}

const UPPER_X = [-4.2, -1.4, 1.4, 4.2]
const FLOOR1_Y = 4.75
const FLOOR2_Y = 7.75
const ROOF_Y = 10.6

function UpperFloors() {
  const rails = useMemo<RailSpec[]>(
    () => [
      ...UPPER_X.map((x) => ({ x0: x - 0.6, x1: x + 0.6, y: FLOOR1_Y, z: 0.32, height: 0.95 })),
      { x0: -5.8, x1: 5.8, y: FLOOR2_Y, z: 0.55, height: 0.95 },
    ],
    [],
  )
  return (
    <group>
      {/* Building mass above the café */}
      <Box min={[cafe.minX, GROUND_TOP, cafe.minZ]} max={[cafe.maxX, ROOF_Y, -0.02]} material={MATERIALS.facadeUpper} />
      {/* Cornices */}
      <Box min={[cafe.minX - 0.05, GROUND_TOP, -0.3]} max={[cafe.maxX + 0.05, GROUND_TOP + 0.16, 0.3]} material={MATERIALS.trimCream} />
      <Box min={[cafe.minX, FLOOR2_Y - 0.14, -0.1]} max={[cafe.maxX, FLOOR2_Y, 0.62]} material={MATERIALS.trimCream} />
      <Box min={[cafe.minX - 0.1, ROOF_Y, -0.3]} max={[cafe.maxX + 0.1, ROOF_Y + 0.22, 0.42]} material={MATERIALS.trimCream} />
      {UPPER_X.map((x, i) => (
        <group key={x}>
          <UpperWindow x={x} y={FLOOR1_Y + 0.08} curtain={i % 2 ? MATERIALS.fabricPink : MATERIALS.linen} />
          <UpperWindow x={x} y={FLOOR2_Y + 0.12} curtain={i % 2 ? MATERIALS.linen : MATERIALS.fabricSage} />
          {/* Balconnet slab */}
          <Box position={[x, FLOOR1_Y + 0.02, 0.18]} size={[1.3, 0.08, 0.38]} material={MATERIALS.trimCream} />
        </group>
      ))}
      <Railings rails={rails} />
      <MansardRoof />
    </group>
  )
}

function MansardRoof() {
  const geo = useMemo(() => {
    const s = new Shape()
    // Profile in (depth, height); extruded along the facade width.
    s.moveTo(-0.35, ROOF_Y + 0.2)
    s.lineTo(1.0, ROOF_Y + 2.3)
    s.lineTo(8, ROOF_Y + 2.3)
    s.lineTo(8, ROOF_Y + 0.2)
    s.closePath()
    return new ExtrudeGeometry(s, { depth: 12, bevelEnabled: false })
  }, [])
  return (
    <group>
      <mesh geometry={geo} material={MATERIALS.roofZinc} position={[-6, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
      {[-3.6, 0, 3.6].map((x) => (
        <group key={x} position={[x, ROOF_Y + 1.15, -0.25]}>
          <Box position={[0, 0, -0.2]} size={[1.1, 1.4, 1.0]} material={MATERIALS.trimCream} />
          <UpperWindow x={0} y={-0.55} w={0.6} h={1.05} />
          <mesh position={[0, 0.85, -0.2]} rotation={[0, 0, 0]} material={MATERIALS.roofZinc} castShadow>
            <cylinderGeometry args={[0.72, 0.72, 1.05, 3, 1, false, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
      {[-4.9, 4.4].map((x) => (
        <group key={x} position={[x, ROOF_Y + 2.3, -3.5]}>
          <Box position={[0, 0.45, 0]} size={[0.9, 0.9, 0.5]} material={MATERIALS.chimney} />
          {[-0.25, 0, 0.25].map((dx) => (
            <mesh key={dx} position={[dx, 1.05, 0]} material={MATERIALS.terracotta} castShadow>
              <cylinderGeometry args={[0.07, 0.09, 0.3, 10]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Signage: painted fascia board + hanging blade sign.                 */
/* ------------------------------------------------------------------ */
function Signage() {
  const blade = useRef<Group>(null)
  // The hanging sign sways gently on its hooks in the breeze.
  useFrame((state) => {
    if (blade.current) blade.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.3) * 0.05 + Math.sin(state.clock.elapsedTime * 2.9) * 0.015
  })
  return (
    <group>
      <Box min={[cafe.minX, SIGN_BOTTOM, -T]} max={[cafe.maxX, GROUND_TOP, 0.12]} material={MATERIALS.frameGreen} />
      <Box position={[0, (SIGN_BOTTOM + GROUND_TOP) / 2, 0.125]} size={[8.6, 0.72, 0.01]} material={MATERIALS.brass} cast={false} />
      <Box position={[0, (SIGN_BOTTOM + GROUND_TOP) / 2, 0.13]} size={[8.5, 0.64, 0.01]} material={MATERIALS.frameGreen} cast={false} />
      <Text font={FONTS.serif} fontSize={0.42} letterSpacing={0.06} color={PALETTE.gold} anchorX="center" anchorY="middle" position={[0, 3.8, 0.14]} material-toneMapped={false}>
        PARISIAN CAFÉ
      </Text>
      <Text font={FONTS.serifItalic} fontSize={0.15} color={PALETTE.cream} anchorX="center" anchorY="middle" position={[0, 3.5, 0.14]}>
        café · pâtisserie · salon de thé — depuis 1926
      </Text>
      {/* Hanging blade sign */}
      <group position={[5.65, 3.0, 0]}>
        <Box position={[0, 0, 0.42]} size={[0.03, 0.03, 0.85]} material={MATERIALS.balconyIron} />
        <group ref={blade} position={[0, -0.03, 0.55]} userData={NO_MERGE}>
        <group position={[0, 0.03, -0.55]}>
        <mesh position={[0, -0.36, 0.55]} rotation={[0, Math.PI / 2, 0]} material={MATERIALS.frameGreen} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
        </mesh>
        <mesh position={[0, -0.36, 0.55]} rotation={[0, Math.PI / 2, Math.PI / 2]} material={MATERIALS.brass}>
          <torusGeometry args={[0.3, 0.02, 8, 32]} />
        </mesh>
        {[-1, 1].map((s) => (
          <Text key={s} font={FONTS.serifItalic} fontSize={0.16} color={PALETTE.gold} position={[s * 0.03, -0.36, 0.55]} rotation={[0, (s * Math.PI) / 2, 0]} anchorX="center" anchorY="middle">
            Café
          </Text>
        ))}
        {[-0.2, 0.2].map((dz) => (
          <Box key={dz} position={[0, -0.03, 0.55 + dz]} size={[0.01, 0.06, 0.01]} material={MATERIALS.balconyIron} cast={false} />
        ))}
        </group>
        </group>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Assembled building.                                                 */
/* ------------------------------------------------------------------ */
export function CafeBuilding() {
  const w0 = windows[0], w1 = windows[1]
  return (
    <group>
      {/* Ground-floor piers and wall segments around the openings */}
      <Box min={[cafe.minX, 0, -T]} max={[w0.minX, SIGN_BOTTOM, 0]} material={MATERIALS.facadeStone} />
      <Box min={[w0.maxX, 0, -T]} max={[-door.halfWidth, SIGN_BOTTOM, 0]} material={MATERIALS.facadeStone} />
      <Box min={[door.halfWidth, 0, -T]} max={[w1.minX, SIGN_BOTTOM, 0]} material={MATERIALS.facadeStone} />
      <Box min={[w1.maxX, 0, -T]} max={[cafe.maxX, SIGN_BOTTOM, 0]} material={MATERIALS.facadeStone} />
      {windows.map((w) => (
        <group key={w.minX}>
          <Box min={[w.minX, 0, -T]} max={[w.maxX, windowSill, 0]} material={MATERIALS.facadeStone} />
          <Box min={[w.minX, windowTop, -T]} max={[w.maxX, SIGN_BOTTOM, 0]} material={MATERIALS.frameGreen} />
          <ShopWindow minX={w.minX} maxX={w.maxX} />
        </group>
      ))}
      {/* Door lintel with fanlight, and the stone threshold */}
      <Box min={[-door.halfWidth, door.height, -T]} max={[door.halfWidth, SIGN_BOTTOM, 0]} material={MATERIALS.frameGreen} />
      <Box min={[-door.halfWidth - 0.15, 0, -T]} max={[door.halfWidth + 0.15, floorY + 0.03, 0.35]} material={MATERIALS.curb} />
      {/* Pilasters framing the storefront */}
      {[cafe.minX + 0.18, -door.halfWidth - 0.12, door.halfWidth + 0.12, cafe.maxX - 0.18].map((x) => (
        <Box key={x} position={[x, SIGN_BOTTOM / 2, 0.04]} size={[0.24, SIGN_BOTTOM, 0.08]} material={MATERIALS.frameGreen} />
      ))}
      <EntranceDoor />
      <Signage />
      <Awning />
      <UpperFloors />
    </group>
  )
}
