import React, { useState, useEffect } from 'react'
import { getSetting, setSetting } from '../lib/api'

const INSIGHT_TYPES = [
  { key: 'principle_violation', label: 'Principle violations' },
  { key: 'why_drift', label: 'Why drift' },
  { key: 'role_neglect', label: 'Role neglect' },
  { key: 'goal_reconsider', label: 'Goal reconsideration' },
  { key: 'belief_review', label: 'Belief reviews' },
  { key: 'habit_suggestion', label: 'Habit suggestions' },
  { key: 'meaning_check', label: 'Meaning check-ins' },
]

const DELIVERY_OPTIONS = ['Card', 'Question', 'Conversation']

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="font-serif text-xl text-text-primary mb-5">{title}</h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [insightDelivery, setInsightDelivery] = useState(() =>
    Object.fromEntries(INSIGHT_TYPES.map((t) => [t.key, 'Card']))
  )

  useEffect(() => {
    getSetting('anthropic_api_key').then((val) => {
      if (val) setApiKey(val)
    })
  }, [])

  async function handleKeyBlur() {
    if (apiKey.trim()) {
      await setSetting('anthropic_api_key', apiKey.trim())
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 2500)
    }
  }

  function updateDelivery(key, value) {
    setInsightDelivery((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-text-primary mb-1">Settings</h1>
        <p className="text-text-secondary text-sm">Configure Lodestar for your preferences.</p>
      </div>

      {/* API Configuration */}
      <Section title="API Configuration">
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onBlur={handleKeyBlur}
                placeholder="sk-ant-..."
                className="input-base pr-10"
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showKey ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-text-tertiary">
                Your key is stored locally and never leaves this device.
              </p>
              {keySaved && (
                <span className="text-xs text-sage-500 font-medium">Saved</span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Insight Delivery */}
      <Section title="Insight Delivery">
        <div className="card">
          <p className="text-xs text-text-tertiary mb-5">
            Choose how each type of insight is delivered to you. (Configurable in Phase 2)
          </p>
          <div className="space-y-3">
            {INSIGHT_TYPES.map((type) => (
              <div key={type.key} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{type.label}</span>
                <select
                  value={insightDelivery[type.key]}
                  onChange={(e) => updateDelivery(type.key, e.target.value)}
                  disabled
                  className="text-xs border border-border rounded-md px-2.5 py-1.5 bg-parchment-100 text-text-tertiary focus:outline-none cursor-not-allowed"
                >
                  {DELIVERY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Application</span>
            <span className="text-sm font-medium text-text-primary">Lodestar</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Version</span>
            <span className="text-sm text-text-primary">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Phase</span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-sage-50 text-sage-600 border border-sage-100">
              Phase 1 — Foundation
            </span>
          </div>
        </div>
      </Section>
    </div>
  )
}
