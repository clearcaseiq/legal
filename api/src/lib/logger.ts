import pino from 'pino'

/**
 * Production writes structured JSON to stdout with no transport, which is what
 * Docker's log driver expects. `pino-pretty` is development-only.
 *
 * `LOG_LEVEL` exists so verbosity can be raised during an incident by restarting
 * the container with one variable changed. Without it the level is compiled into
 * the image and getting debug output from production needs a code change and a
 * redeploy — which is exactly when you can least afford one.
 */
const DEFAULT_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug'
const VALID_LEVELS = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])

const requestedLevel = (process.env.LOG_LEVEL || '').trim().toLowerCase()
const level = VALID_LEVELS.has(requestedLevel) ? requestedLevel : DEFAULT_LEVEL

export const logger = pino({
  level,
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  } : undefined
}) as any
