import type { CashBalance, Expense } from '../types/finance'
import {
  expenseInstallmentParts,
  isExpenseOccurrencePaid,
  recurringPayDateInMonth,
} from './expensePayment'

/**
 * Quanto desta despesa de vida já saiu do caixa (ocorrências marcadas como pagas).
 * Recorrentes: só a ocorrência do mês do saldo.
 *
 * Únicas com date <= asOf: 0 no cálculo “absoluto” — já estão no saldo do extrato.
 * Toggle de paga no mesmo dia é tratado no FinanceContext.
 */
export function lifeExpenseCashDrain(expense: Expense, asOf: string): number {
  if ((expense.purpose || 'life') !== 'life') return 0
  if (!(expense.amount > 0) || !asOf) return 0

  if (expense.kind === 'unique') {
    if (expense.date <= asOf) return 0
    return expense.paid ? expense.amount : 0
  }

  if (expense.kind === 'installment') {
    return expenseInstallmentParts(expense)
      .filter((p) => p.date > asOf && isExpenseOccurrencePaid(expense, p.date))
      .reduce((sum, p) => sum + p.amount, 0)
  }

  const payDate = recurringPayDateInMonth(expense, asOf.slice(0, 7))
  if (!payDate || payDate <= asOf) return 0
  return isExpenseOccurrencePaid(expense, payDate) ? expense.amount : 0
}

/** Ajusta o caixa pela diferença de impacto entre despesa anterior e nova. */
export function applyExpenseCashDelta(
  cash: CashBalance | undefined,
  prev: Expense | undefined,
  next: Expense | undefined,
): CashBalance | undefined {
  if (!cash?.asOf) return cash

  const asOf = cash.asOf
  const life = (e: Expense | undefined) => e && (e.purpose || 'life') === 'life'

  // Única no dia do saldo (ou antes): só reage a mudar o flag paga / valor
  const focus = next || prev
  if (focus && life(focus) && focus.kind === 'unique' && focus.date <= asOf) {
    if (!prev && next) {
      // Nova despesa já paga → baixa agora (lançamento do dia)
      if (!next.paid) return cash
      return {
        ...cash,
        amount: Math.round((cash.amount - next.amount) * 100) / 100,
      }
    }
    if (prev && !next) {
      // Removeu despesa que estava paga → devolve
      if (!prev.paid) return cash
      return {
        ...cash,
        amount: Math.round((cash.amount + prev.amount) * 100) / 100,
      }
    }
    if (prev && next) {
      const before = prev.paid ? prev.amount : 0
      const after = next.paid ? next.amount : 0
      const delta = after - before
      if (Math.abs(delta) < 0.000_01) return cash
      return {
        ...cash,
        amount: Math.round((cash.amount - delta) * 100) / 100,
      }
    }
    return cash
  }

  const before = prev ? lifeExpenseCashDrain(prev, asOf) : 0
  const after = next ? lifeExpenseCashDrain(next, asOf) : 0
  const delta = after - before
  if (Math.abs(delta) < 0.000_01) return cash
  return {
    ...cash,
    amount: Math.round((cash.amount - delta) * 100) / 100,
  }
}
