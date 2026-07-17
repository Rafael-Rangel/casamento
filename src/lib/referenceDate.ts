import { parseISO } from 'date-fns'
import type { FinanceState } from '../types/finance'

/** Data de referência para todos os cálculos (saldo em caixa ou hoje). */
export function getReferenceDate(state: FinanceState): Date {
  const asOf = state.cashBalance?.asOf
  if (asOf) return parseISO(asOf)
  return new Date()
}

export function getReferenceDayKey(state: FinanceState): string {
  const d = getReferenceDate(state)
  return d.toISOString().slice(0, 10)
}
