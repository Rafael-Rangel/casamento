import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadState, saveState } from '../lib/storage'
import { buildProjections } from '../lib/projections'
import { getReferenceDate } from '../lib/referenceDate'
import { STORAGE_KEY } from '../lib/defaults'
import { applyAgentActions, type AgentAction } from '../lib/agentActions'
import type {
  CashBalance,
  Category,
  Expense,
  FinanceState,
  OtherIncome,
  Project,
  SalarySource,
  WeddingState,
} from '../types/finance'

interface FinanceContextValue {
  state: FinanceState
  projections: ReturnType<typeof buildProjections>
  setProjectionMonths: (n: number) => void
  upsertSalary: (salary: SalarySource) => void
  removeSalary: (id: string) => void
  upsertProject: (project: Project) => void
  removeProject: (id: string) => void
  upsertExpense: (expense: Expense) => void
  removeExpense: (id: string) => void
  upsertOtherIncome: (income: OtherIncome) => void
  removeOtherIncome: (id: string) => void
  upsertCategory: (category: Category) => void
  removeCategory: (id: string) => void
  updateWedding: (wedding: Partial<WeddingState>) => void
  setCashBalance: (cash: Partial<CashBalance>) => void
  runAgentActions: (actions: AgentAction[]) => string[]
  toggleWeddingCheck: (monthShort: string, itemName: string) => void
  isWeddingChecked: (monthShort: string, itemName: string) => boolean
  resetAll: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const projections = useMemo(
    () => buildProjections(state, getReferenceDate(state)),
    [state],
  )

  const patch = useCallback((fn: (prev: FinanceState) => FinanceState) => {
    setState(fn)
  }, [])

  const value: FinanceContextValue = {
    state,
    projections,
    setProjectionMonths: (n) => patch((s) => ({ ...s, projectionMonths: n })),
    upsertSalary: (salary) =>
      patch((s) => {
        const exists = s.salaries.some((x) => x.id === salary.id)
        return {
          ...s,
          salaries: exists
            ? s.salaries.map((x) => (x.id === salary.id ? salary : x))
            : [...s.salaries, salary],
        }
      }),
    removeSalary: (id) =>
      patch((s) => ({ ...s, salaries: s.salaries.filter((x) => x.id !== id) })),
    upsertProject: (project) =>
      patch((s) => {
        const exists = s.projects.some((x) => x.id === project.id)
        return {
          ...s,
          projects: exists
            ? s.projects.map((x) => (x.id === project.id ? project : x))
            : [...s.projects, project],
        }
      }),
    removeProject: (id) =>
      patch((s) => ({ ...s, projects: s.projects.filter((x) => x.id !== id) })),
    upsertExpense: (expense) =>
      patch((s) => {
        const normalized = { ...expense, purpose: expense.purpose || 'life' }
        const exists = s.expenses.some((x) => x.id === normalized.id)
        return {
          ...s,
          expenses: exists
            ? s.expenses.map((x) => (x.id === normalized.id ? normalized : x))
            : [...s.expenses, normalized],
        }
      }),
    removeExpense: (id) =>
      patch((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== id) })),
    upsertOtherIncome: (income) =>
      patch((s) => {
        const exists = s.otherIncomes.some((x) => x.id === income.id)
        return {
          ...s,
          otherIncomes: exists
            ? s.otherIncomes.map((x) => (x.id === income.id ? income : x))
            : [...s.otherIncomes, income],
        }
      }),
    removeOtherIncome: (id) =>
      patch((s) => ({
        ...s,
        otherIncomes: s.otherIncomes.filter((x) => x.id !== id),
      })),
    upsertCategory: (category) =>
      patch((s) => {
        const exists = s.categories.some((x) => x.id === category.id)
        return {
          ...s,
          categories: exists
            ? s.categories.map((x) => (x.id === category.id ? category : x))
            : [...s.categories, category],
        }
      }),
    removeCategory: (id) =>
      patch((s) => ({
        ...s,
        categories: s.categories.filter((x) => x.id !== id),
      })),
    updateWedding: (wedding) =>
      patch((s) => ({ ...s, wedding: { ...s.wedding, ...wedding } })),
    setCashBalance: (cash) =>
      patch((s) => ({
        ...s,
        cashBalance: {
          ...(s.cashBalance || { amount: 0, asOf: new Date().toISOString().slice(0, 10), notes: '' }),
          ...cash,
        },
      })),
    runAgentActions: (actions) => {
      const result = applyAgentActions(state, actions)
      setState(result.state)
      return result.applied
    },
    toggleWeddingCheck: (monthShort, itemName) =>
      patch((s) => {
        const key = `${monthShort}::${itemName}`
        return {
          ...s,
          wedding: {
            ...s.wedding,
            checked: {
              ...s.wedding.checked,
              [key]: !s.wedding.checked[key],
            },
          },
        }
      }),
    isWeddingChecked: (monthShort, itemName) =>
      !!state.wedding.checked[`${monthShort}::${itemName}`],
    resetAll: () => {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('fluxo-finance-v1')
      setState(loadState())
    },
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
