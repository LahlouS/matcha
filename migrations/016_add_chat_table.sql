CREATE TABLE chat (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    user_id_1 TEXT NOT NULL,
    user_id_2 TEXT NOT NULL,
    UNIQUE(user_id_1, user_id_2),
    CHECK (user_id_1 != user_id_2),
    FOREIGN KEY (user_id_1) REFERENCES users(id),
    FOREIGN KEY (user_id_2) REFERENCES users(id)
);

CREATE INDEX index_chats_for_user_one_id ON chat (user_id_1);
CREATE INDEX index_chats_for_user_two_id ON chat (user_id_2);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    chat_id INTEGER NOT NULL,             
    sender_id TEXT NOT NULL,           
    message TEXT NOT NULL,                
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (chat_id) REFERENCES chat(id) ON DELETE CASCADE
);

CREATE INDEX index_messages_on_date ON messages (sent_at);