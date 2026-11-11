import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3, type PerspectiveCamera } from 'three'
import { useCafeStore } from '../../app/store/useCafeStore'
import { ESPRESSO_POS, COUNTER_TOP } from '../../constants/layout'
import type { CameraViewId } from '../../features/navigation/cameraViews'
import { useShiftStore } from '../../features/shift/useShiftStore'
import { clamp, damp } from '../../utils/math'

type Vec3 = [number, number, number]
type StationId = 'barista' | 'coffee' | 'pastry'

/** Eye height of the barista. */
const EYE = 1.68

/**
 * Where the barista stands (eye position) and what they look at at each work
 * place. All three sit in the aisle between the counter and the back shelves.
 */
const STATIONS: Record<StationId, { eye: Vec3; look: Vec3 }> = {
  // At the till, facing the guest across the counter; the serving tray is just below.
  barista: { eye: [-0.75, EYE, -6.92], look: [-0.4, 1.1, -3.9] },
  // In front of the espresso machine, looking down at the group head and the pouring spot.
  // (The machine faces the barista: the group head is at local x −0.13, the milk is poured at local x +0.5, i.e. world −x.)
  coffee: { eye: [ESPRESSO_POS[0] - 0.2, EYE, -7.02], look: [ESPRESSO_POS[0] - 0.2, COUNTER_TOP + 0.1, ESPRESSO_POS[2] - 0.36] },
  // Behind the pâtisserie cabinet, looking down at the pastries.
  pastry: { eye: [3.35, EYE, -7.02], look: [3.35, 0.98, -5.8] },
}

const stationOf = (view: CameraViewId): StationId => (view === 'coffee' || view === 'pastry' ? view : 'barista')

function aim(eye: Vec3, look: Vec3) {
  const dx = look[0] - eye[0]
  const dy = look[1] - eye[1]
  const dz = look[2] - eye[2]
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

const WALK_SPEED = 1.6
const BASE_FOV = 42

/**
 * First-person camera for the barista shift. The player stands behind the
 * counter at eye height and walks (with a gentle step bob) between the till,
 * the espresso machine and the pastry cabinet; dragging turns the head.
 * CameraControls is disabled while this is active.
 */
export function BaristaCamera() {
  const active = useShiftStore((s) => s.active)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const rig = useRef({ init: false, pos: new Vector3(), yaw: 0, pitch: 0, headYaw: 0, headPitch: 0, speed: 0, stride: 0 })
  const tmp = useMemo(() => ({ goal: new Vector3(), look: new Vector3() }), [])

  // Drag anywhere to turn the head (clicks still reach objects: they move < 6 px).
  useEffect(() => {
    if (!active) return
    const el = gl.domElement
    let last: { x: number; y: number } | null = null
    const down = (e: PointerEvent) => (last = { x: e.clientX, y: e.clientY })
    const move = (e: PointerEvent) => {
      if (!last) return
      const r = rig.current
      if (!useCafeStore.getState().dragging) {
        r.headYaw = clamp(r.headYaw - (e.clientX - last.x) * 0.0035, -1.35, 1.35)
        r.headPitch = clamp(r.headPitch - (e.clientY - last.y) * 0.0035, -0.7, 0.55)
      }
      last = { x: e.clientX, y: e.clientY }
    }
    const up = () => (last = null)
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [active, gl])

  // Leaving the shift: give the regular camera its lens back.
  useEffect(() => {
    if (active) return
    rig.current.init = false
    if (camera.fov !== BASE_FOV) {
      camera.fov = BASE_FOV
      camera.updateProjectionMatrix()
    }
  }, [active, camera])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = Math.min(rawDt, 0.1)
    const r = rig.current
    const cafe = useCafeStore.getState()
    const station = STATIONS[stationOf(cafe.view)]
    const goal = aim(station.eye, station.look)
    tmp.goal.set(...station.eye)

    if (!r.init) {
      // Step straight behind the counter when the shift starts (the UI fades over the cut).
      r.init = true
      r.pos.copy(tmp.goal)
      r.yaw = goal.yaw
      r.pitch = goal.pitch
      r.headYaw = r.headPitch = 0
    }

    // Walk along the aisle toward the station, easing in and out.
    const d = r.pos.distanceTo(tmp.goal)
    r.speed = damp(r.speed, d > 0.005 ? Math.min(WALK_SPEED, d * 3.2) : 0, 6, dt)
    if (d > 1e-4) {
      const step = Math.min(d, r.speed * dt)
      r.pos.lerp(tmp.goal, step / d)
      r.stride += step * 7.5
    }
    const walking = Math.min(1, r.speed / 1.1)
    // Walking somewhere recentres the head on the new task.
    if (walking > 0.15) {
      r.headYaw = damp(r.headYaw, 0, 3, dt)
      r.headPitch = damp(r.headPitch, 0, 3, dt)
    }

    // Keep what you're working on clear of the open panel.
    const wide = state.size.width >= 768
    const panelOpen = cafe.panel !== 'none'
    const yawGoal = goal.yaw + r.headYaw + (panelOpen && wide ? -0.24 : 0)
    const pitchGoal = goal.pitch + r.headPitch + (panelOpen && !wide ? -0.3 : 0)
    r.yaw += wrap(yawGoal - r.yaw) * (1 - Math.exp(-6 * dt))
    r.pitch = damp(r.pitch, pitchGoal, 6, dt)

    // Footsteps: a small vertical bob and a hint of roll.
    const bob = Math.abs(Math.sin(r.stride)) * 0.022 * walking
    camera.position.set(r.pos.x, r.pos.y + bob - 0.01 * walking, r.pos.z)
    const cp = Math.cos(r.pitch)
    tmp.look.set(r.pos.x + Math.sin(r.yaw) * cp, camera.position.y + Math.sin(r.pitch), r.pos.z + Math.cos(r.yaw) * cp)
    camera.lookAt(tmp.look)
    camera.rotateZ(Math.sin(r.stride) * 0.006 * walking)

    // A slightly wider lens feels like standing there; portrait screens need more.
    const fov = state.size.width / state.size.height < 0.9 ? 70 : 54
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = damp(camera.fov, fov, 5, dt)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
