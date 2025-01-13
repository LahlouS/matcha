
CREATE TABLE profile_pictures_new (
  id TEXT NOT NULL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  image_order INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, image_order)
);

INSERT INTO profile_pictures_new (id, user_id, image_order)
SELECT id, user_id, image_order FROM profile_pictures;

DROP TABLE profile_pictures;

ALTER TABLE profile_pictures_new RENAME TO profile_pictures;
