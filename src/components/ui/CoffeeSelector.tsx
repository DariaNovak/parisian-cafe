import { AnimatePresence, motion } from 'framer-motion'
import { Check, Coffee, Heart, Leaf, Milk, Play, Sparkles } from 'lucide-react'
import { useCafeStore } from '../../app/store/useCafeStore'
import { COFFEES, CUPS, LATTE_ARTS, PHASE_DURATION, PHASE_LABEL, type BrewPhase, type CoffeeType, type CupId, type LatteArt } from '../../features/coffee/coffeeConfig'
import { useCoffeeStore } from '../../features/coffee/useCoffeeStore'
import { formatPrice } from '../../features/ordering/useOrderStore'
import { OptionCard, Panel, PrimaryButton } from './Panel'
import { ShiftOrderBanner } from './ShiftHud'

const CUP_SWATCH: Record<CupId, string> = { demitasse: '#FBF7F0', classic: '#E9BFC4', bowl: '#A8B5A0' }
const ART_ICON: Record<Exclude<LatteArt, 'none'>, typeof Heart> = { heart: Heart, rosetta: Leaf, tulip: Sparkles }

/** Ordered list of visible steps for the progress tracker. */
function stepsFor(coffee: CoffeeType): Array<{ phase: BrewPhase; label: string }> {
  const base = [
    { phase: 'grinding' as const, label: 'Grind' },
    { phase: 'brewing' as const, label: 'Extract' },
  ]
  const milk = COFFEES[coffee].milk
    ? [
        { phase: 'steaming' as const, label: 'Steam milk' },
        { phase: 'pouring-milk' as const, label: 'Pour' },
        { phase: 'drawing-art' as const, label: 'Latte art' },
      ]
    : []
  return [...base, ...milk, { phase: 'done' as const, label: 'Serve' }]
}

const ORDER: BrewPhase[] = ['select', 'grinding', 'brewing', 'steaming', 'pouring-milk', 'art', 'drawing-art', 'done', 'serving']

function SelectStep() {
  const coffee = useCoffeeStore((s) => s.coffee)
  const cup = useCoffeeStore((s) => s.cup)
  const selectCoffee = useCoffeeStore((s) => s.selectCoffee)
  const selectCup = useCoffeeStore((s) => s.selectCup)
  return (
    <div className="space-y-5">
      <section>
        <StepTitle n={1} label="Choose your coffee" />
        <div className="space-y-2">
          {Object.values(COFFEES).map((c) => (
            <OptionCard key={c.id} selected={coffee === c.id} onClick={() => selectCoffee(c.id)}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-espresso/8 text-espresso">{c.milk ? <Milk size={17} /> : <Coffee size={17} />}</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="font-serif text-xl font-semibold">{c.label}</p>
                    <p className="text-sm font-semibold text-espresso/80">{formatPrice(c.price)}</p>
                  </div>
                  <p className="text-[0.8rem] leading-snug text-espresso/65">{c.description}</p>
                </div>
              </div>
            </OptionCard>
          ))}
        </div>
      </section>
      <section>
        <StepTitle n={2} label="Select a cup" />
        <div className="grid grid-cols-3 gap-2">
          {Object.values(CUPS).map((c) => (
            <OptionCard key={c.id} selected={cup === c.id} onClick={() => selectCup(c.id)}>
              <div className="flex flex-col items-center gap-1.5 py-1 text-center">
                <span className="h-7 w-9 rounded-b-[14px] rounded-t-sm border border-espresso/15 shadow-inner" style={{ background: CUP_SWATCH[c.id] }} />
                <span className="text-[0.75rem] leading-tight font-medium">{c.label}</span>
                <span className="text-[0.68rem] text-espresso/55">{c.surcharge ? `+${formatPrice(c.surcharge)}` : 'included'}</span>
              </div>
              {coffee && COFFEES[coffee].recommendedCup === c.id && <span className="absolute -top-2 right-2 rounded-full bg-sage px-2 py-0.5 text-[0.6rem] font-semibold text-espresso">ideal</span>}
            </OptionCard>
          ))}
        </div>
      </section>
    </div>
  )
}

function StepTitle({ n, label }: { n: number; label: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.16em] text-espresso/60 uppercase">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-espresso text-[0.65rem] text-cream">{n}</span>
      {label}
    </p>
  )
}

/** Live view of the brewing state machine. */
function BrewingStep() {
  const coffee = useCoffeeStore((s) => s.coffee)!
  const phase = useCoffeeStore((s) => s.phase)
  const phaseStart = useCoffeeStore((s) => s.phaseStart)
  const chooseArt = useCoffeeStore((s) => s.chooseArt)
  const steps = stepsFor(coffee)
  const currentIndex = ORDER.indexOf(phase)
  const duration = PHASE_DURATION[phase]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white/55 p-4">
        <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-terracotta uppercase">{COFFEES[coffee].label}</p>
        <AnimatePresence mode="wait">
          <motion.p key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="font-serif text-2xl font-semibold">
            {PHASE_LABEL[phase]}
          </motion.p>
        </AnimatePresence>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-espresso/10">
          {/* Animated by CSS/motion over the phase duration — no per-frame React updates. */}
          <motion.div
            key={`${phase}-${phaseStart}`}
            className="h-full rounded-full bg-terracotta"
            initial={{ width: duration ? '0%' : '100%' }}
            animate={{ width: '100%' }}
            transition={{ duration: duration ?? 0.3, ease: 'linear' }}
          />
        </div>
      </div>

      <ol className="space-y-1.5">
        {steps.map((s) => {
          const idx = ORDER.indexOf(s.phase)
          const done = currentIndex > idx || (s.phase === 'done' && phase === 'serving')
          const active = s.phase === phase || (s.phase === 'drawing-art' && phase === 'art')
          return (
            <li key={s.phase} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${active ? 'bg-white/70 font-semibold' : 'text-espresso/60'}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full border text-[0.6rem] ${done ? 'border-sage bg-sage text-espresso' : active ? 'border-terracotta text-terracotta' : 'border-espresso/20'}`}>
                {done ? <Check size={12} strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta" /> : null}
              </span>
              {s.label}
            </li>
          )
        })}
      </ol>

      <AnimatePresence>
        {phase === 'art' && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <StepTitle n={3} label="Add latte art" />
            <div className="grid grid-cols-3 gap-2">
              {LATTE_ARTS.map((a) => {
                const Icon = ART_ICON[a.id as Exclude<LatteArt, 'none'>]
                return (
                  <OptionCard key={a.id} selected={false} onClick={() => chooseArt(a.id)}>
                    <div className="flex flex-col items-center gap-1 py-1">
                      <Icon size={20} className="text-terracotta" />
                      <span className="text-[0.78rem] font-medium">{a.label}</span>
                    </div>
                  </OptionCard>
                )
              })}
            </div>
            <button onClick={() => chooseArt('none')} className="mt-2 w-full text-center text-xs text-espresso/55 underline-offset-2 hover:underline">
              Skip latte art
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Coffee preparation panel: select → brew (live) → latte art → serve. */
export function CoffeeSelector() {
  const closePanel = useCafeStore((s) => s.closePanel)
  const phase = useCoffeeStore((s) => s.phase)
  const coffee = useCoffeeStore((s) => s.coffee)
  const cup = useCoffeeStore((s) => s.cup)
  const start = useCoffeeStore((s) => s.start)
  const serve = useCoffeeStore((s) => s.serve)
  const selecting = phase === 'select'
  const price = coffee && cup ? COFFEES[coffee].price + CUPS[cup].surcharge : null

  const footer = selecting ? (
    <PrimaryButton onClick={start} disabled={!coffee || !cup}>
      <Play size={16} /> {coffee && cup ? `Start the machine · ${formatPrice(price!)}` : 'Choose a coffee and a cup'}
    </PrimaryButton>
  ) : phase === 'done' ? (
    <PrimaryButton onClick={serve}>
      <Check size={16} /> Serve to the tray
    </PrimaryButton>
  ) : phase === 'serving' ? (
    <p className="text-center text-sm text-espresso/70">Placing your cup on the tray…</p>
  ) : (
    <p className="text-center text-sm text-espresso/70">Watch the barista at work ☕</p>
  )

  return (
    <Panel eyebrow="The counter" title={selecting ? 'Prepare a coffee' : 'Brewing'} onClose={closePanel} footer={footer}>
      <ShiftOrderBanner />
      {selecting ? <SelectStep /> : <BrewingStep />}
    </Panel>
  )
}
