# TapTeck Admin Portal

Simple admin dashboard — Next.js 15, PostgreSQL, Prisma, NextAuth.

## Quick start

### 1. Create the database (once)

```sql
CREATE DATABASE tapteck_admin;
```

### 2. Configure `.env`

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/tapteck_admin?schema=public"
AUTH_SECRET="your-random-secret"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important:** `AUTH_URL` and `NEXT_PUBLIC_APP_URL` must match the port the app runs on (default `3000`).

### 3. Install & set up tables

```bash
npm install
npm run db:setup
```

### 4. Run the app

```bash
npm run dev
```

Open **http://localhost:3000**

### 5. Log in

| Email | Password |
|-------|----------|
| `admin@tapteck.com` | `Admin@123` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start on port **3000** |
| `npm run db:setup` | Create tables + admin user |
| `npm run build` | Production build |

## Change port

If you need a different port, update **all three** places:

1. `package.json` → `"dev": "next dev --turbopack -p 3001"`
2. `.env` → `AUTH_URL="http://localhost:3001"`
3. `.env` → `NEXT_PUBLIC_APP_URL="http://localhost:3001"`

Then restart the dev server.
