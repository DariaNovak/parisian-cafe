import { AnimatePresence, motion } from 'framer-motion'
import { Coffee, CakeSlice, RotateCcw, ShoppingBag, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCafeStore } from '../../app/store/useCafeStore'
import { setAudioEnabled } from '../../audio/audioEngine'
import { QUALITY_PRESETS, type QualityLevel } from '../../constants/quality'
import { LISTED_VIEWS } from '../../features/navigation/cameraViews'
import { itemCount, useOrderStore } from '../../features/ordering/useOrderStore'

function Logo() {
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full sm:glass-panel sm:py-1 sm:pr-5 sm:pl-1">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-espresso text-cream shadow-soft">
        <span className="font-serif text-xl leading-none font-semibold italic">P</span>
      </div>
      <div className="hidden leading-tight sm:block">
        <p className="font-serif text-[1.45rem] font-semibold text-espresso">Parisian Café</p>
        <p className="text-[0.62rem] font-semibold tracking-[0.28em] text-espresso/60 uppercase">Rue des Roses · Paris</p>
      </div>
    </div>
  )
}

function ViewSelector() {
  const view = useCafeStore((s) => s.view)
  const focus = useCafeStore((s) => s.focus)
  const goToView = useCafeStore((s) => s.goToView)
  const resetCamera = useCafeStore((s) => s.resetCamera)
  return (
    <nav aria-label="Camera views" className="glass-panel pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1">
      {LISTED_VIEWS.map((v) => {
        const active = v.id === view && !focus
        return (
          <button key={v.id} onClick={() => goToView(v.id)} className={`chip relative whitespace-nowrap ${active ? 'text-cream' : 'text-espresso/75 hover:text-espresso'}`}>
            {active && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full bg-espresso" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <span className="relative">{v.label}</span>
          </button>
        )
      })}
      <span className="mx-1 h-5 w-px bg-espresso/15" />
      <button onClick={resetCamera} title="Reset camera" aria-label="Reset camera" className="rounded-full p-2 text-espresso/70 transition hover:bg-espresso/8 hover:text-espresso">
        <RotateCcw size={16} />
      </button>
    </nav>
  )
}

function QualityMenu() {
  const [open, setOpen] = useState(false)
  const quality = useCafeStore((s) => s.quality)
  const setQuality = useCafeStore((s) => s.setQuality)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <IconButton label="Graphics quality" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={18} />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="glass-panel absolute top-12 right-0 w-48 rounded-2xl p-2">
            <p className="px-2 pt-1 pb-2 text-[0.65rem] font-semibold tracking-[0.2em] text-espresso/55 uppercase">Graphics</p>
            {(Object.keys(QUALITY_PRESETS) as QualityLevel[]).map((q) => (
              <button key={q} onClick={() => setQuality(q)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${q === quality ? 'bg-espresso text-cream' : 'text-espresso hover:bg-espresso/8'}`}>
                {QUALITY_PRESETS[q].label}
                <span className="text-[0.7rem] opacity-70">{q === 'low' ? 'battery' : q === 'medium' ? 'balanced' : 'cinematic'}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function IconButton({ label, onClick, children, active = false }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`glass-panel grid h-11 w-11 place-items-center rounded-full transition-colors ${active ? 'bg-espresso! text-cream' : 'text-espresso'}`}
    >
      {children}
    </motion.button>
  )
}

function OrderButton() {
  const items = useOrderStore((s) => s.items)
  const lastAddedAt = useOrderStore((s) => s.lastAddedAt)
  const panel = useCafeStore((s) => s.panel)
  const openPanel = useCafeStore((s) => s.openPanel)
  const closePanel = useCafeStore((s) => s.closePanel)
  const count = itemCount(items)
  return (
    <motion.button
      key={lastAddedAt}
      initial={lastAddedAt ? { scale: 1.12 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      onClick={() => (panel === 'order' ? closePanel() : openPanel('order'))}
      className="pointer-events-auto relative flex h-11 items-center gap-2 rounded-full bg-espresso pr-4 pl-3.5 text-sm font-semibold text-cream shadow-soft"
      aria-label={`Your order, ${count} items`}
    >
      <ShoppingBag size={18} />
      <span className="hidden sm:inline">Order</span>
      <AnimatePresence>
        {count > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[0.7rem] font-bold text-espresso">
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/** Top bar: logo, view selector, quick actions. */
export function Navigation() {
  const soundOn = useCafeStore((s) => s.soundOn)
  const toggleSound = useCafeStore((s) => s.toggleSound)
  const panel = useCafeStore((s) => s.panel)
  const openPanel = useCafeStore((s) => s.openPanel)
  const goToView = useCafeStore((s) => s.goToView)

  useEffect(() => setAudioEnabled(soundOn), [soundOn])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col gap-3 p-3 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <div className="pointer-events-auto flex items-center gap-2 lg:hidden">
          <QuickActions soundOn={soundOn} toggleSound={toggleSound} panel={panel} openPanel={openPanel} goToView={goToView} />
        </div>
      </div>
      <div className="flex justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
        <ViewSelector />
      </div>
      <div className="pointer-events-auto hidden items-center gap-2 lg:flex">
        <QuickActions soundOn={soundOn} toggleSound={toggleSound} panel={panel} openPanel={openPanel} goToView={goToView} />
      </div>
    </header>
  )
}

function QuickActions({ soundOn, toggleSound, panel, openPanel, goToView }: { soundOn: boolean; toggleSound: () => void; panel: string; openPanel: (p: 'coffee' | 'desserts') => void; goToView: (v: 'coffee' | 'pastry') => void }) {
  return (
    <>
      <IconButton label="Make a coffee" active={panel === 'coffee'} onClick={() => { openPanel('coffee'); goToView('coffee') }}>
        <Coffee size={18} />
      </IconButton>
      <IconButton label="Browse desserts" active={panel === 'desserts'} onClick={() => { openPanel('desserts'); goToView('pastry') }}>
        <CakeSlice size={18} />
      </IconButton>
      <IconButton label={soundOn ? 'Mute ambience' : 'Play café ambience'} onClick={toggleSound} active={soundOn}>
        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </IconButton>
      <QualityMenu />
      <OrderButton />
    </>
  )
}
