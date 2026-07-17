import { createInitialState, seedProjects, SEED_VERSION, STORAGE_KEY } from './defaults'
import { createWeddingState } from './wedding'
import type { Expense, FinanceState, Project } from '../types/finance'

/** Injeta projetos-semente ausentes (por id) uma única vez por versão de semente */
function applyProjectSeed(projects: Project[], seedVersion: number | undefined): Project[] {
  if (seedVersion !== undefined && seedVersion >= SEED_VERSION) return projects
  const existingIds = new Set(projects.map((p) => p.id))
  const missing = seedProjects().filter((p) => !existingIds.has(p.id))
  return [...projects, ...missing]
}

export function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as Partial<FinanceState>
    const base = createInitialState()
    return {
      ...base,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : base.categories,
      projects: applyProjectSeed(parsed.projects ?? base.projects, parsed.seedVersion),
      seedVersion: SEED_VERSION,
      wedding: {
        ...createWeddingState(),
        ...(parsed.wedding || {}),
        checked: parsed.wedding?.checked || {},
        flexItems: parsed.wedding?.flexItems?.length
          ? parsed.wedding.flexItems
          : base.wedding.flexItems,
        alreadyPaid: parsed.wedding?.alreadyPaid?.length
          ? parsed.wedding.alreadyPaid
          : base.wedding.alreadyPaid,
      },
      expenses: (parsed.expenses || base.expenses).map((e: Expense) => ({
        ...e,
        purpose: e.purpose || 'life',
      })),
    }
  } catch {
    return createInitialState()
  }
}

export function saveState(state: FinanceState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
