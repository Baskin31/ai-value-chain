import { differenceInDays, parseISO } from 'date-fns'
import { companies } from '../data/loader'

function computeDataAges() {
  const today = new Date()
  const marketCapAges = companies.map((c) =>
    differenceInDays(today, parseISO(c.fundamentals.market_cap_date))
  )
  const modelAges = companies
    .filter((c) => c.model)
    .map((c) => differenceInDays(today, parseISO(c.model!.model_updated)))

  const maxMarketCapAge = Math.max(...marketCapAges, 0)
  const maxModelAge = Math.max(...modelAges, 0)
  return { maxMarketCapAge, maxModelAge }
}

export function DataFreshnessBar() {
  const { maxMarketCapAge, maxModelAge } = computeDataAges()
  const marketStale = maxMarketCapAge > 21
  const modelStale = maxModelAge > 90

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
      <span className={marketStale ? 'text-amber-400' : 'text-slate-400'}>
        Price data: {maxMarketCapAge}d old{marketStale ? ' ⚠' : ''}
      </span>
      <span className="text-slate-600">|</span>
      <span className={modelStale ? 'text-amber-400' : 'text-slate-400'}>
        Model: {maxModelAge}d old{modelStale ? ' ⚠' : ''}
      </span>
    </div>
  )
}
