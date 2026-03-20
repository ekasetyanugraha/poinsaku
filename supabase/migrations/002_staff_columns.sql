-- Staff account columns for member display and status management
ALTER TABLE members ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE members ADD COLUMN display_name TEXT;
