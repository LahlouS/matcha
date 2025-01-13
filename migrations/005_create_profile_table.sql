CREATE TABLE profile_info (
    user_id TEXT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    gender VARCHAR(20),
    sexual_preference VARCHAR(20),
    biography TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

