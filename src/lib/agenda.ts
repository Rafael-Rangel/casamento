import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  getDate,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Expense, FinanceState, OtherIncome, Project, SalarySource } from '../types/finance'
import { implementationIncome, monthlyYourShare } from './projectShare'

export type AgendaKind =
  | 'salary'
  | 'project_payment'
  | 'project_monthly'
  | 'other_income'
  | 'expense'

export type AgendaDirection = 'in' | 'out'

export interface AgendaEvent {
  id: string
  date: string
  direction: AgendaDirection
  kind: AgendaKind
  label: string
  amount: number
  meta: string
  sourceId: string
}

export interface DayAgenda {
  date: string
  label: string
  short: string
  weekday: string
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  events: AgendaEvent[]
  totalIn: number
  totalOut: number
  net: number
}

function clampDay(year: number, monthIndex: number, day: number) {
  const max = getDaysInMonth(new Date(year, monthIndex, 1))
  return Math.min(Math.max(1, day), max)
}

function dateWithDay(base: Date, day: number) {
  const y = base.getFullYear()
  const m = base.getMonth()
  return format(new Date(y, m, clampDay(y, m, day)), 'yyyy-MM-dd')
}

function isActiveOnDate(start: string, end: string | null | undefined, day: Date) {
  const d = startOfDay(day)
  const s = startOfDay(parseISO(start))
  if (isBefore(d, s)) return false
  if (end) {
    const e = endOfDay(parseISO(end))
    if (isAfter(d, e)) return false
  }
  return true
}

function expenseInstallmentDates(expense: Expense): { date: string; amount: number; index: number }[] {
  if (expense.kind !== 'installment' || !expense.installmentCount || expense.installmentCount < 1) {
    return [{ date: expense.date, amount: expense.amount, index: 1 }]
  }
  const count = expense.installmentCount
  const base = Math.floor((expense.amount / count) * 100) / 100
  let allocated = 0
  const start = parseISO(expense.date)
  return Array.from({ length: count }, (_, i) => {
    const amount = i === count - 1 ? Math.round((expense.amount - allocated) * 100) / 100 : base
    allocated += amount
    return {
      date: format(addMonths(start, i), 'yyyy-MM-dd'),
      amount,
      index: i + 1,
    }
  })
}

function salaryEvents(salaries: SalarySource[], from: Date, to: Date): AgendaEvent[] {
  const events: AgendaEvent[] = []
  let cursor = startOfMonth(from)
  const last = startOfMonth(to)
  while (!isAfter(cursor, last)) {
    for (const s of salaries) {
      if (!s.active) continue
      const payDate = dateWithDay(cursor, s.payDay)
      const d = parseISO(payDate)
      if (isBefore(d, startOfDay(from)) || isAfter(d, endOfDay(to))) continue
      if (!isActiveOnDate(s.startDate, s.endDate, d)) continue
      events.push({
        id: `salary-${s.id}-${payDate}`,
        date: payDate,
        direction: 'in',
        kind: 'salary',
        label: s.name,
        amount: s.amount,
        meta: `Salário · dia ${s.payDay}`,
        sourceId: s.id,
      })
    }
    cursor = addMonths(cursor, 1)
  }
  return events
}

function projectEvents(projects: Project[], from: Date, to: Date): AgendaEvent[] {
  const events: AgendaEvent[] = []
  const fromD = startOfDay(from)
  const toD = endOfDay(to)

  for (const p of projects) {
    for (const inst of p.installments) {
      const d = parseISO(inst.date)
      if (isBefore(d, fromD) || isAfter(d, toD)) continue
      if (inst.amount <= 0) continue
      events.push({
        id: `proj-pay-${inst.id}`,
        date: inst.date,
        direction: 'in',
        kind: 'project_payment',
        label: p.name,
        amount: implementationIncome(inst.amount),
        meta: p.client
          ? `Implementação 100% · ${p.client}`
          : 'Implementação 100%',
        sourceId: p.id,
      })
    }

    if (!p.hasMonthly || !p.monthlyStart || p.monthlyAmount <= 0) continue
    const startDay = getDate(parseISO(p.monthlyStart))
    let cursor = startOfMonth(from)
    const last = startOfMonth(to)
    while (!isAfter(cursor, last)) {
      const payDate = dateWithDay(cursor, startDay)
      const d = parseISO(payDate)
      if (!isBefore(d, fromD) && !isAfter(d, toD) && isActiveOnDate(p.monthlyStart, p.monthlyEnd, d)) {
        // Mensalidade só a partir do mês de início (não antes do monthlyStart)
        if (!isBefore(d, startOfDay(parseISO(p.monthlyStart)))) {
          events.push({
            id: `proj-month-${p.id}-${payDate}`,
            date: payDate,
            direction: 'in',
            kind: 'project_monthly',
            label: `Mensalidade · ${p.name}`,
            amount: monthlyYourShare(p.monthlyAmount),
            meta: `2/3 de ${p.monthlyAmount.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}${p.client ? ` · ${p.client}` : ''}`,
            sourceId: p.id,
          })
        }
      }
      cursor = addMonths(cursor, 1)
    }
  }
  return events
}

function otherIncomeEvents(items: OtherIncome[], from: Date, to: Date): AgendaEvent[] {
  const events: AgendaEvent[] = []
  const fromD = startOfDay(from)
  const toD = endOfDay(to)

  for (const o of items) {
    if (!o.recurring) {
      const d = parseISO(o.date)
      if (isBefore(d, fromD) || isAfter(d, toD)) continue
      events.push({
        id: `other-${o.id}`,
        date: o.date,
        direction: 'in',
        kind: 'other_income',
        label: o.name,
        amount: o.amount,
        meta: 'Receita única',
        sourceId: o.id,
      })
      continue
    }

    const startDay = getDate(parseISO(o.date))
    let cursor = startOfMonth(from)
    const last = startOfMonth(to)
    while (!isAfter(cursor, last)) {
      const payDate = dateWithDay(cursor, startDay)
      const d = parseISO(payDate)
      if (!isBefore(d, fromD) && !isAfter(d, toD) && isActiveOnDate(o.date, o.endDate, d)) {
        if (!isBefore(d, startOfDay(parseISO(o.date)))) {
          events.push({
            id: `other-${o.id}-${payDate}`,
            date: payDate,
            direction: 'in',
            kind: 'other_income',
            label: o.name,
            amount: o.amount,
            meta: 'Receita recorrente',
            sourceId: o.id,
          })
        }
      }
      cursor = addMonths(cursor, 1)
    }
  }
  return events
}

function expenseEvents(
  expenses: Expense[],
  categories: FinanceState['categories'],
  from: Date,
  to: Date,
): AgendaEvent[] {
  const events: AgendaEvent[] = []
  const fromD = startOfDay(from)
  const toD = endOfDay(to)
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  for (const e of expenses) {
    const cat = catMap[e.categoryId] || 'Outros'
    const purpose = e.purpose === 'wedding' ? 'Casamento' : 'Vida/cartão'

    if (e.kind === 'unique') {
      const d = parseISO(e.date)
      if (isBefore(d, fromD) || isAfter(d, toD)) continue
      events.push({
        id: `exp-${e.id}`,
        date: e.date,
        direction: 'out',
        kind: 'expense',
        label: e.name,
        amount: e.amount,
        meta: `${purpose} · ${cat}`,
        sourceId: e.id,
      })
    } else if (e.kind === 'recurring') {
      const startDay = getDate(parseISO(e.date))
      let cursor = startOfMonth(from)
      const last = startOfMonth(to)
      while (!isAfter(cursor, last)) {
        const payDate = dateWithDay(cursor, startDay)
        const d = parseISO(payDate)
        if (!isBefore(d, fromD) && !isAfter(d, toD) && isActiveOnDate(e.date, e.endDate, d)) {
          if (!isBefore(d, startOfDay(parseISO(e.date)))) {
            events.push({
              id: `exp-${e.id}-${payDate}`,
              date: payDate,
              direction: 'out',
              kind: 'expense',
              label: e.name,
              amount: e.amount,
              meta: `${purpose} · ${cat} · recorrente`,
              sourceId: e.id,
            })
          }
        }
        cursor = addMonths(cursor, 1)
      }
    } else {
      for (const part of expenseInstallmentDates(e)) {
        const d = parseISO(part.date)
        if (isBefore(d, fromD) || isAfter(d, toD)) continue
        events.push({
          id: `exp-${e.id}-${part.index}`,
          date: part.date,
          direction: 'out',
          kind: 'expense',
          label: e.name,
          amount: part.amount,
          meta: `${purpose} · ${cat} · parcela ${part.index}/${e.installmentCount}`,
          sourceId: e.id,
        })
      }
    }
  }
  return events
}

export function collectAgendaEvents(
  state: FinanceState,
  from: Date,
  to: Date,
): AgendaEvent[] {
  return [
    ...salaryEvents(state.salaries, from, to),
    ...projectEvents(state.projects, from, to),
    ...otherIncomeEvents(state.otherIncomes, from, to),
    ...expenseEvents(state.expenses, state.categories, from, to),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label))
}

export function buildDayAgenda(
  state: FinanceState,
  from: Date = startOfMonth(new Date()),
  to: Date = endOfMonth(addMonths(new Date(), 2)),
  today: Date = new Date(),
): DayAgenda[] {
  const events = collectAgendaEvents(state, from, to)
  const byDate = new Map<string, AgendaEvent[]>()
  for (const e of events) {
    const list = byDate.get(e.date) || []
    list.push(e)
    byDate.set(e.date, list)
  }

  const days = eachDayOfInterval({ start: startOfDay(from), end: endOfDay(to) })
  const todayStart = startOfDay(today)

  return days
    .map((day) => {
      const key = format(day, 'yyyy-MM-dd')
      const dayEvents = byDate.get(key) || []
      if (dayEvents.length === 0 && !isSameDay(day, todayStart)) return null

      const totalIn = dayEvents.filter((e) => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
      const totalOut = dayEvents.filter((e) => e.direction === 'out').reduce((s, e) => s + e.amount, 0)
      const isToday = isSameDay(day, todayStart)
      const isPast = isBefore(day, todayStart)
      const isFuture = isAfter(day, todayStart)

      return {
        date: key,
        label: format(day, "d 'de' MMMM yyyy", { locale: ptBR }),
        short: format(day, 'dd/MM', { locale: ptBR }),
        weekday: format(day, 'EEEE', { locale: ptBR }),
        isToday,
        isPast,
        isFuture,
        events: dayEvents,
        totalIn,
        totalOut,
        net: totalIn - totalOut,
      } satisfies DayAgenda
    })
    .filter((d): d is DayAgenda => d !== null)
}

export interface CashflowSnapshot {
  today: string
  receivedUntilToday: number
  pendingIncome: number
  spentUntilToday: number
  pendingExpense: number
  /** Recebido − gasto até hoje (do fluxo do período, sem saldo em caixa) */
  netUntilToday: number
  /** Ainda a receber − ainda a pagar no restante do período */
  netPending: number
  nextIncomes: AgendaEvent[]
  nextExpenses: AgendaEvent[]
  thisMonthIn: number
  thisMonthOut: number
}

/** Situação em relação a hoje: o que já entrou/saiu vs o que ainda falta */
export function cashflowSnapshot(
  state: FinanceState,
  today: Date = new Date(),
  horizonMonths = 2,
): CashflowSnapshot {
  const from = startOfMonth(today)
  const to = endOfMonth(addMonths(today, horizonMonths))
  const events = collectAgendaEvents(state, from, to)
  const todayKey = format(today, 'yyyy-MM-dd')
  const monthKey = format(today, 'yyyy-MM')

  let receivedUntilToday = 0
  let pendingIncome = 0
  let spentUntilToday = 0
  let pendingExpense = 0
  let thisMonthIn = 0
  let thisMonthOut = 0

  for (const e of events) {
    const inThisMonth = e.date.startsWith(monthKey)
    if (e.direction === 'in') {
      if (inThisMonth) thisMonthIn += e.amount
      if (e.date <= todayKey) receivedUntilToday += e.amount
      else pendingIncome += e.amount
    } else {
      if (inThisMonth) thisMonthOut += e.amount
      if (e.date <= todayKey) spentUntilToday += e.amount
      else pendingExpense += e.amount
    }
  }

  const nextIncomes = events.filter((e) => e.direction === 'in' && e.date > todayKey).slice(0, 8)
  const nextExpenses = events.filter((e) => e.direction === 'out' && e.date > todayKey).slice(0, 8)

  return {
    today: todayKey,
    receivedUntilToday,
    pendingIncome,
    spentUntilToday,
    pendingExpense,
    netUntilToday: receivedUntilToday - spentUntilToday,
    netPending: pendingIncome - pendingExpense,
    nextIncomes,
    nextExpenses,
    thisMonthIn,
    thisMonthOut,
  }
}

export function eventsOnDate(events: AgendaEvent[], date: string) {
  return events.filter((e) => e.date === date)
}

export function isReceived(event: AgendaEvent, today: Date = new Date()) {
  return !isAfter(parseISO(event.date), endOfDay(today))
}

export function capitalizeWeekday(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
