import { useEffect } from 'react'
import { modelConfig } from '../data/loader'
import { useAppStore } from '../store'

interface SliderProps {
  label: string
  weightKey: string
  defaultValue: number
  currentValue: number
  onChange: (key: string, value: number) => void
}

function WeightSlider({ label, weightKey, defaultValue, currentValue, onChange }: SliderProps) {
  const modified = Math.abs(currentValue - defaultValue) > 0.001
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-40 shrink-0 ${modified ? 'text-amber-300' : 'text-slate-400'}`}>{label}</span>
      <input
        type="range"
        min="0.01"
        max="1.00"
        step="0.01"
        value={currentValue}
        onChange={(e) => onChange(weightKey, parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="text-slate-300 text-xs font-mono w-10 text-right">{currentValue.toFixed(2)}</span>
      {modified && <span className="text-amber-400 text-xs w-8">mod</span>}
    </div>
  )
}

interface ModelWeightsPanelProps {
  open: boolean
  onClose: () => void
}

export function ModelWeightsPanel({ open, onClose }: ModelWeightsPanelProps) {
  const { weightOverrides, setWeightOverride, resetWeights } = useAppStore()
  const fw = modelConfig.floor_weights
  const cw = modelConfig.ceiling_weights
  const hasOverrides = Object.keys(weightOverrides).length > 0

  function get(key: string, defaultVal: number): number {
    const override = weightOverrides[key as keyof typeof weightOverrides]
    return override !== undefined ? override : defaultVal
  }

  function handleChange(key: string, value: number) {
    setWeightOverride(key as keyof typeof weightOverrides, value)
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Model Weights</h2>
            <p className="text-slate-500 text-xs mt-0.5">Drag to adjust — scores update live</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-100 text-lg leading-none transition-colors"
          >
            &#x2715;
          </button>
        </div>

        {/* Sliders */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Floor weights
              <span className="ml-2 text-slate-600 normal-case">(moat x downside protection)</span>
            </p>
            <div className="space-y-4">
              <WeightSlider label="Moat durability" weightKey="moat_durability" defaultValue={fw.moat_durability} currentValue={get('moat_durability', fw.moat_durability)} onChange={handleChange} />
              <WeightSlider label="Revenue defensibility" weightKey="revenue_defensibility" defaultValue={fw.revenue_defensibility} currentValue={get('revenue_defensibility', fw.revenue_defensibility)} onChange={handleChange} />
              <WeightSlider label="Balance sheet" weightKey="balance_sheet_strength" defaultValue={fw.balance_sheet_strength} currentValue={get('balance_sheet_strength', fw.balance_sheet_strength)} onChange={handleChange} />
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Ceiling weights
              <span className="ml-2 text-slate-600 normal-case">(market expansion x upside)</span>
            </p>
            <div className="space-y-4">
              <WeightSlider label="Market expansion" weightKey="market_expansion" defaultValue={cw.market_expansion} currentValue={get('market_expansion', cw.market_expansion)} onChange={handleChange} />
              <WeightSlider label="Competitive ceiling" weightKey="competitive_position_ceiling" defaultValue={cw.competitive_position_ceiling} currentValue={get('competitive_position_ceiling', cw.competitive_position_ceiling)} onChange={handleChange} />
              <WeightSlider label="Strategic optionality" weightKey="strategic_optionality" defaultValue={cw.strategic_optionality} currentValue={get('strategic_optionality', cw.strategic_optionality)} onChange={handleChange} />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-600 mb-3">
              Entry score = Floor x 0.40 + Ceiling x 0.35 + EV x 0.25
              <br />
              VOO benchmark: 30% over 3yr (~10%/yr)
            </p>
            {hasOverrides ? (
              <button
                onClick={resetWeights}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                &#x21BA; Reset all weights to defaults
              </button>
            ) : (
              <span className="text-xs text-slate-600">Using default weights</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
