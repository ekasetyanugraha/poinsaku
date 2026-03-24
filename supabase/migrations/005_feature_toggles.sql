-- Create feature_toggles table for runtime feature management by superadmins
CREATE TABLE IF NOT EXISTS feature_toggles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  label       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_feature_toggles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER feature_toggles_updated_at
  BEFORE UPDATE ON feature_toggles
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_toggles_updated_at();

-- Seed initial toggle: wishlist_mode (previously controlled by env var)
INSERT INTO feature_toggles (key, enabled, label, description)
VALUES (
  'wishlist_mode',
  false,
  'Wishlist Mode',
  'Tampilkan form wishlist dan sembunyikan login/register di landing page'
)
ON CONFLICT (key) DO NOTHING;

-- Enable Supabase Realtime on the table
ALTER PUBLICATION supabase_realtime ADD TABLE feature_toggles;

-- Enable Row Level Security
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon + authenticated) to read feature toggles
-- Writes are performed via service role only (through API endpoints)
CREATE POLICY "Anyone can read feature toggles"
  ON feature_toggles
  FOR SELECT
  USING (true);
