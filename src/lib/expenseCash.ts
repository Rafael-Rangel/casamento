import type { CashBalance, Expense } from '../types/finance'
import {
  expenseInstallmentParts,
  isExpenseOccurrencePaid,
  recurringPayDateInMonth,
} from './expensePayment'

/**
 * Quanto desta despesa de vida já saiu do caixa (ocorrências marcadas como pagas).
 * Recorrentes: só a ocorrência do mês do saldo.
 */
export function lifeExpenseCashDrain(expense: Expense, asOf: string): number {
  if ((expense.purpose || 'life') !== 'life') return 0
  if (!(expense.amount > 0) || !asOf) return 0

  if (expense.kind === 'unique') {
    return expense.paid ? expense.amount : 0
  }

  if (expense.kind === 'installment') {
    return expenseInstallmentParts(expense)
      .filter((p) => isExpenseOccurrencePaid(expense, p.date))
      .reduce((sum, p) => sum + p.amount, 0)
  }

  const payDate = recurringPayDateInMonth(expense, asOf.slice(0, 7))
  if (!payDate) return 0
  return isExpenseOccurrencePaid(expense, payDate) ? expense.amount : 0
}

/** Ajusta o caixa pela diferença de impacto entre despesa anterior e nova. */
export function applyExpenseCashDelta(
  cash: CashBalance | undefined,
  prev: Expense | undefined,
  next: Expense | undefined,
): CashBalance | undefined {
  if (!cash?.asOf) return cash
  const before = prev ? lifeExpenseCashDrain(prev, cash.asOf) : 0
  const after = next ? lifeExpenseCashDrain(next, cash.asOf) : 0
  const delta = after - before
  if (Math.abs(delta) < 0.000_01) return cash
  return {
    ...cash,
    amount: Math.round((cash.amount - delta) * 100) / 100,
  }
}
