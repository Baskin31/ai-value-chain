const path = require('path')
const { app } = require('electron')
const Database = require('better-sqlite3')
const { SCHEMA } = require('./schema')

let db = null

function getDb() {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'compass.db')
  db = new Database(dbPath)

  // Performance and integrity pragmas
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema
  db.exec(SCHEMA)

  // Migration: rename single-value `domain` column to JSON-array `domains`
  const cols = db.prepare('PRAGMA table_info(beliefs)').all().map((c) => c.name)
  if (cols.includes('domain') && !cols.includes('domains')) {
    db.exec(`ALTER TABLE beliefs ADD COLUMN domains TEXT DEFAULT '["general"]'`)
    db.exec(`UPDATE beliefs SET domains = json_array(domain)`)
  }

  return db
}

module.exports = { getDb }
