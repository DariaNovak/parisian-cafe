import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCafeStore, type AudioSettings } from '../../app/store/useCafeStore'
import { setAmbienceEnabled, setSfxEnabled } from '../../audio/audioEngine'
import { setMusicEnabled, setMusicVolume } from '../../audio/music'
import { IconButton } from './Navigation'

/** Has the user interacted with the page yet? Browsers block audio until then. */
const activated = () => navigator.userActivation?.hasBeenActive ?? false

/**
 * Keeps the audio engine in sync with the saved preferences. Music and
 * ambience wait for the first click / tap / key press; `M` toggles the music.
 */
export function useAudioSettings() {
  const audio = useCafeStore((s) => s.audio)
  const [unlocked, setUnlocked] = useState(activated)

  useEffect(() => {
    if (unlocked) return
    const go = () => setUnlocked(true)
    window.addEventListener('pointerdown', go, { once: true })
    window.addEventListener('keydown', go, { once: true })
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
    }
  }, [unlocked])

  useEffect(() => setSfxEnabled(audio.effects), [audio.effects])
  useEffect(() => setMusicVolume(audio.musicVolume), [audio.musicVolume])
  useEffect(() => setMusicEnabled(unlocked && audio.music), [unlocked, audio.music])
  useEffect(() => setAmbienceEnabled(unlocked && audio.ambience), [unlocked, audio.ambience])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'm' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const { audio: a, setAudio, notify } = useCafeStore.getState()
      setAudio({ music: !a.music })
      notify(a.music ? 'Music off' : 'Music on')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (on: boolean) => void; label: string; hint: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-espresso/6">
      <span>
        <span className="block text-sm font-medium text-espresso">{label}</span>
        <span className="block text-[0.7rem] text-espresso/55">{hint}</span>
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-espresso' : 'bg-espresso/20'}`}>
        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={`absolute top-1 h-4 w-4 rounded-full bg-cream shadow ${on ? 'right-1' : 'left-1'}`} />
      </span>
    </button>
  )
}

/** Speaker button with a small panel: music (with volume), café ambience, sound effects. */
export function AudioMenu() {
  const [open, setOpen] = useState(false)
  const audio = useCafeStore((s) => s.audio)
  const setAudio = useCafeStore((s) => s.setAudio)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  const anything = audio.music || audio.ambience || audio.effects
  const set = (change: Partial<AudioSettings>) => setAudio(change)

  return (
    <div ref={ref} className="relative">
      <IconButton label="Sound & music" onClick={() => setOpen((o) => !o)} active={open}>
        {anything ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="glass-panel absolute top-12 right-0 z-30 w-72 rounded-2xl p-2">
            <p className="px-3 pt-1 pb-2 text-[0.65rem] font-semibold tracking-[0.2em] text-espresso/55 uppercase">Sound</p>
            <Switch on={audio.music} onChange={(music) => set({ music })} label="Music" hint="“Parisian” · Kevin MacLeod · press M" />
            <div className={`px-3 pb-2 transition-opacity ${audio.music ? '' : 'pointer-events-none opacity-40'}`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={audio.musicVolume}
                onChange={(e) => set({ musicVolume: Number(e.target.value) })}
                aria-label="Music volume"
                className="w-full accent-terracotta"
              />
            </div>
            <Switch on={audio.ambience} onChange={(ambience) => set({ ambience })} label="Café ambience" hint="Murmurs and clinking cups" />
            <Switch on={audio.effects} onChange={(effects) => set({ effects })} label="Sound effects" hint="Guests, the counter bell, the till" />
            <button
              onClick={() => set(anything ? { music: false, ambience: false, effects: false } : { music: true, ambience: true, effects: true })}
              className="mt-1 w-full rounded-xl px-3 py-2 text-center text-xs font-semibold text-espresso/70 transition hover:bg-espresso/6"
            >
              {anything ? 'Mute everything' : 'Turn everything on'}
            </button>
            <p className="border-t border-espresso/10 px-3 pt-2 pb-1 text-[0.62rem] leading-snug text-espresso/50">
              Music: “Parisian” by{' '}
              <a href="https://incompetech.com" target="_blank" rel="noreferrer" className="underline">
                Kevin MacLeod
              </a>{' '}
              (
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">
                CC BY 4.0
              </a>
              ). Sound effects:{' '}
              <a href="https://mixkit.co/free-sound-effects/" target="_blank" rel="noreferrer" className="underline">
                Mixkit
              </a>
              .
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
