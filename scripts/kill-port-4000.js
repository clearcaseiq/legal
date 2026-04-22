#!/usr/bin/env node
// Kills any process listening on port 4000 (Windows-compatible)
const { execSync } = require('child_process')
const os = require('os')

const port = 4000
const isWin = os.platform() === 'win32'

try {
  if (isWin) {
    const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' })
    const lines = out.split('\n').filter(l => l.includes('LISTENING'))
    const pids = new Set()
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (/^\d+$/.test(pid)) pids.add(pid)
    }
    for (const pid of pids) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' })
      console.log(`Killed process ${pid} on port ${port}`)
    }
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'inherit' })
  }
} catch (e) {
  // Port might not be in use
}
