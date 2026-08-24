# Postgres Cutover

The API has been switched to Prisma's `postgresql` provider.

Because the existing historical Prisma migration SQL in `prisma/migrations/` was generated for MySQL, a fresh Postgres environment should be initialized with `db push` instead of replaying those legacy SQL migrations.

## Fresh Postgres setup

1. Create a fresh database.
2. Set `DATABASE_URL` to a Postgres connection string.
3. From `api`, run:

```bash
pnpm prisma:generate
pnpm prisma:reset:local
```

4. Optionally seed:

```bash
pnpm prisma db seed
```

## Deployed environments

Do **not** run the command above against QA or production. It carries
`--accept-data-loss`, which drops columns and tables without prompting, and it is
guarded to refuse any non-local `DATABASE_URL` for that reason.

Deployed environments get their schema from the API container entrypoint, which
runs `prisma db push` *without* that flag on every boot: additive changes apply,
anything destructive aborts and the container refuses to start. To apply a schema
change, deploy the new image.

## Notes

- `prisma:reset:local` was previously named `prisma:deploy:fresh`, which read like
  a production deploy command while being the most destructive script in the repo.
- `prisma:dev` also uses `prisma db push --accept-data-loss` for fresh-schema sync,
  behind the same guard.
- The app no longer expects MySQL-specific native Prisma types like `@db.LongText`.
- The LegalMatch importer is production-gated and can run against the fresh Postgres-backed app once `DATABASE_URL` points at the new database.
