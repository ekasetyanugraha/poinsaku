-- Add 'superadmin' to member_role enum
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in PG < 16,
-- so we use IF NOT EXISTS and commit-safe pattern.
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'superadmin';

-- Drop and recreate the CHECK constraint on members table to allow superadmin.
-- We cast role to text so PG doesn't complain about the new enum value
-- being used in the same transaction as ALTER TYPE ADD VALUE.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'members'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%scope_type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE members DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE members ADD CONSTRAINT members_role_scope_check CHECK (
  (role::text = 'owner' AND scope_type = 'business') OR
  (role::text = 'cashier' AND scope_type = 'branch') OR
  (role::text = 'admin') OR
  (role::text = 'superadmin' AND scope_type = 'business')
);
