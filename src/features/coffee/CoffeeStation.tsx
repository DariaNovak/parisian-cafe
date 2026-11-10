import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CubicBezierCurve3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { useCafeStore } from '../../app/store/useCafeStore'
import { playSfx } from '../../audio/audioEngine'
import { Steam } from '../../components/three/effects/Steam'
import { ESPRESSO_POS, TRAY_POS } from '../../constants/layout'
import { MATERIALS } from '../../materials'
import { cupGeometry, cupMaterial, saucerGeometry, SURFACE_DISC, surfaceHeight, surfaceRadius } from '../../models/CoffeeCup'
import { BEAN_FILL_GEO, Grinder } from '../../models/Counter'
import { BUTTON_MATERIALS, EspressoMachine, MACHINE, PILOT_LIGHT, type MachineParts } from '../../models/EspressoMachine'
import { usePhysicsStore } from '../../physics/usePhysicsStore'
import { createCoffeeSurfaceMaterial } from '../../shaders/coffee/coffeeSurface'
import { damp, lerp, progress, smoothstep } from '../../utils/math'
import { useOrderStore } from '../ordering/useOrderStore'
import { ART_INDEX, COFFEES, CUPS, PHASE_DURATION, type BrewPhase } from './coffeeConfig'
import { phaseProgress, useCoffeeStore } from './useCoffeeStore'

const SAUCER_LIFT = 0.007
const NEEDLE_REST = 2.2
const NEEDLE_9_BAR = -0.45
/** Tray position in machine-local space (the station group sits at ESPRESSO_POS). */
const TRAY_LOCAL = new Vector3(TRAY_POS[0] - ESPRESSO_POS[0], TRAY_POS[1] - ESPRESSO_POS[1] + 0.012, TRAY_POS[2] - ESPRESSO_POS[2])
const CUP_SPOT = new Vector3(...MACHINE.cupSpot)
/** After extraction the cup is slid out onto the counter, where milk is poured. */
const POUR_SPOT = new Vector3(...MACHINE.pourSpot)
/** Arc the finished cup follows from the counter to the serving tray. */
const SERVE_PATH = new CubicBezierCurve3(POUR_SPOT, POUR_SPOT.clone().add(new Vector3(0.3, 0.22, 0.15)), TRAY_LOCAL.clone().add(new Vector3(0, 0.25, 0.2)), TRAY_LOCAL)
const UNDER_GROUP_PHASES: BrewPhase[] = ['select', 'grinding', 'brewing']
const PITCHER_REST = new Vector3(...MACHINE.pitcherRest)
const PITCHER_UNDER_WAND = new Vector3(MACHINE.wandTip[0] + 0.005, MACHINE.wandTip[1] - 0.085, MACHINE.wandTip[2])
/** Pitcher spout in pitcher-local space (used to anchor the milk stream). */
const SPOUT_LOCAL = new Vector3(-0.05, 0.112, 0)

const SFX: Partial<Record<BrewPhase, Parameters<typeof playSfx>[0]>> = {
  grinding: 'grind',
  brewing: 'pour',
  steaming: 'steam',
  'pouring-milk': 'pour',
  done: 'bell',
}

/** Liquid parameters for the cup surface shader as a function of phase/progress. */
function liquidState(phase: BrewPhase, p: number, coffee: (typeof COFFEES)[keyof typeof COFFEES]) {
  const { espressoFill: e, finalFill: f, milkTint } = coffee
  switch (phase) {
    case 'select':
    case 'grinding':
      return { fill: 0, crema: 0, milk: 0, swirl: 0, foam: 0 }
    case 'brewing':
      return { fill: e * smoothstep(0.1, 0.92, p), crema: smoothstep(0.25, 1, p), milk: 0, swirl: 0.15, foam: 0 }
    case 'steaming':
      return { fill: e, crema: 1, milk: 0, swirl: 0, foam: 0 }
    case 'pouring-milk': {
      const k = smoothstep(0.3, 0.92, p)
      return { fill: lerp(e, f, k), crema: 1, milk: milkTint * k, swirl: 1 - smoothstep(0.85, 1, p) * 0.7, foam: k }
    }
    default:
      return { fill: f, crema: 1, milk: milkTint, swirl: phase === 'drawing-art' ? 0.25 : 0, foam: coffee.milk ? 1 : 0 }
  }
}

/** Where the pitcher should be (and how tilted) for the current phase. */
function pitcherTarget(phase: BrewPhase, p: number, cupHeight: number, cupPos: Vector3, out: Vector3): number {
  switch (phase) {
    case 'steaming':
      out.copy(PITCHER_UNDER_WAND)
      out.y += Math.sin(p * 40) * 0.002 * smoothstep(0.2, 0.3, p)
      return 0
    case 'pouring-milk':
    case 'art':
    case 'drawing-art': {
      out.set(cupPos.x + 0.085, cupPos.y + SAUCER_LIFT + cupHeight + 0.02, cupPos.z)
      if (phase === 'pouring-milk') return 1.05 * smoothstep(0.25, 0.4, p) * (1 - smoothstep(0.9, 1, p))
      if (phase === 'drawing-art') {
        // The barista lowers the pitcher and wiggles it to draw the pattern.
        out.y -= 0.012 * smoothstep(0, 0.2, p)
        out.x += Math.sin(p * 30) * 0.006 * smoothstep(0.1, 0.3, p) * (1 - smoothstep(0.7, 0.9, p))
        return 1.2 * smoothstep(0, 0.15, p) * (1 - smoothstep(0.88, 1, p))
      }
      return 0
    }
    default:
      out.copy(PITCHER_REST)
      return 0
  }
}

/** The coffee bar: espresso machine + brew cup + pitcher + steam, driven by the brew state machine. */
export function CoffeeStation() {
  const parts = useRef<MachineParts>(null)
  const cupGroup = useRef<Group>(null)
  const cupMesh = useRef<Mesh>(null)
  const saucerMesh = useRef<Mesh>(null)
  const surface = useRef<Mesh>(null)
  const surfaceMat = useMemo(() => createCoffeeSurfaceMaterial({ crema: 0 }), [])
  const wandSteam = useMemo(() => ({ value: 0 }), [])
  const cupSteam = useMemo(() => ({ value: 0 }), [])
  const cupSteamPos = useRef<Group>(null)
  const tmp = useMemo(() => ({ v: new Vector3(), a: new Vector3(), b: new Vector3() }), [])
  const cupDrop = useRef(0)

  // Phase-change side effects: sounds, and a fresh cup "drop-in" animation.
  useEffect(
    () =>
      useCoffeeStore.subscribe((s, prev) => {
        if (s.phase !== prev.phase) {
          const sfx = SFX[s.phase]
          if (sfx) playSfx(sfx)
        }
        if (s.cup && s.cup !== prev.cup) {
          cupDrop.current = 0.09
          playSfx('clink')
        }
      }),
    [],
  )

  useFrame((state, dt) => {
    const s = useCoffeeStore.getState()
    const p = phaseProgress(s)
    const t = state.clock.elapsedTime

    // --- Timed phase transitions (the "director") ------------------------
    if (PHASE_DURATION[s.phase] !== undefined && p >= 1) {
      if (s.phase === 'serving' && s.coffee && s.cup) {
        const n = usePhysicsStore.getState().bodies.filter((b) => b.kind === 'coffee').length
        // Coffees occupy the left half of the tray (desserts use the right half).
        const dz = n % 2 ? 0.07 : -0.07
        usePhysicsStore.getState().spawn({ kind: 'coffee', coffee: s.coffee, cup: s.cup, art: s.art, position: [TRAY_POS[0] - 0.15, TRAY_POS[1] + 0.06 + (n % 3) * 0.04, TRAY_POS[2] + dz] })
        useOrderStore.getState().addCoffee(s.coffee, s.cup, s.art)
        useCafeStore.getState().notify(`${COFFEES[s.coffee].label} served on the tray · added to your order`)
      }
      s.advance()
      return
    }

    const m = parts.current
    if (!m) return
    const coffee = s.coffee ? COFFEES[s.coffee] : null
    const cup = s.cup ? CUPS[s.cup] : null

    // --- Brew cup: visibility, drop-in, serving arc -----------------------
    const cg = cupGroup.current!
    cg.visible = !!cup
    if (cup && coffee) {
      cupDrop.current = damp(cupDrop.current, 0, 9, dt)
      if (s.phase === 'serving') SERVE_PATH.getPoint(smoothstep(0, 1, p), cg.position)
      else {
        // Under the group head while brewing, then slid out to the pouring spot.
        const home = UNDER_GROUP_PHASES.includes(s.phase) ? CUP_SPOT : POUR_SPOT
        if (cupDrop.current > 0.001) {
          // A freshly chosen cup is set down from just above its spot.
          cg.position.set(home.x, home.y + cupDrop.current, home.z)
        } else {
          cg.position.x = damp(cg.position.x, home.x, 4, dt)
          cg.position.z = damp(cg.position.z, home.z, 4, dt)
          // Lift slightly while sliding over the drip-tray lip.
          const travel = Math.min(1, Math.hypot(cg.position.x - home.x, cg.position.z - home.z) * 12)
          cg.position.y = damp(cg.position.y, home.y + travel * 0.03, 8, dt)
        }
      }

      const liquid = liquidState(s.phase, p, coffee)
      const sm = surface.current!
      sm.visible = liquid.fill > 0.005
      sm.position.y = SAUCER_LIFT + surfaceHeight(cup, liquid.fill)
      const r = surfaceRadius(cup, Math.max(liquid.fill, 0.02))
      sm.scale.set(r, 1, r)
      const u = surfaceMat.uniforms
      u.uTime.value = t
      u.uCrema.value = liquid.crema
      u.uMilk.value = liquid.milk
      u.uSwirl.value = damp(u.uSwirl.value, liquid.swirl, 4, dt)
      u.uFoam.value = liquid.foam
      u.uArt.value = ART_INDEX[s.art]
      u.uArtProgress.value = s.phase === 'drawing-art' ? p : s.art === 'none' ? 0 : 1

      // Steam rises from the cup once there is hot coffee in it.
      cupSteam.value = damp(cupSteam.value, liquid.fill > 0.1 ? 0.75 : 0, 2, dt)
      cupSteamPos.current!.position.copy(cg.position)
      cupSteamPos.current!.position.y += SAUCER_LIFT + surfaceHeight(cup, liquid.fill)
    } else {
      cupSteam.value = 0
    }

    // --- Espresso streams ---------------------------------------------------
    const brewingFlow = s.phase === 'brewing' ? progress(0.08, 0.14, p) * (1 - progress(0.88, 0.94, p)) : 0
    const fill = cup && coffee ? liquidState(s.phase, p, coffee).fill : 0
    const bottom = CUP_SPOT.y + SAUCER_LIFT + (cup ? surfaceHeight(cup, fill) : 0)
    const len = Math.max(0.001, MACHINE.spoutY - bottom)
    for (const stream of m.streams) {
      if (!stream) continue
      stream.visible = brewingFlow > 0.01
      // Thin "ribbon" that wobbles, thinning at the end of the shot.
      const w = brewingFlow * (0.85 + Math.sin(t * 47 + stream.id) * 0.15)
      stream.scale.set(w, len, w)
      stream.position.y = MACHINE.spoutY - len / 2
    }

    // --- Gauge, buttons, pilot light ----------------------------------------
    const needleTarget = s.phase === 'brewing' ? NEEDLE_9_BAR + Math.sin(t * 9) * 0.03 : s.phase === 'steaming' ? 0.4 + Math.sin(t * 13) * 0.04 : s.phase === 'grinding' ? 1.6 : NEEDLE_REST
    if (m.needle) m.needle.rotation.z = damp(m.needle.rotation.z, needleTarget, 3, dt)
    if (m.brewButton) m.brewButton.position.z = damp(m.brewButton.position.z, s.phase === 'brewing' ? 0.225 : 0.232, 18, dt)
    if (m.steamButton) m.steamButton.position.z = damp(m.steamButton.position.z, s.phase === 'steaming' ? 0.225 : 0.232, 18, dt)
    BUTTON_MATERIALS.brew.emissiveIntensity = damp(BUTTON_MATERIALS.brew.emissiveIntensity, s.phase === 'brewing' ? 1.4 : 0, 6, dt)
    BUTTON_MATERIALS.steam.emissiveIntensity = damp(BUTTON_MATERIALS.steam.emissiveIntensity, s.phase === 'steaming' ? 1.4 : 0, 6, dt)
    PILOT_LIGHT.emissiveIntensity = s.phase === 'select' ? 0.6 : 1.5 + Math.sin(t * 6) * 0.5

    // --- Portafilter locks in (small twist) while grinding/brewing ----------
    if (m.portafilter) m.portafilter.rotation.y = damp(m.portafilter.rotation.y, s.phase === 'grinding' ? 0.5 : 0, 5, dt)

    // --- Steam wand + pitcher + milk stream -----------------------------------
    if (m.wand) m.wand.rotation.z = damp(m.wand.rotation.z, s.phase === 'steaming' ? 0.02 : 0.15, 5, dt)
    wandSteam.value = damp(wandSteam.value, s.phase === 'steaming' ? smoothstep(0.1, 0.25, p) : 0, 4, dt)
    const pitcher = m.pitcher
    if (pitcher) {
      const tilt = pitcherTarget(s.phase, p, cup?.height ?? 0.07, cupGroup.current!.position, tmp.v)
      pitcher.position.x = damp(pitcher.position.x, tmp.v.x, 5, dt)
      pitcher.position.y = damp(pitcher.position.y, tmp.v.y, 5, dt)
      pitcher.position.z = damp(pitcher.position.z, tmp.v.z, 5, dt)
      pitcher.rotation.z = damp(pitcher.rotation.z, tilt, 6, dt)
      const milkStream = m.milkStream
      if (milkStream) {
        const pouring = (s.phase === 'pouring-milk' && p > 0.33 && p < 0.9) || (s.phase === 'drawing-art' && p > 0.12 && p < 0.86)
        milkStream.visible = pouring && !!cup
        if (pouring && cup) {
          // Stream from the (rotated) spout straight down onto the liquid surface.
          tmp.a.copy(SPOUT_LOCAL).applyEuler(pitcher.rotation).add(pitcher.position)
          const surfaceY = cupGroup.current!.position.y + SAUCER_LIFT + surfaceHeight(cup, fill)
          const h = Math.max(0.002, tmp.a.y - surfaceY)
          const flow = s.phase === 'drawing-art' ? 0.7 : 1
          milkStream.position.set(tmp.a.x, surfaceY + h / 2, tmp.a.z)
          milkStream.scale.set(flow * (0.9 + Math.sin(t * 50) * 0.1), h, flow)
        }
      }
    }
  })

  return (
    <group position={ESPRESSO_POS}>
      <EspressoMachine ref={parts} />
      {/* The cup being prepared */}
      <group ref={cupGroup} visible={false}>
        <BrewCupMeshes saucerRef={saucerMesh} cupRef={cupMesh} />
        <mesh ref={surface} geometry={SURFACE_DISC} material={surfaceMat} visible={false} />
      </group>
      <group ref={cupSteamPos}>
        <Steam intensity={cupSteam} count={22} height={0.2} size={0.05} />
      </group>
      <Steam position={MACHINE.wandTip} intensity={wandSteam} count={60} radius={0.01} height={0.32} spread={0.07} size={0.08} speed={0.9} />
    </group>
  )
}

/** Cup + saucer meshes that swap geometry/material when another cup is chosen. */
function BrewCupMeshes({ saucerRef, cupRef }: { saucerRef: React.RefObject<Mesh | null>; cupRef: React.RefObject<Mesh | null> }) {
  const cupId = useCoffeeStore((s) => s.cup) ?? 'classic'
  const cup = CUPS[cupId]
  return (
    <>
      <mesh ref={saucerRef} geometry={saucerGeometry(cupId)} material={cupMaterial(cup)} castShadow receiveShadow />
      <mesh ref={cupRef} geometry={cupGeometry(cupId)} material={cupMaterial(cup)} position={[0, SAUCER_LIFT, 0]} castShadow receiveShadow />
    </>
  )
}

const HOPPER_JITTER = new Vector3()

/** Grinder whose bean hopper churns and whose body hums while grinding. */
export function StationGrinder() {
  const beans = useRef<Mesh>(null)
  const body = useRef<Group>(null)
  const beanMat = useMemo(() => (MATERIALS.coffeeBean as MeshStandardMaterial).clone(), [])
  useFrame((state, dt) => {
    const s = useCoffeeStore.getState()
    const grinding = s.phase === 'grinding'
    const t = state.clock.elapsedTime
    if (beans.current) {
      if (grinding) beans.current.rotation.y += dt * 6
      beans.current.scale.y = damp(beans.current.scale.y, grinding ? 0.9 : 1, 2, dt)
    }
    if (body.current) {
      HOPPER_JITTER.set(grinding ? Math.sin(t * 90) * 0.0012 : 0, 0, grinding ? Math.cos(t * 77) * 0.0012 : 0)
      body.current.position.copy(HOPPER_JITTER)
    }
  })
  return (
    <group ref={body}>
      <Grinder hopperChildren={<mesh ref={beans} geometry={BEAN_FILL_GEO} material={beanMat} position={[0, -0.025, 0]} />} />
    </group>
  )
}
