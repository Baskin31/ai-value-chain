import { layers } from '../../data/loader'
import type { Layer } from '../../schema/types'

interface SidebarProps {
  activeLayerIds: string[]
  onToggleLayer: (id: string) => void
  onSelectAll: () => void
}

export function Sidebar({ activeLayerIds, onToggleLayer, onSelectAll }: SidebarProps) {
  const sortedLayers = [...layers].sort((a, b) => a.order - b.order)
  const allActive = activeLayerIds.length === 0

  return (
    <aside className="w-48 shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto flex flex-col">
      <div className="p-3 flex-1">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-1">
          Layers
        </div>
        <button
          onClick={onSelectAll}
          className={[
            'w-full text-left px-2 py-1.5 rounded text-xs mb-1 transition-colors',
            allActive
              ? 'bg-slate-800 text-slate-100'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
          ].join(' ')}
        >
          All layers
        </button>
        {sortedLayers.map((layer: Layer) => {
          const isActive = activeLayerIds.length === 0 || activeLayerIds.includes(layer.id)
          return (
            <button
              key={layer.id}
              onClick={() => onToggleLayer(layer.id)}
              className={[
                'w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2',
                isActive
                  ? 'text-slate-100'
                  : 'text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: layer.accent_color }}
              />
              <span className="truncate">{layer.name}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
