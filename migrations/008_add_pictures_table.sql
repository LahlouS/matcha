-- Order represents the order of the picture in the user's profile
-- 1 is main picture, 2 is second picture, etc.
-- <user_id>_<order> is used as filepath

CREATE TABLE profile_pictures (
    id TEXT NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    image_order INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
