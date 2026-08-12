import type { FinanceState } from '../types/finance'

/** Hoje no fuso do dispositivo (não UTC). */
export function deviceToday(): Date {
  return new Date()
}

/** YYYY-MM-DD no calendário local do aparelho. */
export function deviceTodayKey(): string {
  const d = deviceToday()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Data de referência para UI, agenda e formulários = hoje do aparelho.
 * (O extrato Nu / openingAsOf do caixa fica só no ledger.)
 */
export function getReferenceDate(_state?: FinanceState): Date {
  return deviceToday()
}

export function getReferenceDayKey(_state?: FinanceState): string {
  return deviceTodayKey()
}
