const path = require('path')
const { app } = require('electron')
const Database = require('better-sqlite3')
const { SCHEMA } = require('./schema')

let db = null

function getDb() {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'lodestar.db')
  db = new Database(dbPath)

  // Performance and integrity pragmas
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema (safe for fresh installs)
  db.exec(SCHEMA)

  // Run migrations for existing databases
  runMigrations(db)

  return db
}

function hasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)
}

function runMigrations(db) {
  // ── Migration: rename beliefs.domain → beliefs.domains ────────────────────
  const beliefCols = db.prepare('PRAGMA table_info(beliefs)').all().map((c) => c.name)
  if (beliefCols.includes('domain') && !beliefCols.includes('domains')) {
    db.exec(`ALTER TABLE beliefs ADD COLUMN domains TEXT DEFAULT '["general"]'`)
    db.exec(`UPDATE beliefs SET domains = json_array(domain)`)
  }

  // ── Migration: create profiles table and seed default profile ─────────────
  // profiles table is created by SCHEMA if not exists; seed only when needed
  const profileCount = db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n
  if (profileCount === 0) {
    // Check if there is existing user data to migrate
    const hasData =
      db.prepare('SELECT COUNT(*) AS n FROM beliefs').get().n > 0 ||
      db.prepare('SELECT COUNT(*) AS n FROM principles').get().n > 0 ||
      db.prepare('SELECT COUNT(*) AS n FROM roles').get().n > 0

    if (hasData) {
      // Was onboarding already finished before profiles existed?
      const prevComplete = db.prepare(
        "SELECT value FROM app_state WHERE key = 'onboarding_complete'"
      ).get()
      const isComplete = prevComplete?.value === 'true' ? 1 : 0

      db.prepare(
        `INSERT INTO profiles (profile_id, name, onboarding_complete, last_active)
         VALUES (1, 'Default', ?, datetime('now'))`
      ).run(isComplete)
    }
    // If no data and no profiles, a fresh install — onboarding will create the first profile
  }

  // ── Migration: set current_profile_id in settings ─────────────────────────
  const hasCurrentProfile = db.prepare(
    "SELECT 1 FROM settings WHERE key = 'current_profile_id'"
  ).get()
  if (!hasCurrentProfile) {
    const firstProfile = db.prepare('SELECT profile_id FROM profiles ORDER BY profile_id LIMIT 1').get()
    if (firstProfile) {
      db.prepare(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('current_profile_id', ?)"
      ).run(String(firstProfile.profile_id))
    }
  }

  // ── Migration: add profile_id to content tables ───────────────────────────
  const contentTables = ['beliefs', 'principles', 'roles', 'goals', 'tasks', 'insights']
  for (const table of contentTables) {
    if (!hasColumn(db, table, 'profile_id')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN profile_id INTEGER NOT NULL DEFAULT 1`)
      db.exec(`UPDATE ${table} SET profile_id = 1 WHERE profile_id IS NULL`)
    }
  }

  // ── Migration: add profile_id to weekly_compass + fix UNIQUE constraint ───
  if (!hasColumn(db, 'weekly_compass', 'profile_id')) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS weekly_compass_new (
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
        )
      `)
      db.exec(`
        INSERT INTO weekly_compass_new
          (week_id, profile_id, week_start, role_priorities, goal_focus_ids,
           intention_note, why_resonance_check, why_resonance_note, review_note,
           role_satisfaction, actual_vs_intended, created_at)
        SELECT
          week_id, 1, week_start, role_priorities, goal_focus_ids,
          intention_note, why_resonance_check, why_resonance_note, review_note,
          role_satisfaction, actual_vs_intended, created_at
        FROM weekly_compass
      `)
      db.exec(`DROP TABLE weekly_compass`)
      db.exec(`ALTER TABLE weekly_compass_new RENAME TO weekly_compass`)
    })()
  }

  // ── Migration: recreate why_statement to remove CHECK(id=1) + add profile_id
  if (!hasColumn(db, 'why_statement', 'profile_id')) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS why_statement_new (
          why_id          INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id      INTEGER NOT NULL REFERENCES profiles(profile_id),
          statement       TEXT    NOT NULL,
          belief_ids      TEXT    DEFAULT '[]',
          origin_story    TEXT,
          last_reviewed   TEXT,
          resonance_score INTEGER DEFAULT 8 CHECK(resonance_score BETWEEN 1 AND 10),
          created_at      TEXT    DEFAULT (datetime('now'))
        )
      `)
      // Migrate existing row (id=1) to profile_id=1
      db.exec(`
        INSERT INTO why_statement_new
          (profile_id, statement, belief_ids, origin_story, last_reviewed, resonance_score, created_at)
        SELECT
          1, statement, belief_ids, origin_story, last_reviewed, resonance_score, created_at
        FROM why_statement
      `)
      db.exec(`DROP TABLE why_statement`)
      db.exec(`ALTER TABLE why_statement_new RENAME TO why_statement`)
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_why_profile ON why_statement(profile_id)`)
    })()
  }
}

module.exports = { getDb }
