CREATE TABLE IF NOT EXISTS avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    storage_key TEXT,
    image_url TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN selected_avatar_id INTEGER;

INSERT INTO avatars (id, user_id, name, storage_key, image_url, is_default)
VALUES
    (1, NULL, 'Fishing Time', NULL, '/images/avatars/astronaut-fish-moon.png', 1),
    (2, NULL, 'Sun Conqueror', NULL, '/images/avatars/astronaut-on-sun.png', 1),
    (3, NULL, 'Hello!', NULL, '/images/avatars/astronaut-wave.png', 1),
    (4, NULL, 'Profile', NULL, '/images/avatars/astronaut-profile.png', 1);