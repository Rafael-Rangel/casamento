import type { CashBalance, OtherIncome } from '../types/finance'
import {
  isOtherIncomeOccurrenceReceived,
  otherIncomePayDateInMonth,
} from './incomePayment'

/**
 * Quanto desta receita extra já entrou no caixa (ocorrências marcadas como recebidas).
 * Recorrentes: só a ocorrência do mês do saldo.
 */
export function otherIncomeCashCredit(income: OtherIncome, asOf: string): number {
  if (!(income.amount > 0) || !asOf) return 0

  if (!income.recurring) {
    return income.received ? income.amount : 0
  }

  const payDate = otherIncomePayDateInMonth(income, asOf.slice(0, 7))
  if (!payDate) return 0
  return isOtherIncomeOccurrenceReceived(income, payDate) ? income.amount : 0
}

/** Ajusta o caixa pela diferença de crédito entre receita anterior e nova. */
export function applyOtherIncomeCashDelta(
  cash: CashBalance | undefined,
  prev: OtherIncome | undefined,
  next: OtherIncome | undefined,
): CashBalance | undefined {
  if (!cash?.asOf) return cash
  const before = prev ? otherIncomeCashCredit(prev, cash.asOf) : 0
  const after = next ? otherIncomeCashCredit(next, cash.asOf) : 0
  const delta = after - before
  if (Math.abs(delta) < 0.000_01) return cash
  return {
    ...cash,
    amount: Math.round((cash.amount + delta) * 100) / 100,
  }
}
