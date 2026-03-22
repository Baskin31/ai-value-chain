import React, { useState } from 'react'
import { setWhy } from '../../lib/api'

export default function WhyStep({ onNext, onBack }) {
  const [form, setForm] = useState({ statement: '', origin_story: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const canContinue = form.statement.trim().length > 0

  async function handleContinue() {
    setSaving(true)
    setError(null)
    try {
      await setWhy({
        statement: form.statement.trim(),
        origin_story: form.origin_story.trim() || null,
      })
      onNext()
    } catch (err) {
      setError('Something went wrong saving your why. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-text-primary mb-3 leading-snug">
        What are you here to contribute?
      </h1>
      <p className="text-text-secondary text-base mb-10 leading-relaxed">
        Not what you want to achieve — the mark you're here to leave. The reason your
        particular combination of gifts exists.
      </p>

      <div className="space-y-7">
        {/* Why statement */}
        <div>
          <div className="text-sm italic text-text-tertiary mb-2">I exist to...</div>
          <textarea
            className="textarea-base"
            rows={5}
            placeholder="...help people find clarity in moments of confusion, so they can move forward with confidence."
            value={form.statement}
            onChange={(e) => update('statement', e.target.value)}
          />
        </div>

        {/* Origin story */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            What experience first revealed this to you?
          </label>
          <textarea
            className="textarea-base"
            rows={4}
            placeholder="A moment, a person, a turning point..."
            value={form.origin_story}
            onChange={(e) => update('origin_story', e.target.value)}
          />
          <p className="text-xs text-text-tertiary mt-1.5">Optional, but grounding.</p>
        </div>
      </div>

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
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
