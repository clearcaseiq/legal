// PDF.js needs its worker served as a plain file whose version matches the
// library exactly, so it is copied from the installed package on every run.
const fs = require('fs')
const path = require('path')

const src = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs')
fs.copyFileSync(src, dest)
