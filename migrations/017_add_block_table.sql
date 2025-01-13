CREATE TABLE blocks (
	blocker_id TEXT NOT NULL,
	blocked_id TEXT NOT NULL,
	block_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (blocker_id, blocked_id),
	FOREIGN KEY (blocker_id) REFERENCES users(id),
	FOREIGN KEY (blocked_id) REFERENCES users(id)
);
