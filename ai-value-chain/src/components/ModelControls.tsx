import { useState } from 'react'
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
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-xs w-32 shrink-0">{label}</span>
      <input
        type="range"
        min="0.01"
        max="1.00"
        step="0.01"
        value={currentValue}
        onChange={(e) => onChange(weightKey, parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="text-slate-400 text-xs font-mono w-10 text-right">
        {currentValue.toFixed(2)}
      </span>
      {Math.abs(currentValue - defaultValue) > 0.001 && (
        <span className="text-amber-400 text-xs">(mod)</span>
      )}
    </div>
  )
}

export function ModelControls() {
  const [open, setOpen] = useState(true)
  const { weightOverrides, setWeightOverride, resetWeights } = useAppStore()

  const fw = modelConfig.floor_weights
  const cw = modelConfig.ceiling_weights

  function get(key: string, defaultVal: number): number {
    const override = weightOverrides[key as keyof typeof weightOverrides]
    return override !== undefined ? override : defaultVal
  }

  function handleChange(key: string, value: number) {
    setWeightOverride(key as keyof typeof weightOverrides, value)
  }

  const hasOverrides = Object.keys(weightOverrides).length > 0

  return (
    <div className="border-t border-slate-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          Model weights
          {hasOverrides && <span className="text-amber-400 text-xs">(modified)</span>}
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-slate-600 text-xs">Floor weights</p>
          <WeightSlider
            label="Moat durability"
            weightKey="moat_durability"
            defaultValue={fw.moat_durability}
            currentValue={get('moat_durability', fw.moat_durability)}
            onChange={handleChange}
          />
          <WeightSlider
            label="Revenue defensibility"
            weightKey="revenue_defensibility"
            defaultValue={fw.revenue_defensibility}
            currentValue={get('revenue_defensibility', fw.revenue_defensibility)}
            onChange={handleChange}
          />
          <WeightSlider
            label="Balance sheet"
            weightKey="balance_sheet_strength"
            defaultValue={fw.balance_sheet_strength}
            currentValue={get('balance_sheet_strength', fw.balance_sheet_strength)}
            onChange={handleChange}
          />

          <p className="text-slate-600 text-xs mt-2">Ceiling weights</p>
          <WeightSlider
            label="Market expansion"
            weightKey="market_expansion"
            defaultValue={cw.market_expansion}
            currentValue={get('market_expansion', cw.market_expansion)}
            onChange={handleChange}
          />
          <WeightSlider
            label="Comp. ceiling"
            weightKey="competitive_position_ceiling"
            defaultValue={cw.competitive_position_ceiling}
            currentValue={get('competitive_position_ceiling', cw.competitive_position_ceiling)}
            onChange={handleChange}
          />
          <WeightSlider
            label="Optionality"
            weightKey="strategic_optionality"
            defaultValue={cw.strategic_optionality}
            currentValue={get('strategic_optionality', cw.strategic_optionality)}
            onChange={handleChange}
          />

          {hasOverrides && (
            <button
              onClick={resetWeights}
              className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ↺ Reset to defaults
            </button>
          )}
        </div>
      )}
    </div>
  )
}
