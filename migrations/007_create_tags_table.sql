CREATE TABLE tags (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    tag VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
