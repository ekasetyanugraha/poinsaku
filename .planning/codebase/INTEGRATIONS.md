# External Integrations

**Analysis Date:** 2026-03-20

## APIs & External Services

**Digital Wallets (Loyalty Pass Distribution):**
- **Apple Wallet** - Users can add loyalty cards to Apple Wallet
  - SDK/Client: `passkit-generator` 3.5.7
  - Auth: Service role certificates stored in environment (APPLE_*)
  - Endpoint: `POST /api/wallet/apple`
  - Status: Partially implemented (stub; requires Apple Developer certificates)
  - Records passes in `wallet_passes` table

- **Google Wallet** - Users can add loyalty cards to Google Pay
  - SDK/Client: `jsonwebtoken` 9.0.3 (for JWT signing)
  - Auth: Google service account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
  - Endpoint: `POST /api/wallet/google`
  - Status: Fully implemented
  - Creates JWT-signed loyalty objects and classes
  - Returns save URL: `https://pay.google.com/gp/v/save/{token}`
  - Records passes in `wallet_passes` table

- **Samsung Wallet** - Users can add loyalty cards to Samsung Pay
  - SDK/Client: `jsonwebtoken` 9.0.3 (for JWT signing)
  - Auth: Samsung Partner Portal credentials (SAMSUNG_PARTNER_ID, SAMSUNG_CARD_ID, SAMSUNG_PRIVATE_KEY)
  - Endpoint: `POST /api/wallet/samsung`
  - Status: Fully implemented
  - Creates JWT-signed card objects
  - Returns save URL: `https://a.swallet.link/atw/v1/{partnerId}/{cardId}?data={token}`
  - Records passes in `wallet_passes` table

## Data Storage

**Databases:**
- **Supabase (PostgreSQL)**
  - Connection: Via `@nuxtjs/supabase` 2.0.4 and `serverSupabaseServiceRole()` for admin access
  - Client: `@nuxtjs/supabase` (reactive) and service role (admin mutations)
  - Environment vars: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Type generation: `npm run db:gen-types` generates `app/types/database.types.ts`
  - Schema migration: `npm run db:migrate` (runs `supabase migration up`)

**File Storage:**
- Local filesystem only - No external file storage service configured
- Logo URLs stored as strings in database (e.g., `logo_url` in businesses/programs)

**Caching:**
- None detected - All data fetched from Supabase directly

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** - Email/password authentication
  - Implementation: OAuth-like flow with Supabase session management
  - Login endpoint: `POST /api/auth/callback` (callback handler)
  - Admin API: Service role used for user creation/deletion/updates in staff management
  - Admin methods used: `auth.admin.createUser()`, `auth.admin.deleteUser()`, `auth.admin.updateUserById()`
  - Session stored in browser via `@nuxtjs/supabase`
  - Redirect rules configured in `nuxt.config.ts`:
    - Login page: `/login`
    - Callback: `/confirm`
    - Protected routes: `/dashboard/*`, `/cashier/*`
    - Public routes: `/`, `/join/*`, `/card/*`, `/staff/login`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No external error tracking service configured

**Logs:**
- console.log (implicit) - Server logs via Node.js console
- No structured logging framework detected

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase - Deployment platform TBD

**CI Pipeline:**
- Not detected - No CI configuration files found

## Environment Configuration

**Required env vars (from nuxt.config.ts runtimeConfig):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin service role
- `APPLE_PASS_TYPE_ID` - Apple Wallet pass type
- `APPLE_TEAM_ID` - Apple Developer team ID
- `APPLE_WWDR_CERT` - Apple WWDR certificate
- `APPLE_SIGNER_CERT` - Apple signer certificate
- `APPLE_SIGNER_KEY` - Apple signer private key
- `APPLE_SIGNER_KEY_PASSPHRASE` - Passphrase for signer key
- `GOOGLE_WALLET_ISSUER_ID` - Google Wallet issuer ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google service account email
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` - Google service account RSA key
- `SAMSUNG_PARTNER_ID` - Samsung wallet partner ID
- `SAMSUNG_CARD_ID` - Samsung wallet card ID
- `SAMSUNG_PRIVATE_KEY` - Samsung private key
- `QR_TOKEN_SECRET` - Secret for QR token verification

**Secrets location:**
- Environment variables (not committed to git)
- `.env` file in development (should not be committed)
- CI/deployment platform secrets in production

## Webhooks & Callbacks

**Incoming:**
- `POST /api/auth/callback` - OAuth callback from Supabase Auth

**Outgoing:**
- None detected
- Apple/Google/Samsung wallet integrations are request-response only (no webhooks)

## QR Code & Token Generation

**QR Token Service:**
- Endpoint: `POST /api/qr/generate`
- Implementation: Cryptographically random 32-byte hex tokens
- Token lifetime: 60 seconds
- Crypto: Node.js built-in `crypto.randomBytes()`
- Storage: `qr_tokens` table with expiry tracking
- Usage: QR codes encode URL `{appUrl}/card/{customerProgramId}` with optional token

**QR Code Generation:**
- Library: `qrcode` 1.5.4
- Usage: Client-side generation of QR codes from URLs
- Format: URL-based (typically for loyalty card pages)

## Wallet Pass System

**Wallet Passes Table:**
- Stores pass generation records
- Fields: `customer_program_id`, `provider` (apple/google/samsung), `pass_identifier`
- Used to track which passes have been generated for which customers

**Pass Data Models:**

*Google Wallet:*
- Loyalty objects: account ID, balance (stamps or cashback), barcode (QR)
- Loyalty classes: issuer name, program name, background color
- Dynamic balance updates via pass updates endpoint

*Samsung Wallet:*
- Data fields: program name, member name, stamps/target or tier/cashback
- Card type: loyalty

*Apple Wallet:*
- Not fully implemented - Awaiting certificates
- Placeholder: Records intent in wallet_passes table

---

*Integration audit: 2026-03-20*
