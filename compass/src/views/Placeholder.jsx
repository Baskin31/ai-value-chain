import React from 'react'

export default function Placeholder({ title, description, comingSoon = true }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-24 px-8 text-center">
      <div className="max-w-md">
        <h1 className="font-serif text-3xl text-text-primary mb-4 leading-snug">{title}</h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">{description}</p>
        {comingSoon && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-parchment-200 text-text-tertiary border border-border">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Coming in Phase 2
          </span>
        )}
      </div>
    </div>
  )
}
