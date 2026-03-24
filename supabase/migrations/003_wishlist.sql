-- Wishlist submissions table for pre-release lead collection
CREATE TABLE IF NOT EXISTS wishlist_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  company     TEXT,
  industry    TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wishlist_submissions ENABLE ROW LEVEL SECURITY;
-- No user-facing policies. All access via service role in API endpoints.
