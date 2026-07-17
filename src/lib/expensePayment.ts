import { addMonths, format, getDate, getDaysInMonth, parseISO } from 'date-fns'
import type { Expense } from '../types/finance'

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(1, day), getDaysInMonth(new Date(year, monthIndex, 1)))
}

export function expenseInstallmentParts(
  expense: Expense,
): { date: string; amount: number; index: number }[] {
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

export function recurringPayDateInMonth(expense: Expense, monthKey: string): string | null {
  if (expense.kind !== 'recurring') return null
  if (monthKey < expense.date.slice(0, 7)) return null
  if (expense.endDate && monthKey > expense.endDate.slice(0, 7)) return null
  const [y, m] = monthKey.split('-').map(Number)
  const day = clampDay(y, m - 1, getDate(parseISO(expense.date)))
  const payDate = `${monthKey}-${String(day).padStart(2, '0')}`
  if (payDate < expense.date) return null
  if (expense.endDate && payDate > expense.endDate) return null
  return payDate
}

/** Occorrências materiais da despesa (única, parcelas ou um mês recorrente). */
export function expenseOccurrences(
  expense: Expense,
  monthKey?: string,
): { date: string; amount: number }[] {
  if (expense.kind === 'unique') {
    return [{ date: expense.date, amount: expense.amount }]
  }
  if (expense.kind === 'installment') {
    return expenseInstallmentParts(expense).map((p) => ({ date: p.date, amount: p.amount }))
  }
  if (!monthKey) return []
  const payDate = recurringPayDateInMonth(expense, monthKey)
  return payDate ? [{ date: payDate, amount: expense.amount }] : []
}

export function isExpenseOccurrencePaid(expense: Expense, occurrenceDate: string): boolean {
  if (expense.kind === 'unique') return !!expense.paid
  if (expense.paidOccurrences && occurrenceDate in expense.paidOccurrences) {
    return !!expense.paidOccurrences[occurrenceDate]
  }
  return false
}

export function setExpenseOccurrencePaid(
  expense: Expense,
  occurrenceDate: string,
  paid: boolean,
): Expense {
  if (expense.kind === 'unique') {
    return { ...expense, paid, paidOccurrences: undefined }
  }
  return {
    ...expense,
    paid: false,
    paidOccurrences: {
      ...(expense.paidOccurrences || {}),
      [occurrenceDate]: paid,
    },
  }
}

/** Define status pago/pendente na UI (unique = flag; demais = ocorrências até a data de referência). */
export function setExpensePaidFlag(expense: Expense, paid: boolean, refDate: string): Expense {
  if (expense.kind === 'unique') {
    return { ...expense, paid, paidOccurrences: undefined }
  }

  if (expense.kind === 'installment') {
    const paidOccurrences = { ...(expense.paidOccurrences || {}) }
    for (const part of expenseInstallmentParts(expense)) {
      if (part.date <= refDate) paidOccurrences[part.date] = paid
    }
    return { ...expense, paid: false, paidOccurrences }
  }

  const payDate = recurringPayDateInMonth(expense, refDate.slice(0, 7))
  if (!payDate) return { ...expense, paid: false }
  return setExpenseOccurrencePaid(expense, payDate, paid)
}

/** Status exibido na lista (mês/data de referência). */
export function isExpenseDisplayPaid(expense: Expense, refDate: string): boolean {
  if (expense.kind === 'unique') return !!expense.paid
  if (expense.kind === 'installment') {
    const due = expenseInstallmentParts(expense).filter((p) => p.date <= refDate)
    if (due.length === 0) return false
    return due.every((p) => isExpenseOccurrencePaid(expense, p.date))
  }
  const payDate = recurringPayDateInMonth(expense, refDate.slice(0, 7))
  return payDate ? isExpenseOccurrencePaid(expense, payDate) : false
}

/** Migra despesas antigas: data ≤ asOf → paga (preserva comportamento anterior). */
export function migrateExpensePaymentStatus(expense: Expense, asOf: string): Expense {
  if (expense.kind === 'unique') {
    if (typeof expense.paid === 'boolean') {
      return { ...expense, paid: expense.paid, paidOccurrences: undefined }
    }
    return { ...expense, paid: expense.date <= asOf, paidOccurrences: undefined }
  }

  if (expense.paidOccurrences && Object.keys(expense.paidOccurrences).length > 0) {
    return { ...expense, paid: false, paidOccurrences: expense.paidOccurrences }
  }

  const occurrences =
    expense.kind === 'installment'
      ? expenseInstallmentParts(expense)
      : (() => {
          const dates: { date: string; amount: number }[] = []
          let cursor = expense.date.slice(0, 7)
          const end = (expense.endDate || asOf).slice(0, 7)
          while (cursor <= end && cursor <= asOf.slice(0, 7)) {
            const d = recurringPayDateInMonth(expense, cursor)
            if (d) dates.push({ date: d, amount: expense.amount })
            const [y, m] = cursor.split('-').map(Number)
            const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
            cursor = next
          }
          return dates
        })()

  const paidOccurrences: Record<string, boolean> = { ...(expense.paidOccurrences || {}) }
  for (const part of occurrences) {
    if (part.date <= asOf) paidOccurrences[part.date] = true
  }
  return { ...expense, paid: false, paidOccurrences }
}
