import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChefHat, Coffee, CakeSlice, ConciergeBell, Coins, HandCoins, LogOut, Star, Trash, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCafeStore } from '../../app/store/useCafeStore'
import { COFFEES } from '../../features/coffee/coffeeConfig'
import { useCoffeeStore } from '../../features/coffee/useCoffeeStore'
import { DESSERTS, type DessertId } from '../../features/desserts/dessertsConfig'
import { useDessertStore } from '../../features/desserts/useDessertStore'
import { formatPrice } from '../../features/ordering/useOrderStore'
import { artLabel, orderPrice } from '../../features/shift/shiftConfig'
import { averageRating, clock, lineOf, matchTray, useShiftStore, type Customer } from '../../features/shift/useShiftStore'
import { PrimaryButton } from './Panel'

/** Runs the shift clock (patience, arrivals) while any guest is around. */
export function useShiftDirector() {
  const active = useShiftStore((s) => s.active)
  const hasGuests = useShiftStore((s) => s.customers.length > 0)
  useEffect(() => {
    if (!active && !hasGuests) return
    const id = window.setInterval(() => useShiftStore.getState().tick(), 400)
    return () => window.clearInterval(id)
  }, [active, hasGuests])
}

/** Jump to the espresso machine with the guest's drink and its ideal cup preselected. */
function brewFor(c: Customer) {
  const coffee = useCoffeeStore.getState()
  if (coffee.phase === 'select') {
    coffee.selectCoffee(c.order.coffee)
    coffee.selectCup(COFFEES[c.order.coffee].recommendedCup)
  }
  useCafeStore.getState().openPanel('coffee')
  useCafeStore.getState().goToView('coffee')
}

function fetchDessert(id: DessertId) {
  useDessertStore.getState().select(id)
  useCafeStore.getState().openPanel('desserts')
  useCafeStore.getState().goToView('pastry')
}

/** Patience bar that drains smoothly without per-frame React renders. */
function PatienceBar({ start, end }: { start: number; end: number }) {
  const total = Math.max(1, end - start)
  const left = Math.max(0, end - clock())
  const frac = left / total
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-espresso/10">
      <motion.div
        key={`${start}-${end}`}
        className="h-full rounded-full bg-terracotta"
        initial={{ width: `${frac * 100}%` }}
        animate={{ width: '0%' }}
        transition={{ duration: left, ease: 'linear' }}
      />
    </div>
  )
}

function OrderLine({ done, icon, title, note, action }: { done: boolean; icon: React.ReactNode; title: string; note?: string; action?: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${done ? 'border-sage/70 bg-sage/20' : 'border-espresso/10 bg-white/50'}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-sage text-espresso' : 'bg-espresso/8 text-espresso'}`}>{done ? <Check size={15} strokeWidth={3} /> : icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {note && <p className="truncate text-[0.72rem] text-espresso/60">{note}</p>}
      </div>
      {!done && action}
    </li>
  )
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="shrink-0 rounded-full bg-espresso px-3 py-1.5 text-[0.72rem] font-semibold text-cream transition hover:bg-[#4a3529]">
      {children}
    </button>
  )
}

function WaitingOrder({ c }: { c: Customer }) {
  const tray = useShiftStore((s) => s.tray)
  const serve = useShiftStore((s) => s.serve)
  const match = matchTray(c.order, tray)
  const coffee = COFFEES[c.order.coffee]
  const artMismatch = match.coffee && c.order.art && match.coffee.art !== c.order.art
  return (
    <>
      <ul className="mt-3 space-y-2">
        <OrderLine
          done={!!match.coffee}
          icon={<Coffee size={15} />}
          title={coffee.label}
          note={artMismatch ? `On the tray, but without the ${artLabel(c.order.art!).toLowerCase()}` : c.order.art ? `Latte art: ${artLabel(c.order.art).toLowerCase()}, please` : coffee.milk ? 'Any latte art' : 'Short and strong'}
          action={<SmallButton onClick={() => brewFor(c)}>Brew</SmallButton>}
        />
        {c.order.dessert && (
          <OrderLine
            done={!!match.dessert}
            icon={<CakeSlice size={15} />}
            title={DESSERTS[c.order.dessert].label}
            note={DESSERTS[c.order.dessert].french}
            action={<SmallButton onClick={() => fetchDessert(c.order.dessert!)}>Fetch</SmallButton>}
          />
        )}
      </ul>
      <PrimaryButton onClick={serve} disabled={!match.complete} className="mt-3">
        <HandCoins size={16} /> {match.complete ? `Serve & get paid · ${formatPrice(orderPrice(c.order))}` : 'Prepare the order first'}
      </PrimaryButton>
    </>
  )
}

/** Left-hand ticket: the guest at the till and what they need. */
export function ShiftTicket() {
  const active = useShiftStore((s) => s.active)
  const customers = useShiftStore((s) => s.customers)
  const tray = useShiftStore((s) => s.tray)
  const clearTray = useShiftStore((s) => s.clearTray)
  const takeOrder = useShiftStore((s) => s.takeOrder)
  const served = useShiftStore((s) => s.stats.served)
  const view = useCafeStore((s) => s.view)
  const goToView = useCafeStore((s) => s.goToView)
  const line = lineOf(customers)
  const front = line[0]
  const atTill = front && (front.phase === 'ordering' || front.phase === 'waiting')
  const arriving = customers.filter((c) => c.phase === 'arriving').length

  return (
    <AnimatePresence>
      {active && (
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          className="glass-panel pointer-events-auto fixed top-[7.5rem] left-3 z-20 w-[min(19rem,calc(100vw-1.5rem))] rounded-3xl p-4 sm:top-[8.75rem] sm:left-5 xl:top-24"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold tracking-[0.2em] text-terracotta uppercase">
              <ConciergeBell size={13} /> At the till
            </p>
            <p className="flex items-center gap-1 text-[0.7rem] text-espresso/60">
              <Users size={12} /> {line.length} in line{arriving ? ` · ${arriving} coming` : ''}
            </p>
          </div>

          {!atTill ? (
            <div className="mt-2">
              {front ? (
                <p className="font-serif text-xl leading-tight font-semibold">{front.name} is walking to the counter…</p>
              ) : served === 0 && !arriving ? (
                <>
                  <p className="font-serif text-xl leading-tight font-semibold">Welcome, barista!</p>
                  <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-[0.78rem] text-espresso/70">
                    <li>Guests walk in and queue at the till.</li>
                    <li>Click a guest (or the button here) to take the order.</li>
                    <li>Brew their coffee and fetch their dessert.</li>
                    <li>Serve the tray — they pay, tip and take a seat.</li>
                  </ol>
                </>
              ) : (
                <p className="font-serif text-xl leading-tight font-semibold">{arriving ? 'A guest is on the way…' : 'Quiet moment — wipe the counter.'}</p>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-serif text-2xl leading-tight font-semibold">{front.name}</p>
                {front.ticket && <p className="text-xs font-semibold text-espresso/50">Ticket #{front.ticket}</p>}
              </div>
              <PatienceBar start={front.patienceStart} end={front.patienceEnd} />
              {front.phase === 'ordering' ? (
                <PrimaryButton onClick={() => takeOrder(front.id)} className="mt-3">
                  <ConciergeBell size={16} /> Take the order
                </PrimaryButton>
              ) : (
                <WaitingOrder c={front} />
              )}
            </div>
          )}

          {(tray.length > 0 || view !== 'barista') && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-espresso/10 pt-3 text-[0.72rem] text-espresso/65">
              <span className="truncate">
                Tray: {tray.length ? tray.map((t) => (t.kind === 'coffee' ? COFFEES[t.coffee].label : DESSERTS[t.dessert].label)).join(', ') : 'empty'}
              </span>
              <span className="flex shrink-0 gap-1">
                {tray.length > 0 && (
                  <button onClick={clearTray} title="Clear the tray" aria-label="Clear the tray" className="rounded-full p-1.5 transition hover:bg-espresso/8">
                    <Trash size={14} />
                  </button>
                )}
                {view !== 'barista' && (
                  <button onClick={() => goToView('barista')} className="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-espresso hover:bg-white">
                    Back to till
                  </button>
                )}
              </span>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/** Running totals shown in the top bar during a shift. */
export function ShiftStats() {
  const stats = useShiftStore((s) => s.stats)
  const [bump, setBump] = useState(0)
  useEffect(() => setBump((b) => b + 1), [stats.earnings])
  const rating = averageRating(stats)
  return (
    <motion.div
      key={bump}
      initial={bump > 1 ? { scale: 1.12 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      className="pointer-events-auto flex h-11 items-center gap-3 rounded-full bg-espresso pr-4 pl-3.5 text-sm font-semibold text-cream shadow-soft"
      aria-label="Shift earnings"
    >
      <span className="flex items-center gap-1.5">
        <Coins size={16} className="text-gold" /> {formatPrice(stats.earnings)}
      </span>
      <span className="hidden items-center gap-1 text-cream/75 sm:flex">
        <Users size={14} /> {stats.served}
      </span>
      {rating > 0 && (
        <span className="hidden items-center gap-1 text-cream/75 sm:flex">
          <Star size={14} className="fill-gold text-gold" /> {rating.toFixed(1)}
        </span>
      )}
    </motion.div>
  )
}

/** Start / end the barista shift. */
export function ShiftToggle({ compact = false }: { compact?: boolean }) {
  const active = useShiftStore((s) => s.active)
  const start = useShiftStore((s) => s.startShift)
  const end = useShiftStore((s) => s.endShift)
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={active ? end : start}
      title={active ? 'End your shift' : 'Work as the barista'}
      aria-label={active ? 'End your shift' : 'Work as the barista'}
      className={`pointer-events-auto flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold shadow-soft transition-colors ${active ? 'glass-panel text-espresso' : 'bg-terracotta text-cream hover:bg-[#b56d53]'}`}
    >
      {active ? <LogOut size={17} /> : <ChefHat size={18} />}
      {!compact && <span className={active ? 'hidden 2xl:inline' : 'hidden sm:inline xl:hidden 2xl:inline'}>{active ? 'End shift' : 'Be the barista'}</span>}
    </motion.button>
  )
}

/** Card shown after a shift with the takings. */
export function ShiftSummary() {
  const summary = useShiftStore((s) => s.summary)
  const stats = useShiftStore((s) => s.stats)
  const close = useShiftStore((s) => s.closeSummary)
  const start = useShiftStore((s) => s.startShift)
  const rating = averageRating(stats)
  return (
    <AnimatePresence>
      {summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 grid place-items-center bg-espresso/30 p-4 backdrop-blur-sm">
          <motion.div initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.96 }} className="glass-panel w-full max-w-sm rounded-3xl p-6 text-center">
            <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-terracotta uppercase">End of shift</p>
            <h2 className="font-serif text-3xl font-semibold">Shift complete</h2>
            <p className="mt-4 font-serif text-5xl font-semibold">{formatPrice(stats.earnings)}</p>
            <p className="text-sm text-espresso/60">earned, including {formatPrice(stats.tips)} in tips</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <Stat label="Served" value={String(stats.served)} />
              <Stat label="Walked out" value={String(stats.lost)} />
              <Stat label="Rating" value={rating ? `${rating.toFixed(1)} ★` : '—'} />
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={close} className="flex-1 rounded-full border border-espresso/15 px-4 py-3 text-sm font-semibold hover:bg-white/60">
                Explore
              </button>
              <PrimaryButton onClick={start} className="flex-1">
                <ChefHat size={16} /> New shift
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/55 px-2 py-3">
      <p className="font-serif text-2xl font-semibold">{value}</p>
      <p className="text-[0.68rem] text-espresso/60">{label}</p>
    </div>
  )
}

/** Banner inside the coffee / dessert panels reminding the barista what was ordered. */
export function ShiftOrderBanner() {
  const active = useShiftStore((s) => s.active)
  const customers = useShiftStore((s) => s.customers)
  const front = lineOf(customers)[0]
  if (!active || front?.phase !== 'waiting') return null
  const o = front.order
  return (
    <div className="mb-4 rounded-2xl border border-terracotta/30 bg-terracotta/10 px-3 py-2 text-[0.8rem]">
      <span className="font-semibold">{front.name} ordered:</span> {COFFEES[o.coffee].label}
      {o.art && ` with a ${artLabel(o.art).toLowerCase()}`}
      {o.dessert && ` + ${DESSERTS[o.dessert].label.toLowerCase()}`}
    </div>
  )
}

/** Brief fade that covers the cut when stepping behind (or out from behind) the counter. */
export function ShiftFade() {
  const active = useShiftStore((s) => s.active)
  const [nonce, setNonce] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setNonce((n) => n + 1)
  }, [active])
  return (
    <AnimatePresence>
      {nonce > 0 && (
        <motion.div
          key={nonce}
          className="pointer-events-none fixed inset-0 z-30 bg-espresso"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.05 }}
        />
      )}
    </AnimatePresence>
  )
}
