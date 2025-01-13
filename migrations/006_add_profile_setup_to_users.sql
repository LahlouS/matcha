ALTER TABLE users
ADD COLUMN profile_is_setup BOOLEAN DEFAULT FALSE;
UPDATE users SET profile_is_setup = FALSE;