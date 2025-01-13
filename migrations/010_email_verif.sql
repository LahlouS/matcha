ALTER TABLE users
ADD COLUMN email_is_setup BOOLEAN DEFAULT FALSE;
UPDATE users SET email_is_setup = FALSE;

CREATE TABLE email_sessions (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
	email TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
