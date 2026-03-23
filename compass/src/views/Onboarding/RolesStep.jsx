import React, { useState } from 'react'
import { createRole } from '../../lib/api'

const DEFAULT_ROLES = [
  {
    name: 'Professional',
    selected: false,
    time_budget_hrs_week: 40,
    color: '#5B7B6F',
    description: 'The value you create through work, craft, and expertise. How you show up in your career shapes not just your livelihood — but your contribution to the world.',
    citation: 'Covey, The 7 Habits of Highly Effective People',
  },
  {
    name: 'Parent',
    selected: false,
    time_budget_hrs_week: 20,
    color: '#7B6B5B',
    description: 'The steward of a child\'s world. Your presence, patience, and modeling matter more than any single act of parenting.',
    citation: 'Covey, The 7 Habits of Highly Effective People',
  },
  {
    name: 'Partner',
    selected: false,
    time_budget_hrs_week: 10,
    color: '#5B6B7B',
    description: 'The person who shows up fully for a significant other. Partnership is built through consistency, presence, and intentional investment in the relationship.',
    citation: 'Covey, The 7 Habits of Highly Effective People',
  },
  {
    name: 'Friend',
    selected: false,
    time_budget_hrs_week: 5,
    color: '#7B5B6B',
    description: 'The one others can count on. Friendship is maintained through small, consistent acts of genuine care and showing up when it matters.',
    citation: 'Covey, The 7 Habits of Highly Effective People',
  },
  {
    name: 'Self',
    selected: false,
    time_budget_hrs_week: 10,
    color: '#6B7B5B',
    description: 'The foundation everything else is built on. Physical health, inner life, and ongoing growth — you cannot pour from an empty vessel.',
    citation: 'Covey, Sharpen the Saw — Habit 7',
  },
  {
    name: 'Community',
    selected: false,
    time_budget_hrs_week: 5,
    color: '#6B5B7B',
    description: 'Your presence in the world beyond your immediate circle. Service, belonging, and contribution to something larger than yourself.',
    citation: 'Covey, The 7 Habits of Highly Effective People',
  },
]

function newCustomRole() {
  return { name: '', time_budget_hrs_week: 5, color: '#9A918A' }
}

export default function RolesStep({ onNext, onBack }) {
  const [roles, setRoles] = useState(DEFAULT_ROLES.map((r) => ({ ...r })))
  const [customRoles, setCustomRoles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function toggleRole(index) {
    setRoles((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    )
  }

  function updateRoleHours(index, hours) {
    const clamped = Math.min(168, Math.max(0, Number(hours) || 0))
    setRoles((prev) =>
      prev.map((r, i) => (i === index ? { ...r, time_budget_hrs_week: clamped } : r))
    )
  }

  function addCustomRole() {
    setCustomRoles((prev) => [...prev, newCustomRole()])
  }

  function updateCustomRole(index, patch) {
    setCustomRoles((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    )
  }

  function removeCustomRole(index) {
    setCustomRoles((prev) => prev.filter((_, i) => i !== index))
  }

  const selectedDefaults = roles.filter((r) => r.selected)
  const validCustom = customRoles.filter((r) => r.name.trim().length >= 2)
  const canContinue = selectedDefaults.length + validCustom.length > 0

  // Running total for time allocation guidance
  const allocatedHours =
    selectedDefaults.reduce((sum, r) => sum + r.time_budget_hrs_week, 0) +
    validCustom.reduce((sum, r) => sum + r.time_budget_hrs_week, 0)
  const WAKING_HOURS = 112

  async function handleContinue() {
    setSaving(true)
    setError(null)
    try {
      const allToSave = [
        ...selectedDefaults.map((r, i) => ({
          name: r.name,
          time_budget_hrs_week: r.time_budget_hrs_week,
          color: r.color,
          priority_rank: i + 1,
        })),
        ...validCustom.map((r, i) => ({
          name: r.name.trim(),
          time_budget_hrs_week: r.time_budget_hrs_week,
          color: r.color,
          priority_rank: selectedDefaults.length + i + 1,
        })),
      ]
      await Promise.all(allToSave.map((r) => createRole(r)))
      onNext()
    } catch (err) {
      setError('Something went wrong saving your roles. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-text-primary mb-3 leading-snug">
        What relationships define you?
      </h1>
      <p className="text-text-secondary text-base mb-6 leading-relaxed">
        Each role is a domain where someone needs your presence. Select the ones that apply
        and set a rough weekly time intention.
      </p>

      {/* Time allocation guidance */}
      <div className="bg-parchment-200 rounded-lg px-4 py-3 mb-6 text-sm text-text-secondary">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span><span className="font-medium">168</span> hrs/week total</span>
          <span className="text-text-tertiary">·</span>
          <span><span className="font-medium">56</span> hrs sleeping (8h/night)</span>
          <span className="text-text-tertiary">·</span>
          <span><span className="font-medium text-text-primary">112</span> waking hours to allocate</span>
        </div>
        {allocatedHours > 0 && (
          <div className={`mt-2 text-sm font-medium flex items-center gap-1.5 ${allocatedHours > WAKING_HOURS ? 'text-warning' : 'text-sage-500'}`}>
            {allocatedHours === WAKING_HOURS && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            You've allocated {allocatedHours} / {WAKING_HOURS} waking hours
            {allocatedHours > WAKING_HOURS && ' — over budget'}
          </div>
        )}
      </div>

      {/* Required label */}
      <p className="text-xs text-text-tertiary mb-4">
        Select at least one. <span className="text-warning">*</span>
      </p>

      {/* Role cards grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {roles.map((role, index) => (
          <div
            key={role.name}
            onClick={() => toggleRole(index)}
            className={`rounded-xl border p-4 cursor-pointer transition-all duration-150 ${
              role.selected
                ? 'border-sage-500 bg-sage-50 shadow-sm'
                : 'border-border bg-surface hover:border-sage-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: role.color }}
                />
                <span className={`font-medium text-sm ${role.selected ? 'text-sage-600' : 'text-text-primary'}`}>
                  {role.name}
                </span>
              </div>
              {role.selected && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4D7C6F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-text-secondary leading-relaxed mt-1">
              {role.description}
            </p>
            <p className="text-[10px] text-text-tertiary italic mt-1.5">
              {role.citation}
            </p>

            {role.selected && (
              <div
                className="mt-3"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="text-xs text-text-tertiary block mb-1">Hours per week</label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={role.time_budget_hrs_week}
                  onChange={(e) => updateRoleHours(index, e.target.value)}
                  className="w-full bg-white border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-sage-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom roles */}
      {customRoles.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-3 items-center mb-2 px-0.5">
            <span className="text-xs text-text-tertiary flex-1">
              Role name <span className="text-warning">*</span>
            </span>
            <span className="text-xs text-text-tertiary w-16 text-center">hrs/wk</span>
            <span className="w-4" />
          </div>
          <div className="space-y-3">
            {customRoles.map((role, index) => (
              <div key={index} className="flex gap-3 items-center">
                <input
                  type="text"
                  className="input-base flex-1"
                  placeholder="Role name"
                  value={role.name}
                  onChange={(e) => updateCustomRole(index, { name: e.target.value })}
                />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={role.time_budget_hrs_week}
                    onChange={(e) => updateCustomRole(index, { time_budget_hrs_week: Math.min(168, Math.max(0, Number(e.target.value) || 0)) })}
                    className="w-16 bg-surface border border-border rounded-lg px-2.5 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-sage-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomRole(index)}
                  className="text-text-tertiary hover:text-warning transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom */}
      <button
        type="button"
        onClick={addCustomRole}
        className="text-sm text-sage-500 hover:text-sage-600 font-medium transition-colors duration-100 flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add a custom role
      </button>

      {error && (
        <p className="mt-4 text-sm text-warning">{error}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-12">
        <button type="button" onClick={onBack} className="btn-ghost">
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Finish setup'}
        </button>
      </div>
    </div>
  )
}
