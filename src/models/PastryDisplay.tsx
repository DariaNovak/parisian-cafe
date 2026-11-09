import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, PointLight } from 'three'
import { useCafeStore } from '../app/store/useCafeStore'
import { Interactive } from '../components/three/interactions/Interactive'
import { LAYOUT } from '../constants/layout'
import { DESSERTS, type DessertId } from '../features/desserts/dessertsConfig'
import { useDessertStore } from '../features/desserts/useDessertStore'
import { MATERIALS } from '../materials'
import { displayGlassMaterial } from '../shaders/glass/glassMaterial'
import { damp } from '../utils/math'
import { Croissant, Eclair, MACARON_COLORS, Macaron, StrawberryCake } from './Desserts'
import { Box } from './primitives'
import { MergeStatic, NO_MERGE } from '../components/three/MergeStatic'

const D = LAYOUT.display
const BASE_TOP = LAYOUT.floorY + D.baseHeight
const BACK_Z = D.frontZ - D.depth
const CENTER_Z = D.frontZ - D.depth / 2
const SHELF_Y = BASE_TOP + 0.34
const TOP_Y = BASE_TOP + D.glassHeight

/** Section layout inside the cabinet: which dessert sits where. */
const SECTIONS: Array<{ id: DessertId; x0: number; x1: number; y: number }> = [
  { id: 'croissant', x0: D.minX + 0.1, x1: (D.minX + D.maxX) / 2, y: BASE_TOP },
  { id: 'strawberry', x0: (D.minX + D.maxX) / 2, x1: D.maxX - 0.1, y: BASE_TOP },
  { id: 'macaron', x0: D.minX + 0.1, x1: (D.minX + D.maxX) / 2, y: SHELF_Y },
  { id: 'chocolate', x0: (D.minX + D.maxX) / 2, x1: D.maxX - 0.1, y: SHELF_Y },
]

/** Grid positions for `cols × rows` items inside a section tray (x across, z front-to-back). */
function grid(cols: number, rows: number, width: number, depth: number) {
  const out: Array<[number, number, number]> = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push([((c + 0.5) / cols - 0.5) * width * 0.86, 0, ((r + 0.5) / rows - 0.5) * depth])
  return out
}

function SectionContents({ id, width }: { id: DessertId; width: number }) {
  switch (id) {
    case 'croissant':
      return grid(4, 2, width, 0.36).map((p, i) => (
        <group key={i} position={p} rotation={[0, (i % 2 ? 0.4 : -0.3) + Math.floor(i / 4) * Math.PI, 0]} scale={1.15}>
          <Croissant />
        </group>
      ))
    case 'strawberry':
      return grid(4, 2, width, 0.3).map((p, i) => (
        <group key={i} position={p} scale={1.15}>
          <StrawberryCake />
        </group>
      ))
    case 'macaron':
      return grid(7, 3, width, 0.36).map((p, i) => (
        <group key={i} position={p} rotation={[0, 0, i % 3 === 1 ? 0.35 : 0]} scale={1.3}>
          <Macaron color={MACARON_COLORS[i % MACARON_COLORS.length]} />
        </group>
      ))
    case 'chocolate':
      return grid(5, 3, width, 0.36).map((p, i) => (
        <group key={i} position={p} rotation={[0, Math.PI / 2, 0]} scale={1.2}>
          <Eclair />
        </group>
      ))
  }
}

/** One dessert section: clickable, lifts and glows gently when selected. */
function Section({ id, x0, x1, y }: (typeof SECTIONS)[number]) {
  const group = useRef<Group>(null)
  const select = useDessertStore((s) => s.select)
  const openPanel = useCafeStore((s) => s.openPanel)
  const goToView = useCafeStore((s) => s.goToView)
  const width = x1 - x0

  useFrame((state, dt) => {
    if (!group.current) return
    const selected = useDessertStore.getState().selected === id
    const t = state.clock.elapsedTime
    group.current.position.y = damp(group.current.position.y, selected ? 0.025 + Math.sin(t * 2.4) * 0.006 : 0, 6, dt)
  })

  return (
    <Interactive
      label={`${DESSERTS[id].label} — tap to choose`}
      onSelect={() => {
        select(id)
        openPanel('desserts')
        goToView('pastry')
      }}
    >
      <group position={[(x0 + x1) / 2, y, CENTER_Z]}>
        {/* Linen-lined serving tray with a brass lip */}
        <Box position={[0, 0.004, 0]} size={[width * 0.94, 0.008, 0.5]} material={MATERIALS.linen} cast={false} />
        <Box position={[0, 0.01, 0.25]} size={[width * 0.94, 0.02, 0.008]} material={MATERIALS.brass} cast={false} />
        <group ref={group}>
          {/* Dozens of small pastry meshes batched into a few draw calls; they lift together. */}
          <MergeStatic>
            <SectionContents id={id} width={width} />
          </MergeStatic>
        </group>
      </group>
    </Interactive>
  )
}

/** Glass display cabinet with a sliding rear service door. */
export function PastryDisplay() {
  const door = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  useFrame((_, dt) => {
    const open = useCafeStore.getState().panel === 'desserts'
    if (door.current) door.current.position.x = damp(door.current.position.x, open ? -(D.maxX - D.minX) * 0.42 : 0, 4, dt)
    if (light.current) light.current.intensity = damp(light.current.intensity, open ? 1.6 : 0.9, 4, dt)
  })
  const cx = (D.minX + D.maxX) / 2
  const w = D.maxX - D.minX
  return (
    <group>
      {/* Cabinet base: walnut with panels and brass kick plate */}
      <Box min={[D.minX, LAYOUT.floorY, BACK_Z]} max={[D.maxX, BASE_TOP, D.frontZ]} material={MATERIALS.darkWood} />
      {[0.25, 0.75].map((f) => (
        <Box key={f} position={[D.minX + w * f, LAYOUT.floorY + D.baseHeight / 2, D.frontZ + 0.012]} size={[w * 0.44, D.baseHeight * 0.62, 0.025]} material={MATERIALS.walnut} />
      ))}
      <Box position={[cx, LAYOUT.floorY + 0.06, D.frontZ + 0.02]} size={[w, 0.1, 0.03]} material={MATERIALS.brass} cast={false} />
      <Box min={[D.minX - 0.02, BASE_TOP - 0.02, BACK_Z - 0.02]} max={[D.maxX + 0.02, BASE_TOP + 0.012, D.frontZ + 0.03]} material={MATERIALS.marble} />
      {/* Glass shelf and case */}
      <Box min={[D.minX + 0.05, SHELF_Y - 0.008, BACK_Z + 0.05]} max={[D.maxX - 0.05, SHELF_Y, D.frontZ - 0.05]} material={displayGlassMaterial} cast={false} />
      <mesh position={[cx, (BASE_TOP + TOP_Y) / 2, D.frontZ - 0.02]} material={displayGlassMaterial} renderOrder={3}>
        <planeGeometry args={[w - 0.04, D.glassHeight]} />
      </mesh>
      {[D.minX + 0.02, D.maxX - 0.02].map((x) => (
        <mesh key={x} position={[x, (BASE_TOP + TOP_Y) / 2, CENTER_Z]} rotation={[0, Math.PI / 2, 0]} material={displayGlassMaterial} renderOrder={3}>
          <planeGeometry args={[D.depth - 0.04, D.glassHeight]} />
        </mesh>
      ))}
      <mesh position={[cx, TOP_Y, CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]} material={displayGlassMaterial} renderOrder={3}>
        <planeGeometry args={[w - 0.04, D.depth - 0.04]} />
      </mesh>
      {/* Sliding rear door (opens while browsing desserts) */}
      <group position={[0, 0, 0]}>
        <group ref={door} userData={NO_MERGE}>
          <mesh position={[D.minX + w * 0.27, (BASE_TOP + TOP_Y) / 2, BACK_Z + 0.03]} material={displayGlassMaterial} renderOrder={3}>
            <planeGeometry args={[w * 0.5, D.glassHeight - 0.04]} />
          </mesh>
          <Box position={[D.minX + w * 0.5, (BASE_TOP + TOP_Y) / 2, BACK_Z + 0.03]} size={[0.02, D.glassHeight - 0.04, 0.02]} material={MATERIALS.brass} cast={false} />
        </group>
        <mesh position={[D.minX + w * 0.75, (BASE_TOP + TOP_Y) / 2, BACK_Z + 0.015]} material={displayGlassMaterial} renderOrder={3}>
          <planeGeometry args={[w * 0.5, D.glassHeight - 0.04]} />
        </mesh>
      </group>
      {/* Brass frame edges */}
      {[D.minX + 0.01, D.maxX - 0.01].flatMap((x) =>
        [D.frontZ - 0.01, BACK_Z + 0.01].map((z) => <Box key={`${x}${z}`} position={[x, (BASE_TOP + TOP_Y) / 2, z]} size={[0.02, D.glassHeight, 0.02]} material={MATERIALS.brass} cast={false} />),
      )}
      <Box position={[cx, TOP_Y, D.frontZ - 0.01]} size={[w, 0.02, 0.02]} material={MATERIALS.brass} cast={false} />
      <Box position={[cx, TOP_Y, BACK_Z + 0.01]} size={[w, 0.02, 0.02]} material={MATERIALS.brass} cast={false} />
      {/* Warm LED strip under the top */}
      <Box position={[cx, TOP_Y - 0.015, CENTER_Z]} size={[w - 0.1, 0.008, 0.03]} material={MATERIALS.neon} cast={false} />
      <pointLight ref={light} position={[cx, TOP_Y - 0.08, CENTER_Z]} color="#FFD9A0" intensity={0.9} distance={1.6} decay={2} />
      {SECTIONS.map((s) => (
        <Section key={s.id} {...s} />
      ))}
    </group>
  )
}
