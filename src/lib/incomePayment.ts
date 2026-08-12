import { getDate, getDaysInMonth, parseISO } from 'date-fns'
import type { OtherIncome } from '../types/finance'

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(1, day), getDaysInMonth(new Date(year, monthIndex, 1)))
}

export function otherIncomePayDateInMonth(income: OtherIncome, monthKey: string): string | null {
  if (!income.recurring) return null
  if (monthKey < income.date.slice(0, 7)) return null
  if (income.endDate && monthKey > income.endDate.slice(0, 7)) return null
  const [y, m] = monthKey.split('-').map(Number)
  const day = clampDay(y, m - 1, getDate(parseISO(income.date)))
  const payDate = `${monthKey}-${String(day).padStart(2, '0')}`
  if (payDate < income.date) return null
  if (income.endDate && payDate > income.endDate) return null
  return payDate
}

export function isOtherIncomeOccurrenceReceived(
  income: OtherIncome,
  occurrenceDate: string,
): boolean {
  if (!income.recurring) return !!income.received
  if (income.receivedOccurrences && occurrenceDate in income.receivedOccurrences) {
    return !!income.receivedOccurrences[occurrenceDate]
  }
  return false
}

export function setOtherIncomeOccurrenceReceived(
  income: OtherIncome,
  occurrenceDate: string,
  received: boolean,
): OtherIncome {
  if (!income.recurring) {
    return { ...income, received, receivedOccurrences: undefined }
  }
  return {
    ...income,
    received: false,
    receivedOccurrences: {
      ...(income.receivedOccurrences || {}),
      [occurrenceDate]: received,
    },
  }
}

/** Define status recebido/pendente na UI. */
export function setOtherIncomeReceivedFlag(
  income: OtherIncome,
  received: boolean,
  refDate: string,
): OtherIncome {
  if (!income.recurring) {
    return { ...income, received, receivedOccurrences: undefined }
  }
  const payDate = otherIncomePayDateInMonth(income, refDate.slice(0, 7))
  if (!payDate) return { ...income, received: false }
  return setOtherIncomeOccurrenceReceived(income, payDate, received)
}

/** Status exibido na lista (mês/data de referência). */
export function isOtherIncomeDisplayReceived(income: OtherIncome, refDate: string): boolean {
  if (!income.recurring) return !!income.received
  const payDate = otherIncomePayDateInMonth(income, refDate.slice(0, 7))
  return payDate ? isOtherIncomeOccurrenceReceived(income, payDate) : false
}

/** Migra receitas antigas: data ≤ asOf → recebida (preserva comportamento por data). */
export function migrateOtherIncomeReceivedStatus(
  income: OtherIncome,
  asOf: string,
): OtherIncome {
  if (!income.recurring) {
    if (typeof income.received === 'boolean') {
      return { ...income, received: income.received, receivedOccurrences: undefined }
    }
    return { ...income, received: income.date <= asOf, receivedOccurrences: undefined }
  }

  if (income.receivedOccurrences && Object.keys(income.receivedOccurrences).length > 0) {
    return { ...income, received: false, receivedOccurrences: income.receivedOccurrences }
  }

  const receivedOccurrences: Record<string, boolean> = {
    ...(income.receivedOccurrences || {}),
  }
  let cursor = income.date.slice(0, 7)
  const end = (income.endDate || asOf).slice(0, 7)
  while (cursor <= end && cursor <= asOf.slice(0, 7)) {
    const d = otherIncomePayDateInMonth(income, cursor)
    if (d && d <= asOf) receivedOccurrences[d] = true
    const [y, m] = cursor.split('-').map(Number)
    cursor = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  }
  return { ...income, received: false, receivedOccurrences }
}
