/**
 * Asset pipeline: exports the procedural builders in src/models/builders as
 * binary glTF (GLB) files into public/models. The GLBs are Blender-compatible,
 * so they can be opened, refined and re-exported by an artist without touching code.
 *
 * Run with:  npm run build:models   (Node >= 22.18 strips TypeScript types natively)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { MODEL_BUILDERS } from '../src/models/builders/models.ts'

// GLTFExporter uses the browser FileReader API to assemble GLB chunks; provide a tiny Node shim.
class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.onloadend?.()
    })
  }
}
;(globalThis as unknown as { FileReader: typeof NodeFileReader }).FileReader = NodeFileReader

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models')
mkdirSync(outDir, { recursive: true })

const exporter = new GLTFExporter()
for (const [key, build] of Object.entries(MODEL_BUILDERS)) {
  const root = build()
  const glb = (await exporter.parseAsync(root, { binary: true, animations: root.animations })) as ArrayBuffer
  const file = resolve(outDir, `${key}.glb`)
  writeFileSync(file, Buffer.from(glb))
  console.log(`✓ ${key}.glb  ${(glb.byteLength / 1024).toFixed(1)} KB  (${root.animations.length} animation clip(s))`)
}
