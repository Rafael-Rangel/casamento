import {
  addMonths,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  Expense,
  FinanceState,
  MonthEntry,
  MonthProjection,
  OtherIncome,
  Project,
  SalarySource,
} from '../types/finance'
import { implementationIncome, monthlyYourShare } from './projectShare'

function monthKey(d: Date) {
  return format(d, 'yyyy-MM')
}

function inMonth(dateStr: string, month: Date) {
  const d = parseISO(dateStr)
  return monthKey(d) === monthKey(month)
}

function isActiveInMonth(start: string, end: string | null | undefined, month: Date) {
  const mStart = startOfMonth(month)
  const mEnd = endOfMonth(month)
  const s = startOfMonth(parseISO(start))
  if (isAfter(s, mEnd)) return false
  if (end) {
    const e = endOfMonth(parseISO(end))
    if (isBefore(e, mStart)) return false
  }
  return true
}

function salaryEntries(salaries: SalarySource[], month: Date): MonthEntry[] {
  return salaries
    .filter((s) => s.active && isActiveInMonth(s.startDate, s.endDate, month))
    .map((s) => ({
      id: `salary-${s.id}-${monthKey(month)}`,
      kind: 'salary' as const,
      label: s.name,
      amount: s.amount,
      meta: `Dia ${s.payDay}`,
      sourceId: s.id,
    }))
}

function projectEntries(projects: Project[], month: Date): MonthEntry[] {
  const entries: MonthEntry[] = []

  for (const p of projects) {
    for (const inst of p.installments) {
      if (inMonth(inst.date, month)) {
        entries.push({
          id: `proj-pay-${inst.id}`,
          kind: 'project_payment',
          label: p.name,
          amount: implementationIncome(inst.amount),
          meta: p.client
            ? `Implementação 100% · ${p.client}`
            : 'Implementação 100%',
          sourceId: p.id,
        })
      }
    }

    if (
      p.hasMonthly &&
      p.monthlyStart &&
      p.monthlyAmount > 0 &&
      isActiveInMonth(p.monthlyStart, p.monthlyEnd, month)
    ) {
      const yours = monthlyYourShare(p.monthlyAmount)
      entries.push({
        id: `proj-month-${p.id}-${monthKey(month)}`,
        kind: 'project_monthly',
        label: `Mensalidade · ${p.name}`,
        amount: yours,
        meta: `2/3 de ${p.monthlyAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${
          p.client ? ` · ${p.client}` : ''
        }`,
        sourceId: p.id,
      })
    }
  }

  return entries
}

function otherIncomeEntries(items: OtherIncome[], month: Date): MonthEntry[] {
  const entries: MonthEntry[] = []
  for (const o of items) {
    if (o.recurring) {
      if (isActiveInMonth(o.date, o.endDate, month)) {
        entries.push({
          id: `other-${o.id}-${monthKey(month)}`,
          kind: 'other_income',
          label: o.name,
          amount: o.amount,
          meta: 'Recorrente',
          sourceId: o.id,
        })
      }
    } else if (inMonth(o.date, month)) {
      entries.push({
        id: `other-${o.id}`,
        kind: 'other_income',
        label: o.name,
        amount: o.amount,
        meta: 'Única',
        sourceId: o.id,
      })
    }
  }
  return entries
}

function expenseInstallmentDates(expense: Expense): { date: string; amount: number; index: number }[] {
  if (expense.kind !== 'installment' || !expense.installmentCount || expense.installmentCount < 1) {
    return [{ date: expense.date, amount: expense.amount, index: 1 }]
  }
  const count = expense.installmentCount
  const base = Math.floor((expense.amount / count) * 100) / 100
  const parts: { date: string; amount: number; index: number }[] = []
  let allocated = 0
  const start = parseISO(expense.date)

  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? Math.round((expense.amount - allocated) * 100) / 100 : base
    allocated += amount
    parts.push({
      date: format(addMonths(start, i), 'yyyy-MM-dd'),
      amount,
      index: i + 1,
    })
  }
  return parts
}

function expenseEntries(
  expenses: Expense[],
  categories: FinanceState['categories'],
  month: Date,
): MonthEntry[] {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const entries: MonthEntry[] = []

  for (const e of expenses) {
    const cat = catMap[e.categoryId] || 'Outros'

    const purpose = e.purpose || 'life'
    const metaBase =
      e.kind === 'unique' ? 'Único' : e.kind === 'recurring' ? 'Recorrente' : null

    if (e.kind === 'unique') {
      if (inMonth(e.date, month)) {
        entries.push({
          id: `exp-${e.id}`,
          kind: 'expense',
          label: e.name,
          amount: e.amount,
          category: cat,
          meta: metaBase || 'Único',
          sourceId: e.id,
          purpose,
        })
      }
    } else if (e.kind === 'recurring') {
      if (isActiveInMonth(e.date, e.endDate, month)) {
        entries.push({
          id: `exp-${e.id}-${monthKey(month)}`,
          kind: 'expense',
          label: e.name,
          amount: e.amount,
          category: cat,
          meta: 'Recorrente',
          sourceId: e.id,
          purpose,
        })
      }
    } else {
      for (const part of expenseInstallmentDates(e)) {
        if (inMonth(part.date, month)) {
          entries.push({
            id: `exp-${e.id}-${part.index}`,
            kind: 'expense',
            label: e.name,
            amount: part.amount,
            category: cat,
            meta: `Parcela ${part.index}/${e.installmentCount}`,
            sourceId: e.id,
            purpose,
          })
        }
      }
    }
  }

  return entries
}

export function buildProjections(
  state: FinanceState,
  fromDate: Date = new Date(),
): MonthProjection[] {
  const start = startOfMonth(fromDate)
  const end = endOfMonth(addMonths(start, Math.max(1, state.projectionMonths) - 1))
  const months = eachMonthOfInterval({ start, end })

  let cumulative = 0
  return months.map((month) => {
    const incomes = [
      ...salaryEntries(state.salaries, month),
      ...projectEntries(state.projects, month),
      ...otherIncomeEntries(state.otherIncomes, month),
    ]
    const expenses = expenseEntries(state.expenses, state.categories, month)
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
    const totalExpense = expenses.reduce((s, i) => s + i.amount, 0)
    const lifeExpense = expenses
      .filter((e) => (e.purpose || 'life') === 'life')
      .reduce((s, i) => s + i.amount, 0)
    const weddingBudget = totalIncome - lifeExpense
    const balance = totalIncome - totalExpense
    cumulative += balance

    return {
      key: monthKey(month),
      year: month.getFullYear(),
      month: month.getMonth(),
      label: format(month, 'MMMM yyyy', { locale: ptBR }),
      short: format(month, 'MMM', { locale: ptBR }),
      incomes,
      expenses,
      totalIncome,
      totalExpense,
      lifeExpense,
      weddingBudget,
      balance,
      cumulativeBalance: cumulative,
    }
  })
}

/** Sobra mensal Jun–Dez/2026 para alimentar o cronograma do casamento */
export function weddingMonthBudgets(state: FinanceState): number[] {
  const keys = [
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
  ]
  const all = buildProjections(state, parseISO('2026-06-01')).filter((p) =>
    keys.includes(p.key),
  )
  const byKey = Object.fromEntries(all.map((p) => [p.key, p.weddingBudget]))
  return keys.map((k) => byKey[k] ?? 0)
}

export function sumByKind(entries: MonthEntry[], kind: MonthEntry['kind']) {
  return entries.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0)
}

export function upcomingIncomes(projections: MonthProjection[], limit = 6) {
  const now = startOfMonth(new Date())
  const items: { dateLabel: string; entry: MonthEntry }[] = []
  for (const m of projections) {
    const mDate = parseISO(`${m.key}-01`)
    if (isBefore(mDate, now) && !isEqual(mDate, now)) continue
    for (const e of m.incomes) {
      items.push({ dateLabel: m.label, entry: e })
      if (items.length >= limit) return items
    }
  }
  return items
}

export function upcomingExpenses(projections: MonthProjection[], limit = 6) {
  const now = startOfMonth(new Date())
  const items: { dateLabel: string; entry: MonthEntry }[] = []
  for (const m of projections) {
    const mDate = parseISO(`${m.key}-01`)
    if (isBefore(mDate, now) && !isEqual(mDate, now)) continue
    for (const e of m.expenses) {
      items.push({ dateLabel: m.label, entry: e })
      if (items.length >= limit) return items
    }
  }
  return items
}

export function recurringRevenue(state: FinanceState, month: Date = new Date()) {
  let total = 0
  for (const s of state.salaries) {
    if (s.active && isActiveInMonth(s.startDate, s.endDate, month)) total += s.amount
  }
  for (const p of state.projects) {
    if (
      p.hasMonthly &&
      p.monthlyStart &&
      p.monthlyAmount > 0 &&
      isActiveInMonth(p.monthlyStart, p.monthlyEnd, month)
    ) {
      total += monthlyYourShare(p.monthlyAmount)
    }
  }
  for (const o of state.otherIncomes) {
    if (o.recurring && isActiveInMonth(o.date, o.endDate, month)) total += o.amount
  }
  return total
}

export function futureMonthlyFees(state: FinanceState, from: Date = new Date()) {
  const fromKey = monthKey(startOfMonth(from))
  return state.projects
    .filter(
      (p) =>
        p.hasMonthly &&
        p.monthlyStart &&
        p.monthlyAmount > 0 &&
        (!p.monthlyEnd || monthKey(parseISO(p.monthlyStart)) >= fromKey || !p.monthlyEnd),
    )
    .map((p) => ({
      name: p.name,
      /** Valor bruto cobrado do cliente */
      gross: p.monthlyAmount,
      /** Sua parte (2/3) */
      amount: monthlyYourShare(p.monthlyAmount),
      start: p.monthlyStart!,
      end: p.monthlyEnd,
    }))
}
