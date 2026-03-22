# Daily Handoff — 21 March 2026

## Phase 1 status: Complete

All four Phase 1 deliverables are done and in working code. The app is ready to run with `npm install && npm run dev` (see setup note below).

---

## What was built today

### Project setup (Phase 1.1)
Full Electron + React + SQLite project scaffolded from scratch:
- Stack: Electron 29, React 18, Vite 5, Tailwind CSS 3, better-sqlite3
- 27 files created covering the full stack
- SQLite schema covers all 8 data layers from the brief (app_state, settings, beliefs, why_statement, principles, roles, goals, weekly_compass, tasks, insights)
- IPC architecture: main process owns all DB access, renderer talks through `window.api` (contextBridge), `src/lib/api.js` re-exports cleanly for React components

### Onboarding flow (Phase 1.2)
4-step first-run experience:
1. **Beliefs** — statement, domain multi-select, 10-dot importance picker
2. **Why** — "I exist to..." statement + origin story
3. **Principles** — numbered commitments with add/remove
4. **Roles** — 6 default role cards (select to expand hours input), custom role support
- Completion screen before entering the main app
- All data saved to SQLite on each step's Continue

### Daily task view (Phase 1.3)
Fully functional Today view:
- Quick-add bar: title input, role selector dropdown, energy level pills (low/medium/high)
- Tasks grouped by role with color-coded left border
- Hover actions: mark done (checkbox), skip, delete
- Skip modal captures reason (the most important feedback field per the brief)
- Done/skipped tasks visually dimmed with strikethrough
- Summary footer: done count, total estimated minutes

### Navigation (Phase 1.4)
Sidebar with all future views anticipated:
- Today, Weekly Compass, Goals, Roles, Beliefs & Why, Insights, Settings
- Weekly Compass / Goals / Insights show styled "coming in Phase 2" placeholders
- Beliefs & Why and Roles show real data from onboarding (not placeholders)
- Settings: API key entry (stored locally, never leaves device), insight delivery UI shape

### Beliefs layer improvements (added same session)
Two improvements made after initial Phase 1 build:
- **Multi-select domains**: domain pills now toggle independently (array, not single value). Schema updated from `domain TEXT` to `domains TEXT` (JSON array). Migration in `db.js` handles any existing DB automatically.
- **AI domain suggestion**: after typing 10+ characters in a belief statement, a 1-second debounce fires a call to `claude-haiku-4-5-20251001`. A suggestion card appears below the textarea showing suggested domains + a one-sentence reason. User can Apply, Dismiss, or ignore it. Requires API key in Settings. Fails silently if no key or API error.

---

## What's next (Phase 2)

The brief defines Phase 2 as goals, weekly compass, feedback engine, and AI conversations. Suggested order:

1. **Goals view** (Layer 5) — create/edit goals linked to roles, horizon selector (long/mid/short), status management. The schema is already there, just needs UI.
2. **Weekly Compass** (Layer 6) — Sunday planning moment + Sunday review. The most complex single view: role priorities, goal focus selection, why-resonance check, and the closing Frankl question ("Did this week feel meaningful?").
3. **Roles view editing** — the current Roles view shows data but Edit is disabled. Users will want to adjust time budgets and satisfaction scores.
4. **Feedback engine** (Layer 8) — start with the two most impactful insight types: `why_drift` (rolling alignment score) and `principle_violation` (triggered when a task linked to a principle is skipped). The insight delivery modes (card / question / conversation) are already in Settings UI shape.
5. **Conversational moments** — triggered AI conversations using the full system prompt pattern from the brief (user's beliefs + why + triggering insight). Sunday review is the natural first trigger.

---

## Important decisions and context

**Stack rationale**: Electron over Tauri specifically for beginner-friendliness — everything is JavaScript, no Rust layer to debug. This holds for all future phases.

**SQLite JSON columns**: Many fields (domains, belief_ids, principle_ids, etc.) are stored as JSON strings in TEXT columns. Always serialize before writing, parse after reading. The pattern is established and consistent throughout.

**better-sqlite3 native module**: Requires Visual Studio C++ Build Tools on Windows. The `postinstall` script runs `electron-rebuild` automatically. If `npm install` fails on this step, the user needs to install the C++ workload from Visual Studio Build Tools.

**AI calls are main-process only**: All Anthropic API calls live in `electron/ipc/handlers.js`. The API key is fetched from the `settings` table there, never passed to the renderer. This is the correct pattern — maintain it for all future AI features.

**AI model choices**: `claude-haiku-4-5-20251001` for quick background tasks (domain suggestion, pattern classification). `claude-sonnet-4-6` for the full conversational moments (Sunday review, principle violation conversation). This matches the brief's intent.

**`other` domain removed**: The original design had an "other" domain pill. It was removed during the beliefs improvement — the 5 named domains (growth, relationships, service, integrity, freedom) are sufficient and keeping the list bounded makes AI suggestions more reliable.

**Onboarding is a one-way gate**: `app_state.onboarding_complete = 'true'` is set after the roles step. There is currently no way to re-run onboarding. Phase 2 should add editing within the Beliefs & Why and Roles views rather than re-running onboarding. The Edit buttons are already rendered but disabled.

**DB file location**: `%APPDATA%\compass\compass.db` (e.g. `C:\Users\RnBas\AppData\Roaming\compass\compass.db`). Delete this file to reset the app to a clean state during development.

---

## Files to know

| Path | Purpose |
|------|---------|
| `electron/main.js` | Electron entry, window creation |
| `electron/preload.js` | contextBridge — everything renderer can call |
| `electron/database/schema.js` | Full SQLite schema for all 8 layers |
| `electron/database/db.js` | DB singleton + migration logic |
| `electron/ipc/handlers.js` | All IPC handlers including AI |
| `src/lib/api.js` | Clean named exports for React components |
| `src/App.jsx` | Onboarding gate + top-level routing |
| `src/views/Onboarding/` | 4-step onboarding + orchestrator |
| `src/views/Today.jsx` | Daily task view — most complete view |
| `src/index.css` | Global styles + component classes (btn-primary, card, etc.) |
| `tailwind.config.js` | Full design system: parchment, sage, text, border colors |
