CREATE TABLE IF NOT EXISTS survey_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    feedback TEXT NOT NULL,
    rating INTEGER NOT NULL,
    game_choice TEXT NOT NULL,
    agreed INTEGER NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);