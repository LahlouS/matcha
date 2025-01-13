CREATE TABLE profile_pictures_new (
    user_id INTEGER NOT NULL,
    image_order INTEGER NOT NULL,
    PRIMARY KEY (user_id, image_order), -- Define composite primary key
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO profile_pictures_new (user_id, image_order)
SELECT user_id, image_order
FROM profile_pictures;

DROP TABLE profile_pictures;

ALTER TABLE profile_pictures_new RENAME TO profile_pictures;
