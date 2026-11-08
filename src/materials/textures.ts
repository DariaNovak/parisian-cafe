/**
 * Procedural textures painted on <canvas> at startup. No external images are
 * needed at runtime, and every texture is created once and shared.
 */
import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

const cache = new Map<string, Texture>()

function canvasTexture(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true): Texture {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  paint(ctx, w, h)
  const tex = new CanvasTexture(canvas)
  if (srgb) tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.minFilter = LinearMipmapLinearFilter
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** Deterministic PRNG so textures look identical on every load. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * (1 + amount)))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) * (1 + amount)))
  const b = Math.min(255, Math.max(0, (n & 255) * (1 + amount)))
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

/**
 * Parisian "point de Hongrie" chevron parquet. Tileable: 4 chevron columns,
 * planks slanted at 45° meeting on each column's centre line.
 */
export function parquetTexture() {
  return canvasTexture('parquet', 1024, 1024, (ctx, w, h) => {
    const rand = rng(7)
    const tones = ['#9A6A45', '#A57550', '#8C5E3C', '#B07F57', '#946440', '#A06C47']
    ctx.fillStyle = '#4E3322'
    ctx.fillRect(0, 0, w, h)
    const cols = 4
    const cw = w / cols
    const half = cw / 2
    const pw = 64 // plank width measured vertically
    for (let c = 0; c < cols; c++) {
      for (const side of [0, 1]) {
        const x0 = c * cw + side * half
        for (let y = -half; y < h + half; y += pw) {
          const tone = tones[Math.floor(rand() * tones.length)]
          // Left half rises to the right, right half falls -> chevron pointing up.
          const dy = side === 0 ? -half : half
          const yy = side === 0 ? y : y - half
          ctx.beginPath()
          ctx.moveTo(x0 + 1, yy + 1)
          ctx.lineTo(x0 + half - 1, yy + dy + 1)
          ctx.lineTo(x0 + half - 1, yy + dy + pw - 1)
          ctx.lineTo(x0 + 1, yy + pw - 1)
          ctx.closePath()
          const grad = ctx.createLinearGradient(x0, yy, x0 + half, yy + dy)
          grad.addColorStop(0, shade(tone, -0.07))
          grad.addColorStop(0.5, shade(tone, 0.06))
          grad.addColorStop(1, shade(tone, -0.05))
          ctx.fillStyle = grad
          ctx.fill()
          // Grain streaks along the plank.
          ctx.save()
          ctx.clip()
          ctx.globalAlpha = 0.16
          ctx.strokeStyle = shade(tone, -0.4)
          for (let g = 0; g < 4; g++) {
            const o = 8 + rand() * (pw - 16)
            ctx.beginPath()
            ctx.moveTo(x0, yy + o)
            ctx.lineTo(x0 + half, yy + dy + o + (rand() * 6 - 3))
            ctx.stroke()
          }
          ctx.restore()
        }
      }
    }
    // Soft overall variation (sun-faded and worn patches).
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = 0.04
      ctx.fillStyle = rand() > 0.5 ? '#FFE3BC' : '#2E1D12'
      ctx.beginPath()
      ctx.arc(rand() * w, rand() * h, 40 + rand() * 120, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
}

/** Pastel awning stripes (pink / cream), U across the awning. */
export function awningTexture() {
  return canvasTexture('awning', 512, 64, (ctx, w, h) => {
    const n = 16
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#F7EFE4' : '#E3A9B1'
      ctx.fillRect((i * w) / n, 0, w / n + 1, h)
    }
    // Faint canvas weave.
    const rand = rng(3)
    ctx.globalAlpha = 0.06
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#382820'
      ctx.fillRect(rand() * w, rand() * h, 2, 1)
    }
    ctx.globalAlpha = 1
  })
}

/** Haussmann-style dressed stone: horizontal courses and faint vertical joints. */
export function stoneCoursesTexture() {
  return canvasTexture('stone', 512, 512, (ctx, w, h) => {
    const rand = rng(11)
    ctx.fillStyle = '#EFE3D1'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      ctx.globalAlpha = 0.05
      ctx.fillStyle = rand() > 0.5 ? '#FFFFFF' : '#B8A487'
      const s = 2 + rand() * 6
      ctx.fillRect(rand() * w, rand() * h, s, s)
    }
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = '#C9B79C'
    ctx.lineWidth = 3
    const courses = 4
    for (let r = 0; r < courses; r++) {
      const y = (r * h) / courses
      ctx.beginPath()
      ctx.moveTo(0, y + 1)
      ctx.lineTo(w, y + 1)
      ctx.stroke()
      const offset = r % 2 ? w / 4 : 0
      for (let c = 0; c < 2; c++) {
        const x = offset + (c * w) / 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + h / courses)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  })
}

/** Long wood grain for the counter, shelves and doors. */
export function woodGrainTexture() {
  return canvasTexture('wood', 512, 512, (ctx, w, h) => {
    const rand = rng(5)
    ctx.fillStyle = '#7A4F33'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = rand() > 0.5 ? '#8E6142' : '#5E3A24'
      ctx.globalAlpha = 0.25 + rand() * 0.3
      ctx.lineWidth = 1 + rand() * 3
      const y = rand() * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 4 + rand() * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
}

/** Vintage travel-poster art with the Eiffel Tower silhouette. */
export function posterTexture(variant: 0 | 1 | 2) {
  return canvasTexture(`poster${variant}`, 256, 360, (ctx, w, h) => {
    const bg = ['#E9BFC4', '#A8B5A0', '#FFD9A0'][variant]
    const fg = ['#382820', '#2F3D33', '#C77D62'][variant]
    ctx.fillStyle = '#F5EBDD'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = bg
    ctx.fillRect(14, 14, w - 28, h - 28)
    ctx.fillStyle = '#FFF6E8'
    ctx.beginPath()
    ctx.arc(w * 0.62, h * 0.32, 46, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = fg
    if (variant === 1) {
      // A steaming cup.
      ctx.fillRect(w * 0.3, h * 0.48, w * 0.4, h * 0.2)
      ctx.beginPath()
      ctx.arc(w * 0.72, h * 0.56, 14, -Math.PI / 2, Math.PI / 2)
      ctx.lineWidth = 7
      ctx.strokeStyle = fg
      ctx.stroke()
      ctx.fillRect(w * 0.22, h * 0.68, w * 0.56, 8)
      ctx.lineWidth = 4
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(w * (0.38 + i * 0.1), h * 0.45)
        ctx.bezierCurveTo(w * (0.34 + i * 0.1), h * 0.38, w * (0.44 + i * 0.1), h * 0.34, w * (0.39 + i * 0.1), h * 0.27)
        ctx.stroke()
      }
    } else {
      // Eiffel tower silhouette.
      const cx = w / 2, base = h * 0.78, top = h * 0.12
      ctx.beginPath()
      ctx.moveTo(cx, top)
      ctx.lineTo(cx + 10, h * 0.42)
      ctx.lineTo(cx + 26, h * 0.6)
      ctx.lineTo(cx + 60, base)
      ctx.lineTo(cx + 36, base)
      ctx.quadraticCurveTo(cx, h * 0.62, cx - 36, base)
      ctx.lineTo(cx - 60, base)
      ctx.lineTo(cx - 26, h * 0.6)
      ctx.lineTo(cx - 10, h * 0.42)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(cx - 30, h * 0.6, 60, 6)
      ctx.fillRect(cx - 16, h * 0.42, 32, 5)
    }
    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    ctx.font = 'italic 600 30px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(['Paris', 'Café', 'Bonjour'][variant], w / 2, h * 0.88)
  })
}

/** Chalkboard menu with hand-lettered prices. */
export function chalkboardTexture() {
  return canvasTexture('chalk', 512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#2B2F2C'
    ctx.fillRect(0, 0, w, h)
    const rand = rng(9)
    ctx.globalAlpha = 0.06
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(rand() * w, rand() * h, 30 + rand() * 60, 10 + rand() * 20, rand() * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 0.92
    ctx.fillStyle = '#F5EBDD'
    ctx.textAlign = 'center'
    ctx.font = 'italic 600 46px "Cormorant Garamond", Georgia, serif'
    ctx.fillText('La Carte', w / 2, 62)
    ctx.font = '500 26px "Cormorant Garamond", Georgia, serif'
    const items: Array<[string, string]> = [['Espresso', '2,80'], ['Cappuccino', '4,20'], ['Café Latte', '4,60'], ['Croissant', '2,40'], ['Macaron', '2,10'], ['Tarte aux fraises', '5,50']]
    items.forEach(([name, price], i) => {
      const y = 112 + i * 40
      ctx.textAlign = 'left'
      ctx.fillText(name, 54, y)
      ctx.textAlign = 'right'
      ctx.fillText(`${price} €`, w - 54, y)
    })
    ctx.strokeStyle = '#E9BFC4'
    ctx.lineWidth = 2
    ctx.strokeRect(18, 18, w - 36, h - 36)
    ctx.globalAlpha = 1
  })
}

/** Small printed menu / magazine covers for table props. */
export function paperTexture(kind: 'menu' | 'magazine' | 'book') {
  return canvasTexture(`paper-${kind}`, 128, 180, (ctx, w, h) => {
    const bg = kind === 'menu' ? '#F5EBDD' : kind === 'magazine' ? '#E9BFC4' : '#2F3D33'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = kind === 'book' ? '#E8D5C0' : '#382820'
    ctx.textAlign = 'center'
    ctx.font = 'italic 600 22px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(kind === 'menu' ? 'Menu' : kind === 'magazine' ? 'VOGUE' : 'Proust', w / 2, 36)
    ctx.globalAlpha = 0.45
    for (let i = 0; i < 8; i++) ctx.fillRect(18, 56 + i * 13, w - 36 - (i % 3) * 14, 3)
    ctx.globalAlpha = 1
  })
}

/** Paris sidewalk: large limestone slabs (2 × 2 per tile) with darker joints. */
export function sidewalkTexture() {
  return canvasTexture('sidewalk', 512, 512, (ctx, w, h) => {
    const rand = rng(21)
    ctx.fillStyle = '#8E857A'
    ctx.fillRect(0, 0, w, h)
    const tones = ['#CFC5B7', '#C7BCAD', '#D4CBBE', '#C2B8AA']
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 2; c++) {
        const x = c * (w / 2) + (r % 2) * 0, y = r * (h / 2)
        ctx.fillStyle = tones[Math.floor(rand() * tones.length)]
        ctx.fillRect(x + 3, y + 3, w / 2 - 6, h / 2 - 6)
        for (let i = 0; i < 500; i++) {
          ctx.globalAlpha = 0.07
          ctx.fillStyle = rand() > 0.5 ? '#FFFFFF' : '#6E6458'
          ctx.fillRect(x + 3 + rand() * (w / 2 - 8), y + 3 + rand() * (h / 2 - 8), 2 + rand() * 4, 2 + rand() * 4)
        }
        ctx.globalAlpha = 1
      }
  })
}

/** White bevelled "métro" subway tiles, 7.5 × 15 cm, running bond. One tile = 0.6 m. */
export function metroTileTexture() {
  return canvasTexture('metro', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#CFC6B8'
    ctx.fillRect(0, 0, w, h)
    const tw = w / 4, th = h / 8
    for (let r = 0; r < 8; r++)
      for (let c = -1; c < 5; c++) {
        const x = c * tw + (r % 2) * (tw / 2), y = r * th
        const g = ctx.createLinearGradient(x, y, x, y + th)
        g.addColorStop(0, '#FFFFFF')
        g.addColorStop(0.5, '#F6F2EB')
        g.addColorStop(1, '#E2DACE')
        ctx.fillStyle = g
        ctx.fillRect(x + 3, y + 3, tw - 6, th - 6)
      }
  })
}
