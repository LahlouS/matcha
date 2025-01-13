CREATE TABLE connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id_1 TEXT NOT NULL,
    user_id_2 TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id_1, user_id_2),
    CHECK (user_id_1 != user_id_2),
    FOREIGN KEY (user_id_1) REFERENCES users(id),
    FOREIGN KEY (user_id_2) REFERENCES users(id)
);

CREATE INDEX idx_user_connections_user_id_1 ON connections (user_id_1);
CREATE INDEX idx_user_connections_user_id_2 ON connections (user_id_2);

CREATE TABLE likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    liker_id TEXT NOT NULL,
    liked_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(liker_id, liked_id),
    CHECK (liker_id != liked_id),
    FOREIGN KEY (liker_id) REFERENCES users(id),
    FOREIGN KEY (liked_id) REFERENCES users(id)
);

CREATE INDEX idx_user_likes_liker_id ON likes (liker_id);
CREATE INDEX idx_user_likes_liked_id ON likes (liked_id);
