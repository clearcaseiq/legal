/**
 * pdf-parse v2 expects browser DOM APIs. Install polyfills before importing pdf-parse.
 */
import { createRequire } from 'node:module'

const loadModule = createRequire(__filename)

if (typeof globalThis.DOMMatrix === 'undefined') {
  const { DOMMatrix, DOMPoint } = loadModule('@thednp/dommatrix')
  globalThis.DOMMatrix = DOMMatrix
  if (typeof globalThis.DOMPoint === 'undefined' && DOMPoint) {
    globalThis.DOMPoint = DOMPoint
  }
}
