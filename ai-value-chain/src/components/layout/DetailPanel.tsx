import { DisclaimerInline } from '../Disclaimer'

interface DetailPanelProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function DetailPanel({ open, onClose, children }: DetailPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={[
          'fixed top-0 right-0 bottom-0 z-40 w-full max-w-xl bg-slate-900 border-l border-slate-800',
          'flex flex-col overflow-hidden transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors text-sm"
          >
            ← Close
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer disclaimer */}
        <div className="px-6 py-3 border-t border-slate-800 shrink-0">
          <DisclaimerInline />
        </div>
      </div>
    </>
  )
}
