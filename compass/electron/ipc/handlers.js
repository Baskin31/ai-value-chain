const { ipcMain } = require('electron')
const { getDb } = require('../database/db')

// Active profile cached in memory after first load
let activeProfileId = null

function getActiveProfileId(db) {
  if (activeProfileId !== null) return activeProfileId
  const row = db.prepare("SELECT value FROM settings WHERE key = 'current_profile_id'").get()
  activeProfileId = row ? parseInt(row.value, 10) : null
  return activeProfileId
}

function registerHandlers() {
  const db = getDb()

  // ─── App State ────────────────────────────────────────────────────────────
  ipcMain.handle('app:getState', (_event, key) => {
    const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key)
    return row ? row.value : null
  })

  ipcMain.handle('app:setState', (_event, key, value) => {
    db.prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)').run(key, value)
    return true
  })

  // ─── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_event, key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  })

  ipcMain.handle('settings:set', (_event, key, value) => {
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
    ).run(key, value)
    return true
  })

  // ─── Profiles ─────────────────────────────────────────────────────────────
  ipcMain.handle('profiles:getAll', () => {
    return db.prepare('SELECT * FROM profiles ORDER BY last_active DESC, profile_id ASC').all()
  })

  ipcMain.handle('profiles:create', (_event, name) => {
    const trimmed = String(name).trim().slice(0, 30)
    const result = db.prepare(
      `INSERT INTO profiles (name, onboarding_complete, last_active)
       VALUES (?, 0, datetime('now'))`
    ).run(trimmed)
    const profile = db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(result.lastInsertRowid)
    // Set as active profile immediately
    activeProfileId = profile.profile_id
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('current_profile_id', ?, datetime('now'))"
    ).run(String(profile.profile_id))
    return profile
  })

  ipcMain.handle('profiles:setActive', (_event, id) => {
    const profile = db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(id)
    if (!profile) return null
    activeProfileId = profile.profile_id
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('current_profile_id', ?, datetime('now'))"
    ).run(String(id))
    db.prepare(
      "UPDATE profiles SET last_active = datetime('now') WHERE profile_id = ?"
    ).run(id)
    return db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(id)
  })

  ipcMain.handle('profiles:markComplete', (_event, id) => {
    db.prepare('UPDATE profiles SET onboarding_complete = 1 WHERE profile_id = ?').run(id)
    return db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(id)
  })

  ipcMain.handle('profiles:getActive', () => {
    const pid = getActiveProfileId(db)
    if (!pid) return null
    return db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(pid)
  })

  // ─── Beliefs ──────────────────────────────────────────────────────────────
  ipcMain.handle('beliefs:getAll', () => {
    const pid = getActiveProfileId(db)
    return db.prepare(
      'SELECT * FROM beliefs WHERE profile_id = ? ORDER BY importance_score DESC'
    ).all(pid)
  })

  ipcMain.handle('beliefs:create', (_event, data) => {
    const pid = getActiveProfileId(db)
    const { statement, domains = '["general"]', importance_score = 7 } = data
    const domainsStr = typeof domains === 'string' ? domains : JSON.stringify(domains)
    const result = db.prepare(
      'INSERT INTO beliefs (profile_id, statement, domains, importance_score) VALUES (?, ?, ?, ?)'
    ).run(pid, statement, domainsStr, importance_score)
    return db.prepare('SELECT * FROM beliefs WHERE belief_id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('beliefs:update', (_event, id, data) => {
    const allowed = ['statement', 'domains', 'importance_score', 'last_reviewed', 'review_notes']
    const fields = Object.keys(data).filter((k) => allowed.includes(k))
    if (fields.length === 0) return null
    const setClause = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => data[f])
    db.prepare(`UPDATE beliefs SET ${setClause} WHERE belief_id = ?`).run(...values, id)
    return db.prepare('SELECT * FROM beliefs WHERE belief_id = ?').get(id)
  })

  ipcMain.handle('beliefs:delete', (_event, id) => {
    db.prepare('DELETE FROM beliefs WHERE belief_id = ?').run(id)
    return true
  })

  // ─── Why Statement ────────────────────────────────────────────────────────
  ipcMain.handle('why:get', () => {
    const pid = getActiveProfileId(db)
    return db.prepare('SELECT * FROM why_statement WHERE profile_id = ?').get(pid) || null
  })

  ipcMain.handle('why:set', (_event, data) => {
    const pid = getActiveProfileId(db)
    const { statement, belief_ids = '[]', origin_story = null, resonance_score = 8 } = data
    db.prepare(
      `INSERT INTO why_statement (profile_id, statement, belief_ids, origin_story, resonance_score)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(profile_id) DO UPDATE SET
         statement = excluded.statement,
         belief_ids = excluded.belief_ids,
         origin_story = excluded.origin_story,
         resonance_score = excluded.resonance_score`
    ).run(pid, statement, belief_ids, origin_story, resonance_score)
    return db.prepare('SELECT * FROM why_statement WHERE profile_id = ?').get(pid)
  })

  // ─── Principles ───────────────────────────────────────────────────────────
  ipcMain.handle('principles:getAll', () => {
    const pid = getActiveProfileId(db)
    return db.prepare(
      'SELECT * FROM principles WHERE profile_id = ? ORDER BY principle_id'
    ).all(pid)
  })

  ipcMain.handle('principles:create', (_event, data) => {
    const pid = getActiveProfileId(db)
    const { statement, belief_ids = '[]' } = data
    const result = db.prepare(
      'INSERT INTO principles (profile_id, statement, belief_ids) VALUES (?, ?, ?)'
    ).run(pid, statement, belief_ids)
    return db.prepare('SELECT * FROM principles WHERE principle_id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('principles:update', (_event, id, data) => {
    const allowed = ['statement', 'belief_ids', 'violated_count', 'last_violated']
    const fields = Object.keys(data).filter((k) => allowed.includes(k))
    if (fields.length === 0) return null
    const setClause = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => data[f])
    db.prepare(`UPDATE principles SET ${setClause} WHERE principle_id = ?`).run(...values, id)
    return db.prepare('SELECT * FROM principles WHERE principle_id = ?').get(id)
  })

  ipcMain.handle('principles:delete', (_event, id) => {
    db.prepare('DELETE FROM principles WHERE principle_id = ?').run(id)
    return true
  })

  // ─── Roles ────────────────────────────────────────────────────────────────
  ipcMain.handle('roles:getAll', () => {
    const pid = getActiveProfileId(db)
    return db.prepare(
      'SELECT * FROM roles WHERE profile_id = ? ORDER BY priority_rank'
    ).all(pid)
  })

  ipcMain.handle('roles:create', (_event, data) => {
    const pid = getActiveProfileId(db)
    const {
      name,
      principle_ids = '[]',
      priority_rank = 5,
      time_budget_hrs_week = 5,
      current_satisfaction = 7,
      color = '#5B7B6F',
    } = data
    const result = db.prepare(
      `INSERT INTO roles (profile_id, name, principle_ids, priority_rank, time_budget_hrs_week, current_satisfaction, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(pid, name, principle_ids, priority_rank, time_budget_hrs_week, current_satisfaction, color)
    return db.prepare('SELECT * FROM roles WHERE role_id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('roles:update', (_event, id, data) => {
    const allowed = [
      'name', 'principle_ids', 'priority_rank', 'time_budget_hrs_week',
      'current_satisfaction', 'color',
    ]
    const fields = Object.keys(data).filter((k) => allowed.includes(k))
    if (fields.length === 0) return null
    const setClause = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => data[f])
    db.prepare(`UPDATE roles SET ${setClause} WHERE role_id = ?`).run(...values, id)
    return db.prepare('SELECT * FROM roles WHERE role_id = ?').get(id)
  })

  ipcMain.handle('roles:delete', (_event, id) => {
    db.prepare('DELETE FROM roles WHERE role_id = ?').run(id)
    return true
  })

  // ─── Tasks ────────────────────────────────────────────────────────────────
  const TASK_WITH_ROLE_SQL = `
    SELECT
      t.*,
      r.name  AS role_name,
      r.color AS role_color
    FROM tasks t
    LEFT JOIN roles r ON t.role_id = r.role_id
  `

  ipcMain.handle('tasks:getForDate', (_event, date) => {
    const pid = getActiveProfileId(db)
    return db.prepare(
      `${TASK_WITH_ROLE_SQL} WHERE t.profile_id = ? AND date(t.scheduled_at) = date(?) ORDER BY t.task_id`
    ).all(pid, date)
  })

  ipcMain.handle('tasks:create', (_event, data) => {
    const pid = getActiveProfileId(db)
    const {
      title,
      goal_id = null,
      role_id = null,
      principle_ids = '[]',
      scheduled_at = null,
      duration_mins = null,
      status = 'pending',
      energy_required = 'medium',
    } = data
    const result = db.prepare(
      `INSERT INTO tasks (profile_id, title, goal_id, role_id, principle_ids, scheduled_at, duration_mins, status, energy_required)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(pid, title, goal_id, role_id, principle_ids, scheduled_at, duration_mins, status, energy_required)
    return db.prepare(`${TASK_WITH_ROLE_SQL} WHERE t.task_id = ?`).get(result.lastInsertRowid)
  })

  ipcMain.handle('tasks:update', (_event, id, data) => {
    const allowed = [
      'title', 'goal_id', 'role_id', 'principle_ids', 'scheduled_at',
      'duration_mins', 'status', 'skipped_reason', 'energy_required',
    ]
    const fields = Object.keys(data).filter((k) => allowed.includes(k))
    if (fields.length === 0) return null
    const setClause = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => data[f])
    db.prepare(`UPDATE tasks SET ${setClause} WHERE task_id = ?`).run(...values, id)
    return db.prepare(`${TASK_WITH_ROLE_SQL} WHERE t.task_id = ?`).get(id)
  })

  ipcMain.handle('tasks:delete', (_event, id) => {
    db.prepare('DELETE FROM tasks WHERE task_id = ?').run(id)
    return true
  })

  // ─── AI ───────────────────────────────────────────────────────────────────
  ipcMain.handle('ai:suggestDomains', async (_event, statement) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'anthropic_api_key'").get()
    if (!row?.value) return null
    try {
      const Anthropic = require('@anthropic-ai/sdk')
      const client = new Anthropic({ apiKey: row.value })
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `You help categorize personal belief statements into domains.
Domains: growth (personal development, learning), relationships (connection, love, family),
service (contribution, helping others), integrity (honesty, authenticity, commitments),
freedom (autonomy, choice, independence).
Return ONLY valid JSON with no other text: {"domains":["domain1"],"reason":"one sentence why"}
Pick 1-2 domains maximum. Only use the 5 domain names listed above.`,
        messages: [{ role: 'user', content: statement }],
      })
      return JSON.parse(msg.content[0].text)
    } catch {
      return null
    }
  })
}

module.exports = { registerHandlers }
