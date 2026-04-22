#!/usr/bin/env node
const { spawnSync } = require('child_process')
const path = require('path')

const dir = path.join(__dirname, 'caselaw_personal_injury')
const r = spawnSync('python', ['-m', 'pytest', 'tests', '-q'], {
  cwd: dir,
  stdio: 'inherit',
  shell: true,
})
process.exit(r.status == null ? 1 : r.status)
