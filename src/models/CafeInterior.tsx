import { Text, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, Group, InstancedMesh, LatheGeometry, MeshStandardMaterial, Object3D, Vector2, type AnimationClip } from 'three'
import { PALETTE } from '../constants/colors'
import { FONTS } from '../constants/fonts'
import { INTERIOR, LAYOUT, PENDANTS } from '../constants/layout'
import { MATERIALS } from '../materials'
import { chalkboardTexture, posterTexture } from '../materials/textures'
import { cupGeometry } from './CoffeeCup'
import { ModelSource } from './ModelSource'
import { Box } from './primitives'
import { NO_MERGE } from '../components/three/MergeStatic'

const { floorY } = LAYOUT
const { minX, maxX, minZ, maxZ, ceiling } = INTERIOR
const WAINSCOT = 1.05

/* ------------------------------------------------------------------ */
/* Room shell                                                          */
/* ------------------------------------------------------------------ */
function Shell() {
  return (
    <group>
      {/* Parquet floor */}
      <Box min={[minX, 0, minZ]} max={[maxX, floorY, maxZ]} material={MATERIALS.parquet} cast={false} />
      {/* Walls (outer building walls double as interior walls) */}
      <Box min={[-6, 0, -8]} max={[maxX + 0.15, ceiling + 0.12, minZ]} material={MATERIALS.plaster} />
      <Box min={[-6, 0, -8]} max={[minX, ceiling + 0.12, 0]} material={MATERIALS.plaster} />
      <Box min={[maxX, 0, -8]} max={[6, ceiling + 0.12, 0]} material={MATERIALS.plaster} />
      {/* Ceiling with crown moulding */}
      <Box min={[minX, ceiling, minZ]} max={[maxX, ceiling + 0.12, maxZ]} material={MATERIALS.ceiling} />
      <Box min={[minX, ceiling - 0.1, minZ]} max={[maxX, ceiling, minZ + 0.1]} material={MATERIALS.trimCream} cast={false} />
      <Box min={[minX, ceiling - 0.1, minZ]} max={[minX + 0.1, ceiling, maxZ]} material={MATERIALS.trimCream} cast={false} />
      <Box min={[maxX - 0.1, ceiling - 0.1, minZ]} max={[maxX, ceiling, maxZ]} material={MATERIALS.trimCream} cast={false} />
      {/* Green wainscoting with a cream cap rail and skirting */}
      <Box min={[minX, floorY, minZ]} max={[maxX, WAINSCOT, minZ + 0.03]} material={MATERIALS.wainscot} cast={false} />
      <Box min={[minX, floorY, minZ]} max={[minX + 0.03, WAINSCOT, maxZ]} material={MATERIALS.wainscot} cast={false} />
      <Box min={[maxX - 0.03, floorY, minZ]} max={[maxX, WAINSCOT, maxZ]} material={MATERIALS.wainscot} cast={false} />
      <Box min={[minX, WAINSCOT, minZ]} max={[maxX, WAINSCOT + 0.05, minZ + 0.06]} material={MATERIALS.trimCream} cast={false} />
      <Box min={[minX, WAINSCOT, minZ]} max={[minX + 0.06, WAINSCOT + 0.05, maxZ]} material={MATERIALS.trimCream} cast={false} />
      <Box min={[maxX - 0.06, WAINSCOT, minZ]} max={[maxX, WAINSCOT + 0.05, maxZ]} material={MATERIALS.trimCream} cast={false} />
      {/* Raised wainscot panels on the side walls */}
      {[-6.6, -5.4, -4.2, -3.0, -1.8].map((z) => (
        <group key={z}>
          <Box position={[minX + 0.04, 0.6, z + 0.6]} size={[0.02, 0.6, 0.9]} material={MATERIALS.frameGreen} cast={false} />
          <Box position={[maxX - 0.04, 0.6, z + 0.6]} size={[0.02, 0.6, 0.9]} material={MATERIALS.frameGreen} cast={false} />
        </group>
      ))}
      {/* White métro tiles behind the bar (6.55 m × 2.05 m → 0.6 m tiles) */}
      <Box min={[-4.55, floorY + 0.94, minZ]} max={[2.0, 3.05, minZ + 0.012]} material={MATERIALS.metroTiles} cast={false} />
      <KitchenDoor />
    </group>
  )
}

function KitchenDoor() {
  return (
    <group position={[-5.25, floorY, minZ + 0.04]}>
      <Box position={[0, 1.1, 0]} size={[0.9, 2.2, 0.05]} material={MATERIALS.frameGreen} />
      <Box position={[0, 2.25, 0]} size={[1.05, 0.1, 0.08]} material={MATERIALS.trimCream} />
      <mesh position={[0, 1.55, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={MATERIALS.brass}>
        <torusGeometry args={[0.13, 0.018, 8, 28]} />
      </mesh>
      <mesh position={[0, 1.55, 0.028]} material={MATERIALS.darkGlass}>
        <circleGeometry args={[0.12, 28]} />
      </mesh>
      <Box position={[0, 0.35, 0.03]} size={[0.7, 0.3, 0.012]} material={MATERIALS.brass} cast={false} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Back-bar shelves with instanced cups, jars and bottles              */
/* ------------------------------------------------------------------ */
const SHELF_X0 = -4.5
const SHELF_X1 = 1.7
const SHELF_YS = [1.75, 2.25, 2.75]
const SHELF_Z = minZ + 0.17

const JAR_GEO = new CylinderGeometry(0.06, 0.06, 0.2, 16)
const JAR_FILL_GEO = new CylinderGeometry(0.054, 0.054, 0.13, 14)
const BOTTLE_GEO = new LatheGeometry([[0, 0], [0.035, 0], [0.037, 0.18], [0.03, 0.22], [0.012, 0.25], [0.012, 0.3], [0, 0.3]].map(([r, y]) => new Vector2(r, y)), 14)
const JAR_MAT = new MeshStandardMaterial({ color: '#E8F0EC', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false })
const BOTTLE_MAT = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, transparent: true, opacity: 0.85 })

function useInstances(ref: React.RefObject<InstancedMesh | null>, items: Array<{ p: [number, number, number]; s?: number; r?: number; c?: string }>) {
  useLayoutEffect(() => {
    const im = ref.current!
    const o = new Object3D()
    const col = new Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.rotation.set(0, it.r ?? 0, 0)
      o.scale.setScalar(it.s ?? 1)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
      if (it.c) im.setColorAt(i, col.set(it.c))
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
  }, [ref, items])
}

function Shelves() {
  const cupsRef = useRef<InstancedMesh>(null)
  const jarsRef = useRef<InstancedMesh>(null)
  const fillRef = useRef<InstancedMesh>(null)
  const bottlesRef = useRef<InstancedMesh>(null)

  const layout = useMemo(() => {
    const cups: Array<{ p: [number, number, number]; r: number }> = []
    for (let i = 0; i < 18; i++) {
      const x = SHELF_X0 + 0.25 + (i % 9) * 0.13
      const stack = Math.floor(i / 9)
      cups.push({ p: [x, SHELF_YS[0] + 0.03 + stack * 0.065, SHELF_Z], r: -Math.PI / 2 })
    }
    const jars: Array<{ p: [number, number, number] }> = []
    const fills: Array<{ p: [number, number, number]; c: string }> = []
    const beanTones = ['#3B2416', '#5A3A22', '#2E1C12', '#6B4530', '#4A2C1A', '#3B2416']
    for (let i = 0; i < 6; i++) {
      const x = SHELF_X0 + 0.35 + i * 0.2
      jars.push({ p: [x, SHELF_YS[1] + 0.13, SHELF_Z] })
      fills.push({ p: [x, SHELF_YS[1] + 0.1, SHELF_Z], c: beanTones[i] })
    }
    const bottles: Array<{ p: [number, number, number]; c: string }> = []
    const syrup = ['#C77D62', '#E9BFC4', '#A8B5A0', '#FFD9A0', '#8B3A3A', '#D9A35F', '#6E5A8A', '#C77D62']
    for (let i = 0; i < 8; i++) bottles.push({ p: [SHELF_X0 + 0.3 + i * 0.12, SHELF_YS[2] + 0.03, SHELF_Z], c: syrup[i] })
    for (let i = 0; i < 6; i++) bottles.push({ p: [SHELF_X1 - 1.1 + i * 0.13, SHELF_YS[1] + 0.03, SHELF_Z], c: syrup[(i + 3) % syrup.length] })
    return { cups, jars, fills, bottles }
  }, [])

  useInstances(cupsRef, layout.cups)
  useInstances(jarsRef, layout.jars)
  useInstances(fillRef, layout.fills)
  useInstances(bottlesRef, layout.bottles)

  return (
    <group>
      {SHELF_YS.map((y) => (
        <group key={y}>
          <Box min={[SHELF_X0, y - 0.03, minZ + 0.02]} max={[SHELF_X1, y, minZ + 0.34]} material={MATERIALS.walnut} />
          {[SHELF_X0 + 0.15, (SHELF_X0 + SHELF_X1) / 2, SHELF_X1 - 0.15].map((x) => (
            <Box key={x} position={[x, y - 0.1, minZ + 0.12]} size={[0.025, 0.16, 0.2]} material={MATERIALS.brass} cast={false} />
          ))}
        </group>
      ))}
      <instancedMesh ref={cupsRef} args={[cupGeometry('demitasse'), MATERIALS.ceramic, layout.cups.length]} castShadow />
      <instancedMesh ref={fillRef} args={[JAR_FILL_GEO, MATERIALS.coffeeBean.clone(), layout.fills.length]} />
      <instancedMesh ref={jarsRef} args={[JAR_GEO, JAR_MAT, layout.jars.length]} renderOrder={1} />
      <instancedMesh ref={bottlesRef} args={[BOTTLE_GEO, BOTTLE_MAT, layout.bottles.length]} castShadow />
      {/* Stacked plates and a copper pot on the middle shelf */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={MATERIALS.ceramic} position={[-2.65, SHELF_YS[0] + 0.012 + i * 0.012, SHELF_Z]}>
          <cylinderGeometry args={[0.12, 0.1, 0.01, 28]} />
        </mesh>
      ))}
      <mesh material={MATERIALS.copper} position={[-2.1, SHELF_YS[0] + 0.1, SHELF_Z]} castShadow>
        <cylinderGeometry args={[0.1, 0.09, 0.18, 24]} />
      </mesh>
      <mesh material={MATERIALS.copper} position={[-1.6, SHELF_YS[2] + 0.11, SHELF_Z]} castShadow>
        <sphereGeometry args={[0.1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Wall decorations                                                    */
/* ------------------------------------------------------------------ */
const POSTER_MATS = [0, 1, 2].map((v) => new MeshStandardMaterial({ map: posterTexture(v as 0 | 1 | 2), roughness: 0.75 }))
const CHALK_MAT = new MeshStandardMaterial({ map: chalkboardTexture(), roughness: 0.92 })

function Poster({ position, rotationY, variant }: { position: [number, number, number]; rotationY: number; variant: 0 | 1 | 2 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0, 0]} size={[0.78, 1.06, 0.04]} material={MATERIALS.brass} />
      <mesh position={[0, 0, 0.022]} material={POSTER_MATS[variant]}>
        <planeGeometry args={[0.7, 0.98]} />
      </mesh>
    </group>
  )
}

function WallClock({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  const minute = useRef<Group>(null)
  const hour = useRef<Group>(null)
  useFrame(() => {
    // Real local time, so the café clock is always right.
    const d = new Date()
    const m = d.getMinutes() + d.getSeconds() / 60
    const h = (d.getHours() % 12) + m / 60
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2
  })
  return (
    <group position={position} rotation={[0, rotationY, 0]} userData={NO_MERGE}>
      <mesh rotation-x={Math.PI / 2} material={MATERIALS.brass} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 40]} />
      </mesh>
      <mesh position={[0, 0, 0.026]} material={MATERIALS.linen}>
        <circleGeometry args={[0.215, 40]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.18, Math.cos((i / 12) * Math.PI * 2) * 0.18, 0.028]} material={MATERIALS.iron}>
          <circleGeometry args={[i % 3 === 0 ? 0.012 : 0.006, 8]} />
        </mesh>
      ))}
      <group ref={hour} position={[0, 0, 0.03]}>
        <Box position={[0, 0.05, 0]} size={[0.012, 0.11, 0.004]} material={MATERIALS.iron} cast={false} />
      </group>
      <group ref={minute} position={[0, 0, 0.034]}>
        <Box position={[0, 0.075, 0]} size={[0.008, 0.16, 0.004]} material={MATERIALS.iron} cast={false} />
      </group>
    </group>
  )
}

function WallDecor() {
  return (
    <group>
      <Poster position={[minX + 0.03, 2.3, -2.2]} rotationY={Math.PI / 2} variant={0} />
      <Poster position={[minX + 0.03, 2.3, -3.6]} rotationY={Math.PI / 2} variant={1} />
      <Poster position={[maxX - 0.03, 2.3, -4.9]} rotationY={-Math.PI / 2} variant={2} />
      {/* Gilded round mirror */}
      <group position={[maxX - 0.03, 2.35, -2.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh rotation-x={Math.PI / 2} material={MATERIALS.brass}>
          <torusGeometry args={[0.55, 0.05, 12, 48]} />
        </mesh>
        <mesh position={[0, 0, 0.01]} material={MATERIALS.mirror}>
          <circleGeometry args={[0.53, 48]} />
        </mesh>
      </group>
      {/* Chalkboard menu above the pâtisserie */}
      <group position={[3.35, 2.6, minZ + 0.05]}>
        <Box size={[1.66, 1.26, 0.05]} position={[0, 0, 0]} material={MATERIALS.walnut} />
        <mesh position={[0, 0, 0.027]} material={CHALK_MAT}>
          <planeGeometry args={[1.56, 1.16]} />
        </mesh>
      </group>
      <WallClock position={[-3.0, 3.35, minZ + 0.05]} rotationY={0} />
      {/* Neon-style script sign in warm light above the shelves */}
      <Text font={FONTS.serifItalic} fontSize={0.3} color={PALETTE.gold} position={[-1.4, 3.4, minZ + 0.06]} anchorX="center" anchorY="middle" material-toneMapped={false} material-color={new Color(PALETTE.gold).multiplyScalar(2.2)}>
        Bonjour, mon café
      </Text>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Pendant lamps (geometry only; lights live in Lighting.tsx)          */
/* ------------------------------------------------------------------ */
const SHADE_GEO = new LatheGeometry([[0.02, 0.18], [0.05, 0.17], [0.09, 0.1], [0.17, 0.0], [0.175, -0.01]].map(([r, y]) => new Vector2(r, y)), 32)

function Pendants() {
  return (
    <group>
      {PENDANTS.map(({ position: [x, y, z] }) => (
        <group key={`${x}${z}`} position={[x, y, z]}>
          <mesh material={MATERIALS.iron} position={[0, (ceiling - y) / 2 + 0.1, 0]}>
            <cylinderGeometry args={[0.004, 0.004, ceiling - y - 0.2, 4]} />
          </mesh>
          <mesh geometry={SHADE_GEO} material={MATERIALS.brass} castShadow />
          <mesh material={MATERIALS.bulb} position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.05, 16, 10]} />
          </mesh>
          <mesh material={MATERIALS.brass} position={[0, ceiling - y - 0.02, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Ceiling fan — imported GLB with its baked "Spin" clip               */
/* ------------------------------------------------------------------ */
function AnimatedFan({ root, animations }: { root: Group; animations: AnimationClip[] }) {
  const ref = useRef<Group>(null)
  const scene = useMemo(() => root.clone(), [root])
  const { actions } = useAnimations(animations, ref)
  useEffect(() => {
    const spin = actions.Spin
    spin?.reset().setEffectiveTimeScale(0.55).play()
    return () => void spin?.stop()
  }, [actions])
  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  )
}

export function CafeInterior() {
  return (
    <group>
      <Shell />
      <Shelves />
      <WallDecor />
      <Pendants />
      <group position={[0.2, ceiling, -3.0]} userData={NO_MERGE}>
        <ModelSource model="fan" castShadow={false}>
          {(root, animations) => <AnimatedFan root={root as Group} animations={animations} />}
        </ModelSource>
      </group>
    </group>
  )
}
