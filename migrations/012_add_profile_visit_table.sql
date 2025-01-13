CREATE TABLE profile_visits (
    visitor_id TEXT NOT NULL,
    visited_user_id TEXT NOT NULL,
    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (visitor_id, visited_user_id),
    FOREIGN KEY (visitor_id) REFERENCES users(id),
    FOREIGN KEY (visited_user_id) REFERENCES users(id),
    UNIQUE (visitor_id, visited_user_id)
);

CREATE INDEX idx_visited_user_id ON profile_visits (visited_user_id);
