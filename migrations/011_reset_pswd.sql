ALTER TABLE users
ADD COLUMN password_is_set BOOLEAN DEFAULT TRUE;
UPDATE users SET password_is_set = TRUE;

CREATE TABLE reset_pswd_sessions (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
	email TEXT NOT NULL,
	old_password_hash TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
