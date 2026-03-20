# Technology Stack

**Analysis Date:** 2026-03-20

## Languages

**Primary:**
- TypeScript 5+ - Used across entire project (frontend, server, and type definitions)
- Vue 3.5.30 - Component framework for frontend
- HTML/CSS - Markup and styling through Tailwind CSS

## Runtime

**Environment:**
- Node.js (via Bun) - JavaScript runtime for server

**Package Manager:**
- Bun (type: "module" indicates ESM) - Project-native package manager
- Lockfile: `.pnpm-lock.yaml` (pnpm-based lockfile)

## Frameworks

**Core:**
- Nuxt 4.0.0 - Full-stack Vue.js framework (SSR + API routes)
- Vue Router 5.0.3 - Routing for SPA pages
- Vue 3.5.30 - Component framework

**UI:**
- @nuxt/ui 4.5.1 - Component library with Tailwind CSS integration
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- @iconify-json/lucide 1.2.97 - Icon set integration

**Testing:**
- Vitest 4.1.0 - Unit test runner (configured in package.json)
- Run: `npm run test` (runs `vitest run --reporter=verbose`)

**Build/Dev:**
- Vite (built into Nuxt 4) - Module bundler and dev server
- Nuxt dev server: runs on port 8989 (configured in `nuxt.config.ts`)

## Key Dependencies

**Critical:**
- @nuxtjs/supabase 2.0.4 - Supabase authentication and client integration
- zod 4.3.6 - Runtime schema validation (used in all server validators)
- date-fns 4.1.0 - Date/time utilities
- @vueuse/core 14.2.1 - Vue 3 composition utilities

**Infrastructure:**
- passkit-generator 3.5.7 - Apple Wallet pass generation (not yet fully integrated)
- qrcode 1.5.4 - QR code generation for loyalty programs
- jsonwebtoken 9.0.3 - JWT signing for Google Wallet and Samsung Wallet integrations
- crypto (Node.js built-in) - Used for token generation and verification

## Configuration

**Environment:**
- Configured via `runtimeConfig` in `nuxt.config.ts`
- Public config via `runtimeConfig.public` (accessible on client)
- Private config for sensitive keys (server-only)

**Required environment variables:**
- `SUPABASE_URL` - Supabase project URL (set up via @nuxtjs/supabase)
- `SUPABASE_KEY` - Supabase anonymous key (set up via @nuxtjs/supabase)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin service role key for server-side operations
- `APPLE_PASS_TYPE_ID` - Apple Wallet pass type identifier
- `APPLE_TEAM_ID` - Apple Developer Team ID
- `APPLE_WWDR_CERT` - Apple Worldwide Developer Relations certificate
- `APPLE_SIGNER_CERT` - Certificate for signing passes
- `APPLE_SIGNER_KEY` - Private key for signing passes
- `APPLE_SIGNER_KEY_PASSPHRASE` - Passphrase for signer key
- `GOOGLE_WALLET_ISSUER_ID` - Google Wallet issuer identifier
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google service account email
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` - Google service account private key (RSA)
- `SAMSUNG_PARTNER_ID` - Samsung Wallet partner ID
- `SAMSUNG_CARD_ID` - Samsung Wallet card ID
- `SAMSUNG_PRIVATE_KEY` - Samsung private key for signing
- `QR_TOKEN_SECRET` - Secret for QR token verification

**Build:**
- `nuxt.config.ts` - Main Nuxt configuration
- `tsconfig.json` - TypeScript root config (extends `.nuxt/tsconfig.json`)
- `server/tsconfig.json` - Server TypeScript config

## Platform Requirements

**Development:**
- Node.js (via Bun) with TypeScript 5+
- npm/Bun for dependency management
- Port 8989 for dev server (configurable via `nuxt.config.ts`)

**Production:**
- Node.js runtime environment
- Environment variables for all external service credentials
- Static file hosting for generated assets

## Database

**Primary:**
- Supabase (PostgreSQL) - Main data store
- Connected via @nuxtjs/supabase + serverSupabaseServiceRole for admin operations
- Generated types: `app/types/database.types.ts` (generated via `supabase gen types`)

## Key Design Patterns

**Module System:**
- ESM (ES modules) - `"type": "module"` in package.json
- Path aliases managed by Nuxt auto-imports and TypeScript

**Dev Tools:**
- Devtools: enabled in `nuxt.config.ts` for development

---

*Stack analysis: 2026-03-20*
