import { DisclaimerModal } from './components/Disclaimer'
import { AppLayout } from './components/layout/AppLayout'
import { DetailPanel } from './components/layout/DetailPanel'
import { StackView } from './components/views/StackView'
import { ScatterView } from './components/views/ScatterView'
import { CompanyDetail } from './components/company/CompanyDetail'
import { useAppStore } from './store'

// Placeholder view components — replaced in later phases
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
        {selectedCompanyId && <CompanyDetail companyId={selectedCompanyId} />}
      </DetailPanel>
    </>
  )
}
