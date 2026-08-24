/**
 * Refuses to let a `--accept-data-loss` Prisma command run against anything that
 * looks like a real database.
 *
 * Why this exists: `prisma:deploy:fresh` was `db push --accept-data-loss` under a
 * name that reads like the production deploy command, and `POSTGRES_CUTOVER.md`
 * told operators to run it. Nothing automated invoked it — the container
 * entrypoint deliberately omits the flag — but on a host with the repo checked
 * out and `.env.prod` sourced, one command would drop production tables without
 * a prompt. The script is now named `prisma:reset:local`, and this guard makes
 * the name binding rather than advisory.
 *
 * The test is the database host, not NODE_ENV, because an operator running this
 * by hand almost certainly has NODE_ENV unset while DATABASE_URL points at RDS.
 * Set ALLOW_DESTRUCTIVE_PRISMA=yes-destroy-data to override for the rare case of
 * deliberately resetting a remote scratch database.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'db', 'postgres', 'host.docker.internal'])

const url = process.env.DATABASE_URL

if (!url) {
  console.error('DATABASE_URL is not set. Refusing to run a destructive Prisma command against an unknown target.')
  process.exit(1)
}

if (process.env.ALLOW_DESTRUCTIVE_PRISMA === 'yes-destroy-data') {
  console.warn('ALLOW_DESTRUCTIVE_PRISMA is set. Proceeding with a destructive Prisma command.')
  process.exit(0)
}

let host
try {
  host = new URL(url).hostname
} catch {
  console.error('DATABASE_URL could not be parsed. Refusing to run a destructive Prisma command.')
  process.exit(1)
}

if (LOCAL_HOSTS.has(host)) {
  process.exit(0)
}

console.error(
  [
    '',
    `Refusing to run a destructive Prisma command against "${host}".`,
    '',
    'This command runs `db push --accept-data-loss`, which drops columns and tables',
    'without prompting. It is intended for a local development database only.',
    '',
    'To apply schema changes to a deployed environment, restart the API container:',
    'its entrypoint runs `prisma db push` WITHOUT --accept-data-loss, which applies',
    'additive changes and aborts rather than destroying data.',
    '',
    'If you genuinely mean to reset a remote scratch database, re-run with',
    'ALLOW_DESTRUCTIVE_PRISMA=yes-destroy-data set.',
    '',
  ].join('\n'),
)
process.exit(1)
