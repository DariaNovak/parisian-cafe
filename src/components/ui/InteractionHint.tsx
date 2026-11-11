import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Candy, Hand, MousePointer2 } from 'lucide-react'
import { useEffect } from 'react'
import { useCafeStore } from '../../app/store/useCafeStore'
import { TABLES } from '../../constants/layout'
import { dropSugarCubes } from '../../physics/actions'
import { useShiftStore } from '../../features/shift/useShiftStore'

/** Bottom-centre hint: what the hovered object does, or how to navigate. */
export function InteractionHint() {
  const hint = useCafeStore((s) => s.hint)
  const ready = useCafeStore((s) => s.ready)
  const panel = useCafeStore((s) => s.panel)
  const shift = useShiftStore((s) => s.active)
  const text = hint ?? (shift ? 'Drag to turn your head · click a guest, the machine or the cabinet' : 'Drag to look around · scroll to zoom · click glowing objects')
  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-5 z-10 justify-center px-4 ${panel !== 'none' ? 'hidden md:flex' : 'flex'}`}>
      <AnimatePresence mode="wait">
        {ready && (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={`glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-[0.8rem] font-medium ${hint ? 'text-espresso' : 'text-espresso/70'}`}
          >
            {hint ? <MousePointer2 size={14} className="text-terracotta" /> : <Hand size={14} />}
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Transient notifications (e.g. physics events, items added). */
export function Toast() {
  const toast = useCafeStore((s) => s.toast)
  const id = toast?.id
  useEffect(() => {
    if (!id) return
    const t = window.setTimeout(() => useCafeStore.setState({ toast: null }), 2600)
    return () => window.clearTimeout(t)
  }, [id])
  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-30 flex justify-center px-4 xl:top-24">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="rounded-full bg-espresso px-4 py-2 text-sm font-medium text-cream shadow-soft">
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Card shown while the camera is focused on an object (table or cup). */
export function InspectCard() {
  const inspect = useCafeStore((s) => s.inspect)
  const focus = useCafeStore((s) => s.focus)
  const resetCamera = useCafeStore((s) => s.resetCamera)
  const tableIndex = focus?.key.startsWith('table-') ? TABLES.findIndex((t) => focus.key === `table-${t.id}`) : -1
  return (
    <AnimatePresence>
      {focus && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={`glass-panel pointer-events-auto fixed bottom-20 left-3 z-20 rounded-3xl sm:left-5 md:bottom-5 ${inspect || tableIndex >= 0 ? 'w-[min(20rem,calc(100vw-1.5rem))] p-5' : 'p-2'}`}
        >
          {inspect && (
            <>
              <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-terracotta uppercase">Closer look</p>
              <p className="font-serif text-2xl leading-tight font-semibold">{inspect.title}</p>
              <p className="mt-1 text-[0.8rem] text-espresso/65">{inspect.subtitle}</p>
            </>
          )}
          <div className={`flex flex-wrap gap-2 ${inspect ? 'mt-4' : ''}`}>
            <button onClick={resetCamera} className="chip flex items-center gap-1.5 bg-espresso text-cream">
              <ArrowLeft size={14} /> Back
            </button>
            {tableIndex >= 0 && (
              <button onClick={() => dropSugarCubes(tableIndex)} className="chip flex items-center gap-1.5 bg-white/70 text-espresso hover:bg-white">
                <Candy size={14} /> Drop sugar cubes
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
