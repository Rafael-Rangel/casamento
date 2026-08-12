import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { hydrateState, loadState, saveState } from '../lib/storage'
import { buildProjections } from '../lib/projections'
import { deviceTodayKey, getReferenceDate } from '../lib/referenceDate'
import { CASH_OPENING_FRESH, CASH_OPENING_FRESH_AS_OF, STORAGE_KEY } from '../lib/defaults'
import { applyAgentActions, type AgentAction } from '../lib/agentActions'
import { recomputeCashBalance } from '../lib/cashLedger'
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

function withRecomputedCash(s: FinanceState): FinanceState {
  const expenses = s.expenses.filter((e) => {
    if ((e.purpose || 'life') !== 'life') return true
    return !/vestido/i.test(e.name)
  })
  return {
    ...s,
    expenses,
    cashBalance: recomputeCashBalance({
      expenses,
      otherIncomes: s.otherIncomes,
      cash: s.cashBalance,
      throughDate: deviceTodayKey(),
    }),
  }
}

interface FinanceContextValue {
  state: FinanceState
  projections: ReturnType<typeof buildProjections>
  cloudStatus: 'checking' | 'locked' | 'loading' | 'synced' | 'saving' | 'offline' | 'error'
  cloudError: string
  cloudUpdatedAt: string
  loginCloud: (code: string) => Promise<boolean>
  syncNow: () => Promise<void>
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
  const [cloudStatus, setCloudStatus] =
    useState<FinanceContextValue['cloudStatus']>('checking')
  const [cloudError, setCloudError] = useState('')
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState('')
  const revisionRef = useRef(0)
  const cloudReadyRef = useRef(false)
  const skipNextCloudSaveRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  const statusRef = useRef(cloudStatus)

  useEffect(() => {
    stateRef.current = state
    saveState(state)
  }, [state])

  useEffect(() => {
    statusRef.current = cloudStatus
  }, [cloudStatus])

  const applyRemoteState = useCallback((remote: FinanceState) => {
    skipNextCloudSaveRef.current = true
    setState(hydrateState(remote))
  }, [])

  const pushCloudState = useCallback(async (nextState: FinanceState) => {
    setCloudStatus('saving')
    setCloudError('')
    try {
      let response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: nextState, baseRevision: revisionRef.current }),
      })

      if (response.status === 409) {
        const conflict = await response.json()
        const latestRevision = Number(conflict.current?.revision) || revisionRef.current
        response = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: nextState, baseRevision: latestRevision }),
        })
      }

      if (response.status === 401) {
        cloudReadyRef.current = false
        setCloudStatus('locked')
        return
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Não foi possível salvar na nuvem.')
      }

      const cloud = await response.json()
      revisionRef.current = Number(cloud.revision) || revisionRef.current
      setCloudUpdatedAt(String(cloud.updatedAt || ''))
      setCloudStatus('synced')
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Erro de sincronização.')
      setCloudStatus(navigator.onLine ? 'error' : 'offline')
    }
  }, [])

  const loadCloudState = useCallback(async () => {
    setCloudStatus('loading')
    setCloudError('')
    try {
      const response = await fetch('/api/state', { cache: 'no-store' })
      if (response.status === 401) {
        cloudReadyRef.current = false
        setCloudStatus('locked')
        return
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Não foi possível carregar a nuvem.')
      }

      const cloud = await response.json()
      revisionRef.current = Number(cloud.revision) || 0
      setCloudUpdatedAt(String(cloud.updatedAt || ''))

      if (cloud.state) {
        applyRemoteState(cloud.state as FinanceState)
        cloudReadyRef.current = true
        setCloudStatus('synced')
      } else {
        cloudReadyRef.current = true
        await pushCloudState(stateRef.current)
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Erro de sincronização.')
      setCloudStatus(navigator.onLine ? 'error' : 'offline')
    }
  }, [applyRemoteState, pushCloudState])

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/sync-login', { cache: 'no-store' })
        const result = await response.json()
        if (result.authorized) await loadCloudState()
        else setCloudStatus('locked')
      } catch {
        setCloudStatus(navigator.onLine ? 'error' : 'offline')
        setCloudError('Não foi possível conectar ao banco de dados.')
      }
    })()
  }, [loadCloudState])

  useEffect(() => {
    if (!cloudReadyRef.current) return
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => void pushCloudState(state), 900)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state, pushCloudState])

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (
        !cloudReadyRef.current ||
        statusRef.current === 'saving' ||
        document.visibilityState !== 'visible'
      ) {
        return
      }
      try {
        const response = await fetch('/api/state', { cache: 'no-store' })
        if (!response.ok) return
        const cloud = await response.json()
        if (Number(cloud.revision) > revisionRef.current && cloud.state) {
          revisionRef.current = Number(cloud.revision)
          setCloudUpdatedAt(String(cloud.updatedAt || ''))
          applyRemoteState(cloud.state as FinanceState)
          setCloudStatus('synced')
        }
      } catch {
        setCloudStatus('offline')
      }
    }, 10000)
    return () => window.clearInterval(interval)
  }, [applyRemoteState])

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
    cloudStatus,
    cloudError,
    cloudUpdatedAt,
    loginCloud: async (code) => {
      setCloudStatus('loading')
      setCloudError('')
      try {
        const response = await fetch('/api/sync-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          setCloudError(error.error || 'Código incorreto.')
          setCloudStatus('locked')
          return false
        }
        await loadCloudState()
        return true
      } catch {
        setCloudError('Não foi possível acessar a nuvem.')
        setCloudStatus(navigator.onLine ? 'error' : 'offline')
        return false
      }
    },
    syncNow: loadCloudState,
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
        const normalized: Expense = {
          ...expense,
          purpose: expense.purpose || 'life',
          paid: expense.kind === 'unique' ? !!expense.paid : false,
          paidOccurrences: expense.kind === 'unique' ? undefined : expense.paidOccurrences,
        }
        const exists = s.expenses.some((x) => x.id === normalized.id)
        const expenses = exists
          ? s.expenses.map((x) => (x.id === normalized.id ? normalized : x))
          : [...s.expenses, normalized]
        return withRecomputedCash({ ...s, expenses })
      }),
    removeExpense: (id) =>
      patch((s) =>
        withRecomputedCash({
          ...s,
          expenses: s.expenses.filter((x) => x.id !== id),
        }),
      ),
    upsertOtherIncome: (income) =>
      patch((s) => {
        const normalized: OtherIncome = {
          ...income,
          received: income.recurring ? false : !!income.received,
          receivedOccurrences: income.recurring ? income.receivedOccurrences : undefined,
        }
        const exists = s.otherIncomes.some((x) => x.id === normalized.id)
        const otherIncomes = exists
          ? s.otherIncomes.map((x) => (x.id === normalized.id ? normalized : x))
          : [...s.otherIncomes, normalized]
        return withRecomputedCash({ ...s, otherIncomes })
      }),
    removeOtherIncome: (id) =>
      patch((s) =>
        withRecomputedCash({
          ...s,
          otherIncomes: s.otherIncomes.filter((x) => x.id !== id),
        }),
      ),
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
      patch((s) => {
        const prev = s.cashBalance || {
          amount: 0,
          asOf: deviceTodayKey(),
          notes: '',
          openingAmount: CASH_OPENING_FRESH,
          openingAsOf: CASH_OPENING_FRESH_AS_OF,
        }
        // Edição manual = ajusta a BASE do extrato; o valor na conta é recalculado
        const openingAmount =
          typeof cash.openingAmount === 'number'
            ? cash.openingAmount
            : typeof cash.amount === 'number'
              ? cash.amount
              : prev.openingAmount
        const openingAsOf = cash.openingAsOf || prev.openingAsOf || CASH_OPENING_FRESH_AS_OF
        return withRecomputedCash({
          ...s,
          cashBalance: {
            ...prev,
            ...cash,
            openingAmount,
            openingAsOf,
          },
        })
      }),
    runAgentActions: (actions) => {
      const result = applyAgentActions(state, actions)
      setState(withRecomputedCash(result.state))
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
