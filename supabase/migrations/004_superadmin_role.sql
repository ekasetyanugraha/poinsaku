-- Add 'superadmin' to member_role enum
ALTER TYPE member_role ADD VALUE 'superadmin';

-- Drop and recreate the CHECK constraint on members table to allow superadmin
-- The original constraint is unnamed and auto-named by PostgreSQL (members_check or similar).
-- We use a DO block to find and drop it by expression match, then add the new one.
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
  (role = 'owner' AND scope_type = 'business') OR
  (role = 'cashier' AND scope_type = 'branch') OR
  (role = 'admin') OR
  (role = 'superadmin' AND scope_type = 'business')
);
