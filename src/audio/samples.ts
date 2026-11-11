/**
 * Recorded sounds in `public/sounds/` (credits in public/sounds/CREDITS.md).
 * They load after the first user gesture; until a file has loaded, or if it
 * fails to, the synthesised version of the sound is used instead.
 */
export const SAMPLE_FILES = {
  music: 'music.mp3',
  ambience: 'cafe-ambience.mp3',
  deskBell: 'desk-bell.mp3',
  door: 'door-bell.mp3',
  cash: 'cash-register.mp3',
  ticket: 'order-write.mp3',
  orderChime: 'order-chime.mp3',
  grind: 'coffee-grinder.mp3',
  pour: 'espresso-pour.mp3',
  steam: 'milk-steam.mp3',
  clink: 'cup-clink.mp3',
  thanks: 'thank-you.mp3',
} as const

export type SampleId = keyof typeof SAMPLE_FILES

const loaded = new Map<SampleId, AudioBuffer | null>()
const pending = new Map<SampleId, Promise<AudioBuffer | null>>()

/** Fetches and decodes a sample once; resolves to null if it is missing or unreadable. */
export function loadSample(ac: BaseAudioContext, id: SampleId): Promise<AudioBuffer | null> {
  let p = pending.get(id)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}sounds/${SAMPLE_FILES[id]}`)
      .then((r) => (r.ok && !r.headers.get('content-type')?.includes('text/html') ? r.arrayBuffer() : Promise.reject(new Error(`missing ${id}`))))
      .then((data) => ac.decodeAudioData(data))
      .catch(() => null)
      .then((buf) => {
        loaded.set(id, buf)
        return buf
      })
    pending.set(id, p)
  }
  return p
}

/** Starts loading the short effects (music and ambience load when first needed). */
export function preloadEffects(ac: BaseAudioContext) {
  for (const id of Object.keys(SAMPLE_FILES) as SampleId[]) if (id !== 'music' && id !== 'ambience') void loadSample(ac, id)
}

/** The decoded sample, if it has already loaded. */
export const sample = (id: SampleId) => loaded.get(id) ?? null
