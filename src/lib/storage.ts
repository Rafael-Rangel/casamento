import { createInitialState, STORAGE_KEY } from './defaults'
import { createWeddingState } from './wedding'
import type { Expense, FinanceState } from '../types/finance'

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
