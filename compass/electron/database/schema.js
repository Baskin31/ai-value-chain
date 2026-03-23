const SCHEMA = `
  CREATE TABLE IF NOT EXISTS profiles (
    profile_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    created_at          TEXT    DEFAULT (datetime('now')),
    last_active         TEXT,
    onboarding_complete INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS app_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS beliefs (
    belief_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id       INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(profile_id),
    statement        TEXT    NOT NULL,
    domains          TEXT    NOT NULL DEFAULT '["universalism"]',
    importance_score INTEGER DEFAULT 7 CHECK(importance_score BETWEEN 1 AND 10),
    created_at       TEXT    DEFAULT (datetime('now')),
    last_reviewed    TEXT,
    review_notes     TEXT    DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS why_statement (
    why_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id      INTEGER NOT NULL REFERENCES profiles(profile_id),
    statement       TEXT    NOT NULL,
    belief_ids      TEXT    DEFAULT '[]',
    origin_story    TEXT,
    last_reviewed   TEXT,
    resonance_score INTEGER DEFAULT 8 CHECK(resonance_score BETWEEN 1 AND 10),
    created_at      TEXT    DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_why_profile ON why_statement(profile_id);

  CREATE TABLE IF NOT EXISTS principles (
    principle_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id     INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(profile_id),
    statement      TEXT    NOT NULL,
    belief_ids     TEXT    DEFAULT '[]',
    violated_count INTEGER DEFAULT 0,
    last_violated  TEXT,
    created_at     TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS roles (
    role_id               INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id            INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(profile_id),
    name                  TEXT    NOT NULL,
    principle_ids         TEXT    DEFAULT '[]',
    priority_rank         INTEGER DEFAULT 5,
    time_budget_hrs_week  REAL    DEFAULT 5,
    current_satisfaction  INTEGER DEFAULT 7 CHECK(current_satisfaction BETWEEN 1 AND 10),
    color                 TEXT    DEFAULT '#5B7B6F',
    created_at            TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    goal_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id     INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(profile_id),
    title          TEXT    NOT NULL,
    role_id        INTEGER REFERENCES roles(role_id),
    horizon        TEXT    DEFAULT 'mid' CHECK(horizon IN ('long','mid','short')),
    target_date    TEXT,
    success_metric TEXT,
    progress_pct   INTEGER DEFAULT 0,
    status         TEXT    DEFAULT 'active' CHECK(status IN ('active','paused','completed','abandoned','reconsidering')),
    paused_reason  TEXT,
    created_at     TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekly_compass (
    week_id             INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id          INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(profile_id),
    week_start          TEXT    NOT NULL,
    role_priorities     TEXT    DEFAULT '[]',
    goal_focus_ids      TEXT    DEFAULT '[]',
    intention_note      TEXT,
    why_resonance_check TEXT,
    why_resonance_note  TEXT,
    review_note         TEXT,
    role_satisfaction   TEXT    DEFAULT '{}',
    actual_vs_intended  TEXT    DEFAULT '{}',
    created_at          TEXT    DEFAULT (datetime('now')),
    UNIQUE(profile_id, week_start)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    task_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id      INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(profile_id),
    title           TEXT    NOT NULL,
    goal_id         INTEGER REFERENCES goals(goal_id),
    role_id         INTEGER REFERENCES roles(role_id),
    principle_ids   TEXT    DEFAULT '[]',
    scheduled_at    TEXT,
    duration_mins   INTEGER,
    status          TEXT    DEFAULT 'pending' CHECK(status IN ('pending','done','skipped')),
    skipped_reason  TEXT,
    energy_required TEXT    DEFAULT 'medium' CHECK(energy_required IN ('low','medium','high')),
    created_at      TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS insights (
    insight_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id          INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(profile_id),
    type                TEXT    CHECK(type IN ('principle_violation','why_drift','role_neglect','goal_reconsider','belief_review','habit_suggestion','meaning_check')),
    triggered_by        TEXT    DEFAULT '{}',
    message             TEXT    NOT NULL,
    user_response       TEXT,
    acted_on            INTEGER DEFAULT 0,
    pattern_weight      REAL    DEFAULT 1.0,
    why_alignment_score REAL,
    created_at          TEXT    DEFAULT (datetime('now'))
  );
`

module.exports = { SCHEMA }
