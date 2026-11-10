import { useProgress } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useCafeStore } from '../../app/store/useCafeStore'

/**
 * Intro overlay: shows asset loading progress, then fades away to reveal the
 * scene. `ready` is set once loading settles plus a short grace period so the
 * first frames (shader compilation, shadow maps) happen behind the curtain.
 */
export function LoadingScreen() {
  const { progress, active } = useProgress()
  const ready = useCafeStore((s) => s.ready)
  const setReady = useCafeStore((s) => s.setReady)

  useEffect(() => {
    if (ready || active || progress < 100) return
    const t = window.setTimeout(setReady, 900)
    return () => window.clearTimeout(t)
  }, [active, progress, ready, setReady])

  // Fallback: never trap the user behind the curtain (e.g. a stalled optional asset).
  useEffect(() => {
    const t = window.setTimeout(setReady, 12000)
    return () => window.clearTimeout(t)
  }, [setReady])

  return (
    <AnimatePresence>
      {!ready && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-cream" exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: 'easeInOut' }}>
          <motion.div className="flex flex-col items-center text-center" exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.6 }}>
            <motion.div
              className="grid h-20 w-20 place-items-center rounded-full bg-espresso text-cream shadow-soft"
              animate={{ rotate: [0, -4, 4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <span className="font-serif text-4xl font-semibold italic">P</span>
            </motion.div>
            <h1 className="mt-6 font-serif text-5xl font-semibold text-espresso">Parisian Café</h1>
            <p className="mt-2 text-xs font-semibold tracking-[0.3em] text-terracotta uppercase">Rue des Roses · depuis 1926</p>
            <div className="mt-8 h-1 w-56 overflow-hidden rounded-full bg-espresso/10">
              <motion.div className="h-full rounded-full bg-terracotta" animate={{ width: `${Math.max(8, progress)}%` }} transition={{ ease: 'easeOut' }} />
            </div>
            <p className="mt-3 text-sm text-espresso/60">{progress < 100 ? 'Warming up the espresso machine…' : 'Setting the tables…'}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
