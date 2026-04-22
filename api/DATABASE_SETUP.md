# Database Setup

The `injury_intelligence` database exists, but Prisma needs valid MySQL credentials.

**Update `api/.env`** with your actual MySQL user and password:

```
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/injury_intelligence"
```

Examples:
- `mysql://root:YourPassword@localhost:3306/injury_intelligence`
- `mysql://root:@localhost:3306/injury_intelligence` (no password)

Then run:
```powershell
cd api
pnpm prisma migrate deploy
```
