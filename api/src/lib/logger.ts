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

const LEVEL_METHODS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const

/**
 * An Error's `message` and `stack` are non-enumerable, so an Error that reaches
 * the JSON serializer untouched writes itself as `{}`. Registering the standard
 * serializer under both keys means it does not matter whether a caller wrote
 * `{ err }` or `{ error }` — the codebase uses both. Non-Errors pass through so
 * that a plain `{ error: 'not found' }` string still logs as that string.
 */
const errSerializer = (value: unknown) =>
  value instanceof Error ? pino.stdSerializers.err(value as Error) : value

/**
 * pino's signature is `(mergingObject, message)`. Nearly every call in this
 * codebase is written the other way round — `logger.error('Something failed',
 * { error })` — and pino reads that trailing object as a printf argument for a
 * placeholder that is not in the string, so it discards it. The sentence
 * survived and every piece of context was thrown away.
 *
 * That is not a cosmetic problem. An admin endpoint returned 500 on every
 * request for want of one Prisma field name, and the only trace of it in
 * production was the words "Failed to list platform payments" with no error,
 * no code, and no stack.
 *
 * Rewriting ~1,380 call sites would be a far worse trade than teaching the
 * logger the order they already use, so this flips `(string, object)` into
 * `(object, string)`. A message containing a printf placeholder is left alone,
 * because there the trailing argument really is an interpolation value.
 */
/**
 * Holds the untouched pino method on the wrapper that replaced it. pino builds
 * a child with `Object.create(parent)`, so a child inherits the parent's
 * wrapper — and re-wrapping *that* would call a function already bound to the
 * parent, silently dropping the child's own bindings. Recovering the pristine
 * method and binding it to the child is what keeps `child({ scope })` working.
 */
const PRISTINE = Symbol('pino.pristineMethod')

function adaptArgumentOrder<T extends pino.Logger>(instance: T): T {
  const target = instance as any

  for (const method of [...LEVEL_METHODS, 'child'] as const) {
    const inherited = target[method]
    const pristine = inherited[PRISTINE] ?? inherited
    const bound = pristine.bind(instance)

    const wrapper: any =
      method === 'child'
        ? (...args: unknown[]) => adaptArgumentOrder(bound(...args))
        : (...args: unknown[]) => {
            const [first, second, ...rest] = args
            const flip =
              typeof first === 'string' &&
              !first.includes('%') &&
              typeof second === 'object' &&
              second !== null &&
              !Array.isArray(second)

            return flip ? bound(second, first, ...rest) : bound(...args)
          }

    wrapper[PRISTINE] = pristine
    // An own property, so it shadows the inherited wrapper rather than mutating
    // the parent every child would share.
    Object.defineProperty(target, method, { value: wrapper, writable: true, configurable: true })
  }

  return instance
}

/**
 * `destination` exists for tests. pino writes through sonic-boom straight to
 * the file descriptor, so a spy on `process.stdout.write` never sees a line and
 * the behaviour above cannot be asserted without injecting a stream.
 */
export function createLogger(destination?: pino.DestinationStream): any {
  const options: pino.LoggerOptions = {
    level,
    serializers: { err: errSerializer, error: errSerializer },
  }

  if (!destination && process.env.NODE_ENV === 'development') {
    options.transport = { target: 'pino-pretty', options: { colorize: true } }
  }

  return adaptArgumentOrder(destination ? pino(options, destination) : pino(options))
}

export const logger = createLogger()
