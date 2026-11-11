import { create } from 'zustand'
import type { CameraViewId } from '../../features/navigation/cameraViews'
import { detectQuality, type QualityLevel } from '../../constants/quality'

export type PanelId = 'none' | 'coffee' | 'desserts' | 'order'

/** A one-off camera focus (e.g. clicking a table or inspecting a cup). */
export interface CameraFocus {
  key: string
  position: [number, number, number]
  target: [number, number, number]
  inside: boolean
}

export interface InspectInfo {
  title: string
  subtitle: string
}

export interface AudioSettings {
  /** Background musette waltz. */
  music: boolean
  /** 0..1 */
  musicVolume: number
  /** Murmur of the café and clinking cups. */
  ambience: boolean
  /** Interface and gameplay sounds: bells, guests' voices, the till. */
  effects: boolean
}

const AUDIO_KEY = 'parisian-cafe:audio'
const DEFAULT_AUDIO: AudioSettings = { music: true, musicVolume: 0.7, ambience: true, effects: true }

function loadAudio(): AudioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? 'null')
    return saved && typeof saved === 'object' ? { ...DEFAULT_AUDIO, ...saved } : DEFAULT_AUDIO
  } catch {
    return DEFAULT_AUDIO
  }
}

interface CafeState {
  ready: boolean
  view: CameraViewId
  focus: CameraFocus | null
  /** Incremented to request a camera reset to the current view. */
  resetNonce: number
  panel: PanelId
  quality: QualityLevel
  /** Audio preferences (remembered between visits). */
  audio: AudioSettings
  hint: string | null
  inspect: InspectInfo | null
  doorOpen: boolean
  /** True while the user drags a physics object (disables orbiting). */
  dragging: boolean
  /** Small transient notification ("Cup placed on the terrace table"). */
  toast: { id: number; text: string } | null

  setReady: () => void
  goToView: (view: CameraViewId) => void
  focusOn: (focus: CameraFocus, inspect?: InspectInfo | null) => void
  resetCamera: () => void
  openPanel: (panel: PanelId) => void
  closePanel: () => void
  setQuality: (q: QualityLevel) => void
  setAudio: (change: Partial<AudioSettings>) => void
  setHint: (hint: string | null) => void
  clearInspect: () => void
  toggleDoor: () => void
  setDoorOpen: (open: boolean) => void
  setDragging: (dragging: boolean) => void
  notify: (text: string) => void
}

export const useCafeStore = create<CafeState>()((set) => ({
  ready: false,
  view: 'exterior',
  focus: null,
  resetNonce: 0,
  panel: 'none',
  quality: detectQuality(),
  audio: loadAudio(),
  hint: null,
  inspect: null,
  doorOpen: false,
  dragging: false,
  toast: null,

  setReady: () => set({ ready: true }),
  goToView: (view) => set({ view, focus: null, inspect: null }),
  focusOn: (focus, inspect = null) => set({ focus, inspect }),
  resetCamera: () => set((s) => ({ focus: null, inspect: null, resetNonce: s.resetNonce + 1 })),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: 'none' }),
  setQuality: (quality) => set({ quality }),
  setAudio: (change) =>
    set((s) => {
      const audio = { ...s.audio, ...change }
      try {
        localStorage.setItem(AUDIO_KEY, JSON.stringify(audio))
      } catch {
        /* storage unavailable: settings just won't persist */
      }
      return { audio }
    }),
  setHint: (hint) => set({ hint }),
  clearInspect: () => set({ inspect: null }),
  toggleDoor: () => set((s) => ({ doorOpen: !s.doorOpen })),
  setDoorOpen: (doorOpen) => set({ doorOpen }),
  setDragging: (dragging) => set({ dragging }),
  notify: (text) => set((s) => ({ toast: { id: (s.toast?.id ?? 0) + 1, text } })),
}))
