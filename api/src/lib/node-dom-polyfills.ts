/**
 * pdf-parse v2 expects browser DOM APIs. Install polyfills before importing pdf-parse.
 */
import { createRequire } from 'node:module'

const loadModule = createRequire(__filename)

// Node < 20.16 lacks process.getBuiltinModule, which pdf-parse v2 calls internally to
// load its own polyfills. Without it, pdf-parse fails to parse/render PDFs entirely.
const proc = process as unknown as { getBuiltinModule?: (id: string) => unknown }
if (typeof proc.getBuiltinModule !== 'function') {
  proc.getBuiltinModule = (id: string) => {
    try {
      return loadModule(id)
    } catch {
      return loadModule(id.startsWith('node:') ? id.slice(5) : `node:${id}`)
    }
  }
}

if (typeof globalThis.DOMMatrix === 'undefined') {
  const { DOMMatrix, DOMPoint } = loadModule('@thednp/dommatrix')
  globalThis.DOMMatrix = DOMMatrix
  if (typeof globalThis.DOMPoint === 'undefined' && DOMPoint) {
    globalThis.DOMPoint = DOMPoint
  }
}
