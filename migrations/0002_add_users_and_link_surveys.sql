CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE survey_submissions ADD COLUMN user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_survey_submissions_user_id
    ON survey_submissions(user_id);