import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModelConfig } from '../schema/types'

export type View = 'stack' | 'scatter' | 'ranking' | 'picks'

export interface Pick {
  id: string
  companyId: string
  addedAt: string       // ISO date string
  status: 'watching' | 'positioned' | 'exited'
  notes: string
  targetPriceB?: number // optional target market cap in $B
}

type WeightOverrides = Partial<ModelConfig['floor_weights'] & ModelConfig['ceiling_weights']>

interface AppState {
  view: View
  selectedCompanyId: string | null
  activeLayerIds: string[]
  weightOverrides: WeightOverrides
  picks: Pick[]
}

interface AppActions {
  setView: (view: View) => void
  selectCompany: (id: string | null) => void
  toggleLayer: (layerId: string) => void
  setActiveLayerIds: (ids: string[]) => void
  setWeightOverride: (key: keyof WeightOverrides, value: number) => void
  resetWeights: () => void
  addPick: (pick: Pick) => void
  updatePick: (id: string, updates: Partial<Omit<Pick, 'id'>>) => void
  removePick: (id: string) => void
  exportPicks: () => string  // returns JSON string
  importPicks: (json: string) => void  // parses and merges
}

// Picks are persisted; view/filter state is ephemeral
const usePicksStore = create<{ picks: Pick[] } & { addPick: (p: Pick) => void; updatePick: (id: string, u: Partial<Omit<Pick, 'id'>>) => void; removePick: (id: string) => void }>()(
  persist(
    (set) => ({
      picks: [],
      addPick: (pick) =>
        set((s) => ({ picks: [...s.picks, pick] })),
      updatePick: (id, updates) =>
        set((s) => ({
          picks: s.picks.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      removePick: (id) =>
        set((s) => ({ picks: s.picks.filter((p) => p.id !== id) })),
    }),
    { name: 'ai-value-chain-picks' }
  )
)

const useEphemeralStore = create<Omit<AppState, 'picks'> & Omit<AppActions, 'addPick' | 'updatePick' | 'removePick' | 'exportPicks' | 'importPicks'>>()((set) => ({
  view: 'stack',
  selectedCompanyId: null,
  activeLayerIds: [],
  weightOverrides: {},
  setView: (view) => set({ view }),
  selectCompany: (id) => set({ selectedCompanyId: id }),
  toggleLayer: (layerId) =>
    set((s) => ({
      activeLayerIds: s.activeLayerIds.includes(layerId)
        ? s.activeLayerIds.filter((id) => id !== layerId)
        : [...s.activeLayerIds, layerId],
    })),
  setActiveLayerIds: (ids) => set({ activeLayerIds: ids }),
  setWeightOverride: (key, value) =>
    set((s) => ({ weightOverrides: { ...s.weightOverrides, [key]: value } })),
  resetWeights: () => set({ weightOverrides: {} }),
}))

// Single unified hook for the whole app
export function useAppStore(): AppState & AppActions {
  const ephemeral = useEphemeralStore()
  const { picks, addPick, updatePick, removePick } = usePicksStore()

  return {
    ...ephemeral,
    picks,
    addPick,
    updatePick,
    removePick,
    exportPicks: () => JSON.stringify(picks, null, 2),
    importPicks: (json: string) => {
      try {
        const parsed = JSON.parse(json) as Pick[]
        if (!Array.isArray(parsed)) return
        for (const pick of parsed) {
          if (pick.id && pick.companyId && !picks.find((p) => p.id === pick.id)) {
            addPick(pick)
          }
        }
      } catch {
        // ignore parse errors
      }
    },
  }
}
