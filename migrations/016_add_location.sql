
CREATE TABLE location (
    user_id TEXT PRIMARY KEY NOT NULL,
	longitude DECIMAL(9,6),
	latitude DECIMAL(9,6),
	FOREIGN KEY (user_id) REFERENCES users(id)
);
