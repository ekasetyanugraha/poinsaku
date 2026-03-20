# PoinSaku - Kartu Stempel Digital

Digital loyalty stamp card platform for businesses. Customers collect stamps and redeem rewards — no app download required.

## Tech Stack

- **Frontend**: Nuxt 4, Vue 3, Nuxt UI 4, Tailwind CSS 4
- **Backend**: Nuxt Server API (H3)
- **Database**: Supabase (PostgreSQL)
- **Wallet**: Apple Wallet, Google Wallet, Samsung Wallet
- **Auth**: Supabase Auth

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Docker](https://www.docker.com/) (required for local Supabase)

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Supabase

Start the local Supabase instance:

```bash
bunx supabase start
```

Run migrations:

```bash
bun run db:migrate
```

Generate TypeScript types from the database schema:

```bash
bun run db:gen-types
```

## Development

```bash
bun run dev
```

Opens at `http://localhost:8989`.

## Production

```bash
bun run build
bun run preview
```

## Project Structure

```
app/
  pages/           # Nuxt pages (dashboard, cashier, public)
  components/      # Vue components
  composables/     # Shared logic (useAuth, useTransaction, etc.)
  middleware/      # Auth & role guards
  types/           # Generated Supabase types
server/
  api/             # REST API endpoints
  utils/           # Server helpers (auth, supabase client, validators)
supabase/
  migrations/      # SQL migrations
  config.toml      # Local Supabase config
design-system/     # Design system documentation
```

## Architecture

All data operations go through `/server/api` — the frontend never calls Supabase directly (except Realtime subscriptions).
