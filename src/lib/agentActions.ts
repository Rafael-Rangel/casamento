import { format } from 'date-fns'
import type {
  CashBalance,
  Category,
  Expense,
  FinanceState,
  OtherIncome,
  Project,
  SalarySource,
  WeddingFlexItem,
} from '../types/finance'
import { uid } from './format'

type AgentBase = { type: string }

export type AgentAction =
  | (AgentBase & { type: 'upsertSalary'; salary: Partial<SalarySource> & { name: string; amount: number; payDay: number } })
  | (AgentBase & { type: 'removeSalary'; idOrName: string })
  | (AgentBase & { type: 'upsertProject'; project: Partial<Project> & { name: string; client?: string; totalValue?: number } })
  | (AgentBase & { type: 'removeProject'; idOrName: string })
  | (AgentBase & { type: 'upsertExpense'; expense: Partial<Expense> & { name: string; amount: number; categoryId?: string } })
  | (AgentBase & { type: 'removeExpense'; idOrName: string })
  | (AgentBase & { type: 'upsertOtherIncome'; income: Partial<OtherIncome> & { name: string; amount: number } })
  | (AgentBase & { type: 'removeOtherIncome'; idOrName: string })
  | (AgentBase & { type: 'upsertCategory'; category: Partial<Category> & { name: string } })
  | (AgentBase & { type: 'removeCategory'; idOrName: string })
  | (AgentBase & { type: 'updateCashBalance'; cash: Partial<CashBalance> & { amount: number } })
  | (AgentBase & { type: 'upsertWeddingFlexItem'; item: Partial<WeddingFlexItem> & { name: string; amount: number; tag?: string } })
  | (AgentBase & { type: 'removeWeddingFlexItem'; idOrName: string })
  | (AgentBase & { type: 'setWeddingCheck'; monthShort: string; itemName: string; checked: boolean })
  | (AgentBase & { type: 'setProjectionMonths'; months: number })

export interface AgentResult {
  state: FinanceState
  applied: string[]
}

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

function byIdOrName<T extends { id: string; name: string }>(items: T[], idOrName: string) {
  const needle = idOrName.trim().toLocaleLowerCase('pt-BR')
  return items.find((item) => item.id === idOrName || item.name.trim().toLocaleLowerCase('pt-BR') === needle)
}

function upsert<T extends { id: string }>(items: T[], item: T) {
  return items.some((x) => x.id === item.id)
    ? items.map((x) => (x.id === item.id ? item : x))
    : [...items, item]
}

function normalizeSalary(action: Extract<AgentAction, { type: 'upsertSalary' }>, prev?: SalarySource): SalarySource {
  const s = action.salary
  return {
    id: s.id || prev?.id || uid(),
    name: s.name,
    amount: Number(s.amount) || 0,
    payDay: Math.min(31, Math.max(1, Number(s.payDay) || 10)),
    startDate: s.startDate || prev?.startDate || todayKey(),
    endDate: s.endDate === undefined ? prev?.endDate ?? null : s.endDate,
    active: s.active ?? prev?.active ?? true,
  }
}

function normalizeProject(action: Extract<AgentAction, { type: 'upsertProject' }>, prev?: Project): Project {
  const p = action.project
  const totalValue = Number(p.totalValue ?? prev?.totalValue ?? 0)
  return {
    id: p.id || prev?.id || uid(),
    name: p.name,
    client: p.client ?? prev?.client ?? '',
    closeDate: p.closeDate || prev?.closeDate || todayKey(),
    totalValue,
    installments: (p.installments?.length ? p.installments : prev?.installments) || [
      { id: uid(), amount: totalValue, date: p.closeDate || todayKey() },
    ],
    hasMonthly: p.hasMonthly ?? prev?.hasMonthly ?? false,
    monthlyAmount: Number(p.monthlyAmount ?? prev?.monthlyAmount ?? 0),
    monthlyStart: p.monthlyStart === undefined ? prev?.monthlyStart ?? null : p.monthlyStart,
    monthlyEnd: p.monthlyEnd === undefined ? prev?.monthlyEnd ?? null : p.monthlyEnd,
    notes: p.notes ?? prev?.notes ?? '',
  }
}

function normalizeExpense(
  action: Extract<AgentAction, { type: 'upsertExpense' }>,
  state: FinanceState,
  prev?: Expense,
): Expense {
  const e = action.expense
  const categoryId = e.categoryId || prev?.categoryId || state.categories[0]?.id || 'outros'
  return {
    id: e.id || prev?.id || uid(),
    name: e.name,
    categoryId,
    amount: Number(e.amount) || 0,
    kind: e.kind || prev?.kind || 'unique',
    purpose: e.purpose || prev?.purpose || 'life',
    date: e.date || prev?.date || todayKey(),
    installmentCount: e.installmentCount ?? prev?.installmentCount,
    endDate: e.endDate === undefined ? prev?.endDate ?? null : e.endDate,
    notes: e.notes ?? prev?.notes ?? '',
  }
}

export function applyAgentActions(state: FinanceState, actions: AgentAction[]): AgentResult {
  let next = state
  const applied: string[] = []

  for (const action of actions) {
    switch (action.type) {
      case 'upsertSalary': {
        const prev = action.salary.id ? next.salaries.find((s) => s.id === action.salary.id) : byIdOrName(next.salaries, action.salary.name)
        const salary = normalizeSalary(action, prev)
        next = { ...next, salaries: upsert(next.salaries, salary) }
        applied.push(`Salário: ${salary.name}`)
        break
      }
      case 'removeSalary':
        next = { ...next, salaries: next.salaries.filter((s) => s !== byIdOrName(next.salaries, action.idOrName)) }
        applied.push(`Removido salário: ${action.idOrName}`)
        break
      case 'upsertProject': {
        const prev = action.project.id ? next.projects.find((p) => p.id === action.project.id) : byIdOrName(next.projects, action.project.name)
        const project = normalizeProject(action, prev)
        next = { ...next, projects: upsert(next.projects, project) }
        applied.push(`Projeto: ${project.name}`)
        break
      }
      case 'removeProject':
        next = { ...next, projects: next.projects.filter((p) => p !== byIdOrName(next.projects, action.idOrName)) }
        applied.push(`Removido projeto: ${action.idOrName}`)
        break
      case 'upsertExpense': {
        const prev = action.expense.id ? next.expenses.find((e) => e.id === action.expense.id) : byIdOrName(next.expenses, action.expense.name)
        const expense = normalizeExpense(action, next, prev)
        next = { ...next, expenses: upsert(next.expenses, expense) }
        applied.push(`Despesa: ${expense.name}`)
        break
      }
      case 'removeExpense':
        next = { ...next, expenses: next.expenses.filter((e) => e !== byIdOrName(next.expenses, action.idOrName)) }
        applied.push(`Removida despesa: ${action.idOrName}`)
        break
      case 'upsertOtherIncome': {
        const income: OtherIncome = {
          id: action.income.id || uid(),
          name: action.income.name,
          amount: Number(action.income.amount) || 0,
          date: action.income.date || todayKey(),
          recurring: action.income.recurring ?? false,
          endDate: action.income.endDate ?? null,
          notes: action.income.notes ?? '',
        }
        next = { ...next, otherIncomes: upsert(next.otherIncomes, income) }
        applied.push(`Receita: ${income.name}`)
        break
      }
      case 'removeOtherIncome':
        next = { ...next, otherIncomes: next.otherIncomes.filter((i) => i !== byIdOrName(next.otherIncomes, action.idOrName)) }
        applied.push(`Removida receita: ${action.idOrName}`)
        break
      case 'upsertCategory': {
        const prev = action.category.id ? next.categories.find((c) => c.id === action.category.id) : byIdOrName(next.categories, action.category.name)
        const category: Category = {
          id: action.category.id || prev?.id || uid(),
          name: action.category.name,
          color: action.category.color || prev?.color || '#6C757D',
        }
        next = { ...next, categories: upsert(next.categories, category) }
        applied.push(`Categoria: ${category.name}`)
        break
      }
      case 'removeCategory':
        next = { ...next, categories: next.categories.filter((c) => c !== byIdOrName(next.categories, action.idOrName)) }
        applied.push(`Removida categoria: ${action.idOrName}`)
        break
      case 'updateCashBalance':
        next = {
          ...next,
          cashBalance: {
            ...next.cashBalance,
            amount: Number(action.cash.amount) || 0,
            asOf: action.cash.asOf || todayKey(),
            notes: action.cash.notes ?? next.cashBalance.notes,
          },
        }
        applied.push('Saldo atualizado')
        break
      case 'upsertWeddingFlexItem': {
        const prev = action.item.id ? next.wedding.flexItems.find((i) => i.id === action.item.id) : byIdOrName(next.wedding.flexItems, action.item.name)
        const item: WeddingFlexItem = {
          id: action.item.id || prev?.id || uid(),
          name: action.item.name,
          amount: Number(action.item.amount) || 0,
          tag: action.item.tag || prev?.tag || 'casamento',
        }
        next = { ...next, wedding: { ...next.wedding, flexItems: upsert(next.wedding.flexItems, item) } }
        applied.push(`Item casamento: ${item.name}`)
        break
      }
      case 'removeWeddingFlexItem':
        next = {
          ...next,
          wedding: {
            ...next.wedding,
            flexItems: next.wedding.flexItems.filter((i) => i !== byIdOrName(next.wedding.flexItems, action.idOrName)),
          },
        }
        applied.push(`Removido item do casamento: ${action.idOrName}`)
        break
      case 'setWeddingCheck': {
        const key = `${action.monthShort}::${action.itemName}`
        next = { ...next, wedding: { ...next.wedding, checked: { ...next.wedding.checked, [key]: action.checked } } }
        applied.push(`${action.checked ? 'Pago' : 'Pendente'}: ${action.itemName}`)
        break
      }
      case 'setProjectionMonths':
        next = { ...next, projectionMonths: Math.max(1, Math.min(60, Math.round(action.months))) }
        applied.push(`Horizonte: ${next.projectionMonths} meses`)
        break
    }
  }

  return { state: next, applied }
}
