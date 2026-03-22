import React, { useState, useEffect } from 'react'
import { getBeliefs, getWhy, getPrinciples } from '../lib/api'

function ImportanceDots({ value, max = 10 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={`w-3.5 h-3.5 rounded-full ${
            n <= value ? 'bg-sage-500' : 'border border-border bg-transparent'
          }`}
        />
      ))}
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function EditButton() {
  return (
    <button
      type="button"
      className="text-xs text-text-tertiary border border-border rounded-md px-3 py-1.5 hover:bg-parchment-200 transition-colors"
      title="Edit (coming in Phase 2)"
      disabled
    >
      Edit
    </button>
  )
}

const DOMAIN_COLORS = {
  growth: '#4D7C6F',
  relationships: '#7B6B5B',
  service: '#5B6B7B',
  integrity: '#7B5B6B',
  freedom: '#6B7B5B',
  other: '#6B5B7B',
  general: '#9A918A',
}

export default function BeliefsView() {
  const [beliefs, setBeliefs] = useState([])
  const [why, setWhy] = useState(null)
  const [principles, setPrinciples] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBeliefs(), getWhy(), getPrinciples()]).then(([b, w, p]) => {
      setBeliefs(b)
      setWhy(w)
      setPrinciples(p)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-tertiary text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-text-primary mb-1">Beliefs & Why</h1>
        <p className="text-text-secondary text-sm">The foundation beneath everything else.</p>
      </div>

      {/* Why Statement */}
      <Section title="Your Why" action={<EditButton />}>
        {why ? (
          <div className="card space-y-4">
            <p className="font-serif text-xl italic text-text-primary leading-relaxed">
              "{why.statement}"
            </p>
            {why.origin_story && (
              <div className="pt-4 border-t border-border-light">
                <div className="label-sm mb-2">Origin</div>
                <p className="text-text-secondary text-sm leading-relaxed">{why.origin_story}</p>
              </div>
            )}
            {why.resonance_score && (
              <div className="pt-3 border-t border-border-light flex items-center gap-3">
                <span className="label-sm">Resonance</span>
                <ImportanceDots value={why.resonance_score} />
                <span className="text-xs text-text-tertiary">{why.resonance_score}/10</span>
              </div>
            )}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-text-tertiary text-sm">Not yet set.</p>
          </div>
        )}
      </Section>

      {/* Core Beliefs */}
      <Section title="Your Beliefs" action={<EditButton />}>
        {beliefs.length > 0 ? (
          <div className="space-y-3">
            {beliefs.map((belief) => {
              const domains = (() => {
                try { return JSON.parse(belief.domains || '["general"]') }
                catch { return ['general'] }
              })()
              return (
                <div key={belief.belief_id} className="card">
                  <p className="text-text-primary text-sm leading-relaxed mb-3">
                    {belief.statement}
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {domains.map((d) => {
                        const color = DOMAIN_COLORS[d] || DOMAIN_COLORS.general
                        return (
                          <span
                            key={d}
                            className="text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize"
                            style={{
                              color,
                              borderColor: `${color}40`,
                              backgroundColor: `${color}12`,
                            }}
                          >
                            {d}
                          </span>
                        )
                      })}
                      {belief.last_reviewed && (
                        <span className="text-xs text-text-tertiary">
                          Reviewed {new Date(belief.last_reviewed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ImportanceDots value={belief.importance_score} />
                      <span className="text-xs text-text-tertiary">{belief.importance_score}/10</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-text-tertiary text-sm">No beliefs recorded yet.</p>
          </div>
        )}
      </Section>

      {/* Operating Principles */}
      <Section title="How You Operate" action={<EditButton />}>
        {principles.length > 0 ? (
          <div className="space-y-3">
            {principles.map((p, index) => (
              <div key={p.principle_id} className="card flex gap-4 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-sage-50 border border-sage-100 flex items-center justify-center">
                  <span className="text-xs text-sage-500 font-medium">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm leading-relaxed">{p.statement}</p>
                  {p.violated_count > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7D5A3C" strokeWidth="2" strokeLinecap="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="text-xs text-warning">
                        Noted {p.violated_count} time{p.violated_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-text-tertiary text-sm">No principles recorded yet.</p>
          </div>
        )}
      </Section>
    </div>
  )
}
