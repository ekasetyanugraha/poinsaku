-- =============================================================================
-- Initial Schema: Enums, Core Entity Tables, Programs, Customers, RBAC, RLS
-- =============================================================================
-- Architecture:
--   - Multiple program types (stamp + membership)
--   - Business-branch hierarchy
--   - Scope-based RBAC (owner/admin/cashier at business or branch level)
--   - Global customers (not tied to a single business)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: Enums
-- -----------------------------------------------------------------------------

-- RBAC
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'cashier');
CREATE TYPE member_scope_type AS ENUM ('business', 'branch');

-- Programs
CREATE TYPE program_type AS ENUM ('stamp', 'membership');
CREATE TYPE program_scope_type AS ENUM ('business', 'branch');
CREATE TYPE stamp_mode AS ENUM ('per_transaction', 'amount_based');
CREATE TYPE cashback_redemption_mode AS ENUM ('transaction_deduction', 'voucher');
CREATE TYPE tier_upgrade_rule AS ENUM ('total_spend', 'transaction_count', 'manual_only');

-- Transactions
CREATE TYPE transaction_type AS ENUM (
  'stamp_add',
  'stamp_redemption',
  'cashback_earn',
  'cashback_redeem',
  'tier_upgrade',
  'voucher_issued'
);

-- Vouchers
CREATE TYPE voucher_status AS ENUM ('active', 'redeemed', 'expired');

-- Wallet passes
CREATE TYPE wallet_provider AS ENUM ('apple', 'google', 'samsung');

-- Customers
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- -----------------------------------------------------------------------------
-- SECTION 2: Core Entity Tables
-- -----------------------------------------------------------------------------

-- businesses
-- Ownership is through members table; no auth_user_id here
CREATE TABLE IF NOT EXISTS businesses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- branches
-- Each branch belongs to a business; slug must be unique within a business
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  logo_url    TEXT,                          -- Nullable; falls back to business logo_url if null
  latitude    NUMERIC(10,7),                 -- For wallet pass location relevance
  longitude   NUMERIC(10,7),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

-- members
-- Scope-based RBAC: a member is scoped to either a business or a branch.
-- scope_id is polymorphic (no FK — enforced via trigger).
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          member_role NOT NULL,
  scope_type    member_scope_type NOT NULL,
  scope_id      UUID NOT NULL,              -- Polymorphic: businesses.id or branches.id
  invited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, scope_type, scope_id),
  -- Role-scope integrity:
  --   owner must be scoped to a business
  --   cashier must be scoped to a branch
  --   admin can be scoped to either
  CHECK (
    (role = 'owner' AND scope_type = 'business') OR
    (role = 'cashier' AND scope_type = 'branch') OR
    (role = 'admin')
  )
);

-- customers
-- Global customers, not tied to a single business.
-- Phone is the global identifier; auth_user_id is optional (account linking).
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT,
  gender        gender_type,
  auth_user_id  UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- customer_business_enrollments
-- Tracks which customers are enrolled with which businesses.
CREATE TABLE IF NOT EXISTS customer_business_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, business_id)
);

-- -----------------------------------------------------------------------------
-- SECTION 3: Extensions and Triggers
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- -----------------------------------------------------------------------------
-- SECTION 4: Foreign Key Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_branches_business ON branches(business_id);
CREATE INDEX idx_members_auth_user ON members(auth_user_id);
CREATE INDEX idx_members_scope ON members(scope_id);
CREATE INDEX idx_enrollments_business ON customer_business_enrollments(business_id);

-- -----------------------------------------------------------------------------
-- SECTION 5: Program Tables
-- -----------------------------------------------------------------------------

-- programs
-- Base table for all loyalty program types (stamp and membership).
-- scope_id is polymorphic: references businesses.id or branches.id depending on scope_type.
CREATE TABLE IF NOT EXISTS programs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type             program_type NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  scope_type       program_scope_type NOT NULL,
  scope_id         UUID NOT NULL,              -- Polymorphic: businesses.id or branches.id (no FK)
  color_primary    TEXT NOT NULL DEFAULT '#6366f1',
  color_secondary  TEXT NOT NULL DEFAULT '#ffffff',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- program_stamp_config
-- Extension table for stamp-type programs (1:1 with programs).
CREATE TABLE IF NOT EXISTS program_stamp_config (
  program_id              UUID PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
  stamp_target            INTEGER NOT NULL CHECK (stamp_target BETWEEN 1 AND 30),
  stamp_mode              stamp_mode NOT NULL,
  amount_per_stamp        NUMERIC(15,2),       -- For amount_based mode
  stamps_per_transaction  INTEGER NOT NULL DEFAULT 1,  -- For per_transaction mode
  reward_description      TEXT
);

-- program_membership_config
-- Extension table for membership-type programs (1:1 with programs).
CREATE TABLE IF NOT EXISTS program_membership_config (
  program_id                 UUID PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
  cashback_redemption_mode   cashback_redemption_mode NOT NULL
);

-- membership_tiers
-- Tiers within a membership program, ordered by rank (higher = better).
CREATE TABLE IF NOT EXISTS membership_tiers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id               UUID NOT NULL REFERENCES program_membership_config(program_id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  rank                     INTEGER NOT NULL,
  cashback_percentage      NUMERIC(5,2) NOT NULL,
  auto_upgrade_rule_type   tier_upgrade_rule NOT NULL,
  auto_upgrade_threshold   NUMERIC(15,2),     -- Nullable when manual_only
  color                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, rank),
  UNIQUE (program_id, name)
);

-- membership_voucher_options
-- Voucher templates redeemable via cashback balance.
CREATE TABLE IF NOT EXISTS membership_voucher_options (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id     UUID NOT NULL REFERENCES program_membership_config(program_id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  cashback_cost  NUMERIC(15,2) NOT NULL,
  expiry_days    INTEGER NOT NULL,
  image_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- SECTION 6: Program Table Triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON membership_tiers
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON membership_voucher_options
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- -----------------------------------------------------------------------------
-- SECTION 7: Program Table FK Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_programs_business ON programs(business_id);
CREATE INDEX idx_membership_tiers_program ON membership_tiers(program_id);
CREATE INDEX idx_membership_voucher_options_program ON membership_voucher_options(program_id);

-- -----------------------------------------------------------------------------
-- SECTION 8: Customer Enrollment Tables
-- -----------------------------------------------------------------------------

-- customer_programs
-- Tracks a customer's enrollment in a specific loyalty program.
-- branch_id is nullable: NULL = business-wide enrollment, non-NULL = branch-specific.
-- Partial unique indexes handle the NULL branch_id case correctly.
CREATE TABLE IF NOT EXISTS customer_programs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  program_id   UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,  -- Nullable
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active    BOOLEAN NOT NULL DEFAULT true
);

-- Enforce uniqueness for business-wide enrollments (branch_id IS NULL)
CREATE UNIQUE INDEX uq_customer_program_biz
  ON customer_programs (customer_id, program_id)
  WHERE branch_id IS NULL;

-- Enforce uniqueness for branch-specific enrollments (branch_id IS NOT NULL)
CREATE UNIQUE INDEX uq_customer_program_branch
  ON customer_programs (customer_id, program_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- customer_stamp_progress
-- Extension table for stamp-program enrollments (1:1 with customer_programs).
CREATE TABLE IF NOT EXISTS customer_stamp_progress (
  customer_program_id   UUID PRIMARY KEY REFERENCES customer_programs(id) ON DELETE CASCADE,
  current_stamps        INTEGER NOT NULL DEFAULT 0,
  total_stamps_earned   INTEGER NOT NULL DEFAULT 0,
  total_redemptions     INTEGER NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- customer_membership_state
-- Extension table for membership-program enrollments (1:1 with customer_programs).
CREATE TABLE IF NOT EXISTS customer_membership_state (
  customer_program_id      UUID PRIMARY KEY REFERENCES customer_programs(id) ON DELETE CASCADE,
  current_tier_id          UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,
  cashback_balance         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_spend              NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_transaction_count  INTEGER NOT NULL DEFAULT 0,
  tier_upgraded_at         TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- SECTION 9: Customer Enrollment Triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON customer_stamp_progress
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON customer_membership_state
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- -----------------------------------------------------------------------------
-- SECTION 10: Customer Enrollment FK Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_customer_programs_customer ON customer_programs(customer_id);
CREATE INDEX idx_customer_programs_program ON customer_programs(program_id);
CREATE INDEX idx_customer_programs_branch ON customer_programs(branch_id);

-- -----------------------------------------------------------------------------
-- SECTION 11: Transaction and Voucher Tables
-- -----------------------------------------------------------------------------

-- transactions
-- Immutable record of every loyalty event. Denormalized business_id for query efficiency.
-- All type-specific columns are nullable; only the relevant ones are populated per type.
CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_program_id   UUID NOT NULL REFERENCES customer_programs(id) ON DELETE CASCADE,
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,   -- Denormalized
  branch_id             UUID REFERENCES branches(id) ON DELETE SET NULL,             -- Nullable
  type                  transaction_type NOT NULL,
  performed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,           -- Nullable — customer-initiated
  transaction_amount    NUMERIC(15,2),                                               -- Nullable
  stamps_count          INTEGER,                                                      -- Nullable
  cashback_amount       NUMERIC(15,2),                                               -- Nullable
  tier_from_id          UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,     -- Nullable
  tier_to_id            UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,     -- Nullable
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at: transactions are immutable
);

-- vouchers
-- Issued vouchers redeemable by customers. Denormalized business_id for efficient queries.
CREATE TABLE IF NOT EXISTS vouchers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_program_id   UUID NOT NULL REFERENCES customer_programs(id) ON DELETE CASCADE,
  voucher_option_id     UUID NOT NULL REFERENCES membership_voucher_options(id) ON DELETE CASCADE,
  transaction_id        UUID REFERENCES transactions(id) ON DELETE SET NULL,         -- The cashback_redeem transaction
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,   -- Denormalized
  code                  TEXT UNIQUE,
  status                voucher_status NOT NULL,
  expires_at            TIMESTAMPTZ NOT NULL,
  redeemed_at           TIMESTAMPTZ,                                                 -- Nullable
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- SECTION 12: Transaction and Voucher Triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- -----------------------------------------------------------------------------
-- SECTION 13: Transaction and Voucher Indexes
-- -----------------------------------------------------------------------------

-- Composite indexes for efficient business-level and customer-level queries
CREATE INDEX idx_transactions_business_created ON transactions(business_id, created_at DESC);
CREATE INDEX idx_transactions_customer_program_created ON transactions(customer_program_id, created_at DESC);

-- FK indexes on nullable FKs not covered by the composite indexes
CREATE INDEX idx_transactions_branch ON transactions(branch_id);
CREATE INDEX idx_transactions_performed_by ON transactions(performed_by);
CREATE INDEX idx_transactions_tier_from ON transactions(tier_from_id);
CREATE INDEX idx_transactions_tier_to ON transactions(tier_to_id);

-- Composite index for voucher status queries per business
CREATE INDEX idx_vouchers_business_status ON vouchers(business_id, status);

-- FK indexes on non-UNIQUE FKs
CREATE INDEX idx_vouchers_customer_program ON vouchers(customer_program_id);
CREATE INDEX idx_vouchers_voucher_option ON vouchers(voucher_option_id);
CREATE INDEX idx_vouchers_transaction ON vouchers(transaction_id);

-- -----------------------------------------------------------------------------
-- SECTION 14: QR Tokens and Wallet Passes Tables
-- -----------------------------------------------------------------------------

-- qr_tokens
-- Short-lived tokens (60s expiry) used to identify customers at POS via QR scan.
CREATE TABLE IF NOT EXISTS qr_tokens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_program_id   UUID NOT NULL REFERENCES customer_programs(id) ON DELETE CASCADE,
  token                 TEXT UNIQUE NOT NULL,
  expires_at            TIMESTAMPTZ NOT NULL,
  is_used               BOOLEAN NOT NULL DEFAULT false
);

-- wallet_passes
-- Tracks issued digital wallet passes per customer enrollment and provider.
CREATE TABLE IF NOT EXISTS wallet_passes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_program_id   UUID NOT NULL REFERENCES customer_programs(id) ON DELETE CASCADE,
  provider              wallet_provider NOT NULL,
  pass_identifier       TEXT,
  push_token            TEXT,                                                        -- Nullable — for future push updates
  last_updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_program_id, provider)
);

-- -----------------------------------------------------------------------------
-- SECTION 15: QR Tokens and Wallet Passes Triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON wallet_passes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(last_updated_at);

-- -----------------------------------------------------------------------------
-- SECTION 16: QR Tokens and Wallet Passes Indexes
-- -----------------------------------------------------------------------------

-- Composite index for fast token lookup with expiry check
CREATE INDEX idx_qr_tokens_token_expires ON qr_tokens(token, expires_at);

-- FK index on qr_tokens (customer_program_id not covered by a unique constraint)
CREATE INDEX idx_qr_tokens_customer_program ON qr_tokens(customer_program_id);

-- wallet_passes: (customer_program_id, provider) is already covered by the UNIQUE constraint;
-- no additional FK index needed for customer_program_id.

-- -----------------------------------------------------------------------------
-- SECTION 17: Polymorphic FK Validation Triggers
-- -----------------------------------------------------------------------------

-- Validates members.scope_id references correct table
CREATE OR REPLACE FUNCTION validate_member_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scope_type = 'business' THEN
    IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = NEW.scope_id) THEN
      RAISE EXCEPTION 'scope_id % does not reference a valid business', NEW.scope_id;
    END IF;
  ELSIF NEW.scope_type = 'branch' THEN
    IF NOT EXISTS (SELECT 1 FROM branches WHERE id = NEW.scope_id) THEN
      RAISE EXCEPTION 'scope_id % does not reference a valid branch', NEW.scope_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_member_scope
  BEFORE INSERT OR UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION validate_member_scope();

-- Same pattern for programs.scope_id
CREATE OR REPLACE FUNCTION validate_program_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scope_type = 'business' THEN
    IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = NEW.scope_id) THEN
      RAISE EXCEPTION 'scope_id % does not reference a valid business', NEW.scope_id;
    END IF;
  ELSIF NEW.scope_type = 'branch' THEN
    IF NOT EXISTS (SELECT 1 FROM branches WHERE id = NEW.scope_id) THEN
      RAISE EXCEPTION 'scope_id % does not reference a valid branch', NEW.scope_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_program_scope
  BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION validate_program_scope();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: get_member_access
-- Returns one row per membership for the given user, with resolved business_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_member_access(uid uuid)
RETURNS TABLE(
  business_id uuid,
  branch_id uuid,
  role member_role,
  scope_type member_scope_type
) SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE
AS $$
  SELECT
    CASE
      WHEN m.scope_type = 'business' THEN m.scope_id
      WHEN m.scope_type = 'branch' THEN b.business_id
    END AS business_id,
    CASE
      WHEN m.scope_type = 'branch' THEN m.scope_id
      ELSE NULL
    END AS branch_id,
    m.role,
    m.scope_type
  FROM members m
  LEFT JOIN branches b ON m.scope_type = 'branch' AND b.id = m.scope_id
  WHERE m.auth_user_id = uid;
$$;

-- ---------------------------------------------------------------------------
-- Core entities: businesses, branches, members
-- ---------------------------------------------------------------------------

-- BUSINESSES
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view businesses they belong to" ON businesses FOR SELECT
  USING (id IN (SELECT business_id FROM get_member_access(auth.uid())));

CREATE POLICY "Authenticated users can create businesses" ON businesses FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Owners and business-admins can update" ON businesses FOR UPDATE
  USING (id IN (
    SELECT business_id FROM get_member_access(auth.uid())
    WHERE role IN ('owner', 'admin') AND scope_type = 'business'
  ));

CREATE POLICY "Only owners can delete" ON businesses FOR DELETE
  USING (id IN (
    SELECT business_id FROM get_member_access(auth.uid()) WHERE role = 'owner'
  ));

-- BRANCHES
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branches they have access to" ON branches FOR SELECT
  USING (business_id IN (SELECT business_id FROM get_member_access(auth.uid())));

CREATE POLICY "Owners and business-admins can insert branches" ON branches FOR INSERT
  TO authenticated WITH CHECK (business_id IN (
    SELECT business_id FROM get_member_access(auth.uid())
    WHERE role IN ('owner', 'admin') AND scope_type = 'business'
  ));

CREATE POLICY "Owners and business-admins can update branches" ON branches FOR UPDATE
  USING (business_id IN (
    SELECT business_id FROM get_member_access(auth.uid())
    WHERE role IN ('owner', 'admin') AND scope_type = 'business'
  ));

CREATE POLICY "Only owners can delete branches" ON branches FOR DELETE
  USING (business_id IN (
    SELECT business_id FROM get_member_access(auth.uid()) WHERE role = 'owner'
  ));

-- MEMBERS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members in their business" ON members FOR SELECT
  USING (
    CASE
      WHEN scope_type = 'business' THEN scope_id
      WHEN scope_type = 'branch' THEN (SELECT business_id FROM branches WHERE id = scope_id)
    END IN (SELECT business_id FROM get_member_access(auth.uid()))
  );

CREATE POLICY "Owners and business-admins can add members" ON members FOR INSERT
  TO authenticated WITH CHECK (
    CASE
      WHEN scope_type = 'business' THEN scope_id
      WHEN scope_type = 'branch' THEN (SELECT business_id FROM branches WHERE id = scope_id)
    END IN (
      SELECT business_id FROM get_member_access(auth.uid())
      WHERE role IN ('owner', 'admin') AND scope_type = 'business'
    )
    AND (role != 'owner' OR auth.uid() IN (
      SELECT m.auth_user_id FROM members m WHERE m.role = 'owner'
      AND m.scope_type = 'business' AND m.scope_id = CASE
        WHEN scope_type = 'business' THEN scope_id
        WHEN scope_type = 'branch' THEN (SELECT business_id FROM branches WHERE id = scope_id)
      END
    ))
  );

CREATE POLICY "Only owners can delete members" ON members FOR DELETE
  USING (
    CASE
      WHEN scope_type = 'business' THEN scope_id
      WHEN scope_type = 'branch' THEN (SELECT business_id FROM branches WHERE id = scope_id)
    END IN (
      SELECT business_id FROM get_member_access(auth.uid()) WHERE role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- Programs and customer data
-- ---------------------------------------------------------------------------

-- PROGRAMS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view programs in their business" ON programs FOR SELECT
  USING (business_id IN (SELECT business_id FROM get_member_access(auth.uid())));

CREATE POLICY "Owners and admins can insert programs" ON programs FOR INSERT
  TO authenticated WITH CHECK (business_id IN (
    SELECT business_id FROM get_member_access(auth.uid())
    WHERE role IN ('owner', 'admin')
  ));

CREATE POLICY "Owners and admins can update programs" ON programs FOR UPDATE
  USING (business_id IN (
    SELECT business_id FROM get_member_access(auth.uid())
    WHERE role IN ('owner', 'admin')
  ));

CREATE POLICY "Only owners can delete programs" ON programs FOR DELETE
  USING (business_id IN (
    SELECT business_id FROM get_member_access(auth.uid()) WHERE role = 'owner'
  ));

-- Extension tables inherit access through programs FK
ALTER TABLE program_stamp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_membership_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_voucher_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access through program" ON program_stamp_config FOR SELECT
  USING (program_id IN (
    SELECT id FROM programs WHERE business_id IN (
      SELECT business_id FROM get_member_access(auth.uid())
    )
  ));

CREATE POLICY "Access through program" ON program_membership_config FOR SELECT
  USING (program_id IN (
    SELECT id FROM programs WHERE business_id IN (
      SELECT business_id FROM get_member_access(auth.uid())
    )
  ));

CREATE POLICY "Access through program" ON membership_tiers FOR SELECT
  USING (program_id IN (
    SELECT program_id FROM program_membership_config WHERE program_id IN (
      SELECT id FROM programs WHERE business_id IN (
        SELECT business_id FROM get_member_access(auth.uid())
      )
    )
  ));

CREATE POLICY "Access through program" ON membership_voucher_options FOR SELECT
  USING (program_id IN (
    SELECT program_id FROM program_membership_config WHERE program_id IN (
      SELECT id FROM programs WHERE business_id IN (
        SELECT business_id FROM get_member_access(auth.uid())
      )
    )
  ));

-- INSERT/UPDATE/DELETE for program extension tables — owner/admin through same join
CREATE POLICY "Owners and admins can manage" ON program_stamp_config FOR ALL
  USING (program_id IN (
    SELECT id FROM programs WHERE business_id IN (
      SELECT business_id FROM get_member_access(auth.uid()) WHERE role IN ('owner', 'admin')
    )
  ));

CREATE POLICY "Owners and admins can manage" ON program_membership_config FOR ALL
  USING (program_id IN (
    SELECT id FROM programs WHERE business_id IN (
      SELECT business_id FROM get_member_access(auth.uid()) WHERE role IN ('owner', 'admin')
    )
  ));

CREATE POLICY "Owners and admins can manage" ON membership_tiers FOR ALL
  USING (program_id IN (
    SELECT program_id FROM program_membership_config WHERE program_id IN (
      SELECT id FROM programs WHERE business_id IN (
        SELECT business_id FROM get_member_access(auth.uid()) WHERE role IN ('owner', 'admin')
      )
    )
  ));

CREATE POLICY "Owners and admins can manage" ON membership_voucher_options FOR ALL
  USING (program_id IN (
    SELECT program_id FROM program_membership_config WHERE program_id IN (
      SELECT id FROM programs WHERE business_id IN (
        SELECT business_id FROM get_member_access(auth.uid()) WHERE role IN ('owner', 'admin')
      )
    )
  ));

-- CUSTOMERS + ENROLLMENTS (read via business access, write via service role)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_business_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View customers enrolled in your business" ON customers FOR SELECT
  USING (id IN (
    SELECT customer_id FROM customer_business_enrollments
    WHERE business_id IN (SELECT business_id FROM get_member_access(auth.uid()))
  ));

CREATE POLICY "View enrollments for your business" ON customer_business_enrollments FOR SELECT
  USING (business_id IN (SELECT business_id FROM get_member_access(auth.uid())));

-- ---------------------------------------------------------------------------
-- Customer programs, transactions, vouchers, QR tokens, wallet passes
-- ---------------------------------------------------------------------------

-- CUSTOMER_PROGRAMS + extensions (read via business, write via service role)
ALTER TABLE customer_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_stamp_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_membership_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View customer programs in your business" ON customer_programs FOR SELECT
  USING (program_id IN (
    SELECT id FROM programs WHERE business_id IN (
      SELECT business_id FROM get_member_access(auth.uid())
    )
  ));

CREATE POLICY "View stamp progress in your business" ON customer_stamp_progress FOR SELECT
  USING (customer_program_id IN (
    SELECT id FROM customer_programs WHERE program_id IN (
      SELECT id FROM programs WHERE business_id IN (
        SELECT business_id FROM get_member_access(auth.uid())
      )
    )
  ));

CREATE POLICY "View membership state in your business" ON customer_membership_state FOR SELECT
  USING (customer_program_id IN (
    SELECT id FROM customer_programs WHERE program_id IN (
      SELECT id FROM programs WHERE business_id IN (
        SELECT business_id FROM get_member_access(auth.uid())
      )
    )
  ));

-- TRANSACTIONS (read via business/branch scope, write via service role)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View transactions in your scope" ON transactions FOR SELECT
  USING (business_id IN (SELECT business_id FROM get_member_access(auth.uid())));

-- VOUCHERS
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View vouchers in your business" ON vouchers FOR SELECT
  USING (business_id IN (SELECT business_id FROM get_member_access(auth.uid())));

-- QR_TOKENS + WALLET_PASSES (service role only for mutations)
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_passes ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — all access via service role
