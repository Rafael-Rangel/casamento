import { format, getDaysInMonth, parseISO, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinanceState } from '../types/finance'
import {
  collectAgendaEvents,
  type AgendaEvent,
  type AgendaKind,
} from './agenda'
import { weddingMonthBudgets } from './projections'
import { buildWeddingSchedule, TAG_LABEL } from './wedding'

export interface MonthObligation {
  id: string
  date: string
  label: string
  amount: number
  meta: string
  kind: AgendaKind | 'wedding'
  direction: 'in' | 'out'
  paid: boolean
  source: 'income' | 'life' | 'wedding'
  /** Tag da categoria do casamento (salão, noiva, etc.) */
  tag?: string
}

export interface CategoryTotal {
  tag: string
  label: string
  total: number
  paid: number
  pending: number
}

export interface MonthPlan {
  monthKey: string
  monthLabel: string
  today: string
  cashNow: number
  /** Tudo que entra no mês */
  incomeTotal: number
  incomeReceived: number
  incomePending: number
  incomeItems: MonthObligation[]
  /** Vida / cartão no mês */
  lifeTotal: number
  lifePaid: number
  lifePending: number
  lifeItems: MonthObligation[]
  /** Casamento no mês (cronograma) */
  weddingTotal: number
  weddingPaid: number
  weddingPending: number
  weddingItems: MonthObligation[]
  /** Gastos do casamento agrupados por categoria */
  weddingByCategory: CategoryTotal[]
  /** Tudo que precisa pagar no mês */
  mustPayTotal: number
  mustPayPending: number
  /** Receita − gastos do casamento = sobra para vida e cartão */
  leftoverForLife: number
  /** Sobra final (vida/cartão) depois de descontar as despesas de vida já lançadas */
  leftoverAfterLife: number
  /** Sobra pra você depois de pagar tudo do mês */
  leftoverForMe: number
  /** Com o caixa de hoje + o que ainda entra − o que ainda falta pagar */
  leftoverFromNow: number
  /** Agenda do mês: o que receber e o que pagar em cada dia */
  daily: {
    date: string
    label: string
    weekday: string
    isToday: boolean
    isPast: boolean
    isFuture: boolean
    receive: MonthObligation[]
    pay: MonthObligation[]
    receiveTotal: number
    payTotal: number
  }[]
}

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(1, day), getDaysInMonth(new Date(year, monthIndex, 1)))
}

function suggestWeddingPayDate(monthKey: string, todayKey: string, index: number) {
  const [y, m] = monthKey.split('-').map(Number)
  // Depois do salário (dia 10): começa no dia 12
  const baseDay = 12 + index
  const day = clampDay(y, m - 1, baseDay)
  let date = `${monthKey}-${String(day).padStart(2, '0')}`
  if (date < todayKey && monthKey === todayKey.slice(0, 7)) {
    // Se a sugestão já passou neste mês, agenda para hoje
    date = todayKey
  }
  return date
}

function weddingObligations(
  state: FinanceState,
  monthKey: string,
  todayKey: string,
): MonthObligation[] {
  const budgets = weddingMonthBudgets(state)
  const { schedule } = buildWeddingSchedule(budgets, state.wedding.flexItems)
  const month = schedule.find((m) => m.key === monthKey)
  if (!month) return []

  let unpaidIndex = 0
  return month.payments.map((p, i) => {
    const checkKey = `${month.short}::${p.name}`
    const paid = !!state.wedding.checked[checkKey]
    const date = paid
      ? // pagos: mantém no início do mês só para histórico
        `${monthKey}-01`
      : suggestWeddingPayDate(monthKey, todayKey, unpaidIndex++)

    return {
      id: `wedding-${monthKey}-${i}-${p.name}`,
      date,
      label: p.name,
      amount: p.amount,
      meta: `Casamento · ${TAG_LABEL[p.tag] || p.tag}`,
      kind: 'wedding' as const,
      direction: 'out' as const,
      paid,
      source: 'wedding' as const,
      tag: p.tag,
    }
  })
}

function groupByCategory(items: MonthObligation[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const item of items) {
    const tag = item.tag || 'outros'
    const entry =
      map.get(tag) ||
      { tag, label: TAG_LABEL[tag] || tag, total: 0, paid: 0, pending: 0 }
    entry.total += item.amount
    if (item.paid) entry.paid += item.amount
    else entry.pending += item.amount
    map.set(tag, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

function toObligation(e: AgendaEvent, todayKey: string): MonthObligation {
  return {
    id: e.id,
    date: e.date,
    label: e.label,
    amount: e.amount,
    meta: e.meta,
    kind: e.kind,
    direction: e.direction,
    paid: e.date <= todayKey,
    source: e.direction === 'in' ? 'income' : 'life',
  }
}

export function buildMonthPlan(state: FinanceState, today: Date = new Date()): MonthPlan {
  const monthStart = startOfMonth(today)
  const monthKey = format(today, 'yyyy-MM')
  const todayKey = format(today, 'yyyy-MM-dd')
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const financeEvents = collectAgendaEvents(state, monthStart, monthEnd)
  const incomeItems = financeEvents
    .filter((e) => e.direction === 'in')
    .map((e) => toObligation(e, todayKey))
  const lifeItems = financeEvents
    .filter((e) => e.direction === 'out')
    .map((e) => toObligation(e, todayKey))
  const weddingItems = weddingObligations(state, monthKey, todayKey)

  const sum = (items: MonthObligation[], pred: (i: MonthObligation) => boolean) =>
    items.filter(pred).reduce((s, i) => s + i.amount, 0)

  const incomeTotal = sum(incomeItems, () => true)
  const incomeReceived = sum(incomeItems, (i) => i.paid)
  const incomePending = sum(incomeItems, (i) => !i.paid)

  const lifeTotal = sum(lifeItems, () => true)
  const lifePaid = sum(lifeItems, (i) => i.paid)
  const lifePending = sum(lifeItems, (i) => !i.paid)

  const weddingTotal = sum(weddingItems, () => true)
  const weddingPaid = sum(weddingItems, (i) => i.paid)
  const weddingPending = sum(weddingItems, (i) => !i.paid)

  const weddingByCategory = groupByCategory(weddingItems)

  const mustPayTotal = lifeTotal + weddingTotal
  const mustPayPending = lifePending + weddingPending

  const cashNow = state.cashBalance?.amount ?? 0
  // Foco: receita − gastos do casamento = quanto sobra para vida e cartão
  const leftoverForLife = incomeTotal - weddingTotal
  const leftoverAfterLife = leftoverForLife - lifeTotal
  const leftoverForMe = cashNow + incomeTotal - mustPayTotal
  const leftoverFromNow = cashNow + incomePending - mustPayPending

  const byDate = new Map<string, { receive: MonthObligation[]; pay: MonthObligation[] }>()
  const bump = (item: MonthObligation) => {
    const bucket = byDate.get(item.date) || { receive: [], pay: [] }
    if (item.direction === 'in') bucket.receive.push(item)
    else bucket.pay.push(item)
    byDate.set(item.date, bucket)
  }
  ;[...incomeItems, ...lifeItems, ...weddingItems].forEach(bump)

  const daily = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { receive, pay }]) => {
      const d = parseISO(date)
      return {
        date,
        label: format(d, "d 'de' MMMM", { locale: ptBR }),
        weekday: format(d, 'EEEE', { locale: ptBR }),
        isToday: date === todayKey,
        isPast: date < todayKey,
        isFuture: date > todayKey,
        receive,
        pay,
        receiveTotal: receive.reduce((s, i) => s + i.amount, 0),
        payTotal: pay.reduce((s, i) => s + i.amount, 0),
      }
    })

  return {
    monthKey,
    monthLabel: format(today, "MMMM yyyy", { locale: ptBR }),
    today: todayKey,
    cashNow,
    incomeTotal,
    incomeReceived,
    incomePending,
    incomeItems,
    lifeTotal,
    lifePaid,
    lifePending,
    lifeItems,
    weddingTotal,
    weddingPaid,
    weddingPending,
    weddingItems,
    weddingByCategory,
    mustPayTotal,
    mustPayPending,
    leftoverForLife,
    leftoverAfterLife,
    leftoverForMe,
    leftoverFromNow,
    daily,
  }
}
