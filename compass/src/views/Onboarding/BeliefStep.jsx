import React, { useState, useRef } from 'react'
import { createBelief, suggestDomains } from '../../lib/api'

const DOMAINS = ['growth', 'relationships', 'service', 'integrity', 'freedom']

function newBelief() {
  return { statement: '', domains: [], importance_score: 7 }
}

function newSuggestion() {
  return { domains: [], reason: '', loading: false, dismissed: false, noSuggestion: false }
}

function ImportanceDots({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-5 h-5 rounded-full border transition-colors duration-100 flex-shrink-0 ${
            n <= value
              ? 'bg-sage-500 border-sage-500'
              : 'border-border bg-transparent hover:border-sage-400'
          }`}
          title={String(n)}
        />
      ))}
    </div>
  )
}

export default function BeliefStep({ onNext }) {
  const [beliefs, setBeliefs] = useState([newBelief()])
  const [suggestions, setSuggestions] = useState([newSuggestion()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const debounceRefs = useRef([])

  function updateBelief(index, patch) {
    setBeliefs((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }

  function toggleDomain(index, domain) {
    setBeliefs((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b
        const already = b.domains.includes(domain)
        const next = already ? b.domains.filter((d) => d !== domain) : [...b.domains, domain]
        return { ...b, domains: next }
      })
    )
    // User is taking control — dismiss suggestion
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, dismissed: true } : s))
    )
  }

  function handleStatementChange(index, value) {
    updateBelief(index, { statement: value })

    // Reset suggestion state when statement changes
    setSuggestions((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, dismissed: false, domains: [], reason: '', noSuggestion: false }
          : s
      )
    )

    // Clear any pending debounce for this belief
    clearTimeout(debounceRefs.current[index])

    if (value.trim().length < 10) {
      setSuggestions((prev) =>
        prev.map((s, i) => (i === index ? { ...s, loading: false } : s))
      )
      return
    }

    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, loading: true } : s))
    )

    debounceRefs.current[index] = setTimeout(async () => {
      const result = await suggestDomains(value)
      setSuggestions((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                domains: result?.domains ?? [],
                reason: result?.reason ?? '',
                loading: false,
                dismissed: false,
                noSuggestion: result === null,
              }
            : s
        )
      )
    }, 1000)
  }

  function applySuggestion(index) {
    const suggestion = suggestions[index]
    const validDomains = suggestion.domains.filter((d) => DOMAINS.includes(d))
    setBeliefs((prev) =>
      prev.map((b, i) => (i === index ? { ...b, domains: validDomains } : b))
    )
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, dismissed: true } : s))
    )
  }

  function dismissSuggestion(index) {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, dismissed: true } : s))
    )
  }

  function addBelief() {
    setBeliefs((prev) => [...prev, newBelief()])
    setSuggestions((prev) => [...prev, newSuggestion()])
  }

  function removeBelief(index) {
    clearTimeout(debounceRefs.current[index])
    setBeliefs((prev) => prev.filter((_, i) => i !== index))
    setSuggestions((prev) => prev.filter((_, i) => i !== index))
  }

  const hasValid = beliefs.some((b) => b.statement.trim().length >= 10)

  async function handleContinue() {
    setSaving(true)
    setError(null)
    try {
      const toSave = beliefs.filter((b) => b.statement.trim().length >= 10)
      await Promise.all(
        toSave.map((b) =>
          createBelief({
            statement: b.statement.trim(),
            domains: JSON.stringify(b.domains.filter((d) => DOMAINS.includes(d))),
            importance_score: b.importance_score,
          })
        )
      )
      onNext()
    } catch {
      setError('Something went wrong saving your beliefs. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-text-primary mb-3 leading-snug">
        What do you know to be true?
      </h1>
      <p className="text-text-secondary text-base mb-10 leading-relaxed">
        Before goals, before plans — the bedrock truths you'd stake your life on.
      </p>

      <div className="space-y-8">
        {beliefs.map((belief, index) => {
          const suggestion = suggestions[index] || newSuggestion()
          const showSuggestion =
            !suggestion.loading &&
            !suggestion.dismissed &&
            suggestion.domains.length > 0

          return (
            <div key={index}>
              {index > 0 && <div className="border-t border-border-light mb-8" />}

              <div className="space-y-4">
                {/* Statement */}
                <div>
                  <div className="label-sm mb-2">
                    Belief <span className="text-warning">*</span>
                  </div>
                  <textarea
                    className="textarea-base"
                    rows={4}
                    placeholder="e.g. Relationships are the only thing that outlast us."
                    value={belief.statement}
                    onChange={(e) => handleStatementChange(index, e.target.value)}
                  />

                  {/* Loading indicator */}
                  {suggestion.loading && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-text-tertiary">Analyzing…</span>
                    </div>
                  )}

                  {/* No API key hint */}
                  {suggestion.noSuggestion && !suggestion.loading && (
                    <p className="mt-1.5 text-xs text-text-tertiary">
                      Add an API key in Settings to get domain suggestions.
                    </p>
                  )}

                  {/* AI Suggestion card */}
                  {showSuggestion && (
                    <div className="mt-2 rounded-lg border border-sage-400 bg-sage-50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4D7C6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span className="text-xs font-semibold text-sage-600">Claude suggests</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissSuggestion(index)}
                          className="text-sm text-text-tertiary hover:text-text-secondary transition-colors leading-none"
                          title="Dismiss"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {suggestion.domains.map((d) => (
                          <span
                            key={d}
                            className="px-2.5 py-1 rounded-full text-xs font-medium border border-sage-400 bg-white text-sage-600 capitalize"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      {suggestion.reason && (
                        <p className="text-xs text-text-secondary italic leading-relaxed mb-3">
                          {suggestion.reason}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => applySuggestion(index)}
                        className="bg-sage-500 hover:bg-sage-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-100"
                      >
                        Apply suggestion
                      </button>
                    </div>
                  )}
                </div>

                {/* Domain pills — multi-select */}
                <div>
                  <div className="label-sm mb-2">
                    Domain{' '}
                    <span className="normal-case font-normal text-text-tertiary">(optional — select all that apply)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DOMAINS.map((d) => {
                      const active = belief.domains.includes(d)
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDomain(index, d)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-100 ${
                            active
                              ? 'bg-sage-500 border-sage-500 text-white'
                              : 'border-border text-text-secondary hover:border-sage-400 hover:text-sage-500'
                          }`}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Importance */}
                <div>
                  <div className="label-sm mb-2">
                    How central is this?{' '}
                    <span className="normal-case font-normal text-text-tertiary">(optional)</span>
                  </div>
                  <ImportanceDots
                    value={belief.importance_score}
                    onChange={(n) => updateBelief(index, { importance_score: n })}
                  />
                  <div className="text-xs text-text-tertiary mt-1.5">
                    {belief.importance_score} / 10
                  </div>
                </div>

                {/* Remove */}
                {beliefs.length > 1 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeBelief(index)}
                      className="text-xs text-text-tertiary hover:text-warning transition-colors duration-100"
                    >
                      Remove this belief
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add another */}
      <button
        type="button"
        onClick={addBelief}
        className="mt-8 text-sm text-sage-500 hover:text-sage-600 font-medium transition-colors duration-100 flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add another belief
      </button>

      {error && <p className="mt-4 text-sm text-warning">{error}</p>}

      {/* Footer */}
      <div className="flex justify-end mt-12">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!hasValid || saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
