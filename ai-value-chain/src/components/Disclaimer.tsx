import { useState, useEffect } from 'react'

const DISCLAIMER_TEXT =
  'This tool provides illustrative structured judgment about competitive position and investment entry. It is not a forecast, price target, or financial recommendation. The author is not a financial advisor. All analysis reflects the author\'s opinions as of the dates shown.'

const STORAGE_KEY = 'ai-vc-disclaimer-accepted'

// Inline variant: small grey text for use inside panels
export function DisclaimerInline() {
  return (
    <p className="text-xs text-slate-500 leading-relaxed">{DISCLAIMER_TEXT}</p>
  )
}

// Modal variant: shown on first load
export function DisclaimerModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY)
    if (!accepted) setOpen(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full mx-4 p-6 shadow-2xl">
        <h2 className="text-slate-100 font-semibold text-lg mb-3">Disclaimer</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">{DISCLAIMER_TEXT}</p>
        <button
          onClick={accept}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          I understand — continue
        </button>
      </div>
    </div>
  )
}
