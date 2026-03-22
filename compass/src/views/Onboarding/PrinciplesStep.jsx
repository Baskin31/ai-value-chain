import React, { useState } from 'react'
import { createPrinciple } from '../../lib/api'

function newPrinciple() {
  return { statement: '' }
}

export default function PrinciplesStep({ onNext, onBack }) {
  const [principles, setPrinciples] = useState([newPrinciple(), newPrinciple()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function updatePrinciple(index, value) {
    setPrinciples((prev) =>
      prev.map((p, i) => (i === index ? { ...p, statement: value } : p))
    )
  }

  function addPrinciple() {
    setPrinciples((prev) => [...prev, newPrinciple()])
  }

  function removePrinciple(index) {
    setPrinciples((prev) => prev.filter((_, i) => i !== index))
  }

  const toSave = principles.filter((p) => p.statement.trim().length > 0)
  const canContinue = toSave.length > 0

  async function handleContinue() {
    setSaving(true)
    setError(null)
    try {
      await Promise.all(toSave.map((p) => createPrinciple({ statement: p.statement.trim() })))
      onNext()
    } catch (err) {
      setError('Something went wrong saving your principles. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-text-primary mb-3 leading-snug">
        How do you show up?
      </h1>
      <p className="text-text-secondary text-base mb-10 leading-relaxed">
        These aren't rules — they're commitments. The behaviours that, when kept, let
        you look yourself in the eye.
      </p>

      <div className="space-y-4">
        {principles.map((p, index) => (
          <div key={index} className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sage-50 border border-sage-100 flex items-center justify-center mt-3">
              <span className="text-xs text-sage-500 font-medium">{index + 1}</span>
            </div>
            <div className="flex-1">
              <textarea
                className="textarea-base"
                rows={2}
                placeholder="e.g. I finish what I've committed to others before starting something new."
                value={p.statement}
                onChange={(e) => updatePrinciple(index, e.target.value)}
              />
            </div>
            {principles.length > 1 && (
              <button
                type="button"
                onClick={() => removePrinciple(index)}
                className="flex-shrink-0 mt-3 text-text-tertiary hover:text-warning transition-colors duration-100"
                title="Remove"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add another */}
      <button
        type="button"
        onClick={addPrinciple}
        className="mt-6 text-sm text-sage-500 hover:text-sage-600 font-medium transition-colors duration-100 flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add another principle
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
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
