import { DisclaimerModal } from './components/Disclaimer'
import { AppLayout } from './components/layout/AppLayout'
import { DetailPanel } from './components/layout/DetailPanel'
import { useAppStore } from './store'

// Placeholder view components — replaced in later phases
function StackView() {
  return <div className="p-8 text-slate-400 font-mono text-sm">Stack view — coming in Phase 12</div>
}
function ScatterView() {
  return <div className="p-8 text-slate-400 font-mono text-sm">Scatter view — coming in Phase 14</div>
}
function RankingView() {
  return <div className="p-8 text-slate-400 font-mono text-sm">Ranking view — coming in Phase 15</div>
}
function PicksView() {
  return <div className="p-8 text-slate-400 font-mono text-sm">Picks view — coming in Phase 16</div>
}

export default function App() {
  const { view, selectedCompanyId, selectCompany } = useAppStore()

  const currentView = {
    stack: <StackView />,
    scatter: <ScatterView />,
    ranking: <RankingView />,
    picks: <PicksView />,
  }[view]

  return (
    <>
      <DisclaimerModal />
      <AppLayout>
        {currentView}
      </AppLayout>
      <DetailPanel
        open={selectedCompanyId !== null}
        onClose={() => selectCompany(null)}
      >
        {selectedCompanyId && (
          <p className="text-slate-400 font-mono text-sm">
            Company detail for {selectedCompanyId} — coming in Phase 13
          </p>
        )}
      </DetailPanel>
    </>
  )
}
