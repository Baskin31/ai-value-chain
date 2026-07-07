import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { DataFreshnessBar } from '../DataFreshnessBar'
import { useAppStore } from '../../store'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { view, setView, activeLayerIds, toggleLayer, setActiveLayerIds } = useAppStore()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header view={view} onViewChange={setView} />
      <DataFreshnessBar />
      <div className="flex flex-1 overflow-hidden">
        {view !== 'picks' && (
          <Sidebar
            activeLayerIds={activeLayerIds}
            onToggleLayer={toggleLayer}
            onSelectAll={() => setActiveLayerIds([])}
          />
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
