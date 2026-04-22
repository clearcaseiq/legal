# Postgres Cutover

The API has been switched to Prisma's `postgresql` provider.

Because the existing historical Prisma migration SQL in `prisma/migrations/` was generated for MySQL, a fresh Postgres environment should be initialized with `db push` instead of replaying those legacy SQL migrations.

## Fresh Postgres setup

1. Create a fresh database.
2. Set `DATABASE_URL` to a Postgres connection string.
3. From `api`, run:

```bash
pnpm prisma:generate
pnpm prisma:deploy:fresh
```

4. Optionally seed:

```bash
pnpm prisma db seed
```

## Notes

- `prisma:dev` now uses `prisma db push --accept-data-loss` for fresh-schema sync.
- The app no longer expects MySQL-specific native Prisma types like `@db.LongText`.
- The LegalMatch importer is production-gated and can run against the fresh Postgres-backed app once `DATABASE_URL` points at the new database.
