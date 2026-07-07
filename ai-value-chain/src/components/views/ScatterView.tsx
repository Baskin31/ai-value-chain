import { FloorCeilingScatter } from '../charts/FloorCeilingScatter'

export function ScatterView() {
  return (
    <div className="p-4 h-full flex flex-col" style={{ minHeight: 500 }}>
      <div className="mb-3">
        <h2 className="text-slate-100 font-semibold text-sm">Floor vs. Ceiling</h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Bubble size = market cap · Color = layer · Click to open detail
        </p>
      </div>
      <div className="flex-1">
        <FloorCeilingScatter />
      </div>
    </div>
  )
}
