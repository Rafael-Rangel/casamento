import type { CashBalance, Expense, OtherIncome } from '../types/finance'
import {
  CASH_OPENING_FRESH,
  CASH_OPENING_FRESH_AS_OF,
  VESTIDO_PAID_2026_07_21,
} from './defaults'
import { lifeExpenseCashDrain } from './expenseCash'
import {
  isOtherIncomeOccurrenceReceived,
  otherIncomePayDateInMonth,
} from './incomePayment'
import { deviceTodayKey } from './referenceDate'

/** Abertura padrão do novo controle (12/08/2026). */
export const CASH_OPENING_AS_OF = CASH_OPENING_FRESH_AS_OF
export const CASH_OPENING_DEFAULT = CASH_OPENING_FRESH

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function latestDate(...dates: (string | undefined | null)[]) {
  return dates.filter(Boolean).sort().at(-1) || CASH_OPENING_AS_OF
}

/** Crédito de receita extra com data efetiva > opening. */
export function otherIncomeLedgerCreditAll(
  income: OtherIncome,
  openingAsOf: string,
  throughDate: string,
): number {
  if (!(income.amount > 0)) return 0

  if (!income.recurring) {
    if (!income.received) return 0
    if (income.date <= openingAsOf) return 0
    if (income.date > throughDate) return 0
    return income.amount
  }

  let sum = 0
  let [y, m] = openingAsOf.split('-').map(Number)
  const end = throughDate.slice(0, 7)
  for (let i = 0; i < 24; i++) {
    const monthKey = `${y}-${String(m).padStart(2, '0')}`
    if (monthKey > end) break
    const payDate = otherIncomePayDateInMonth(income, monthKey)
    if (
      payDate &&
      payDate > openingAsOf &&
      payDate <= throughDate &&
      isOtherIncomeOccurrenceReceived(income, payDate)
    ) {
      sum += income.amount
    }
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return sum
}

/**
 * Caixa = extrato Nu (opening) − vestido (só se opening < 21/07) − vida paga depois do extrato
 * + receitas extras depois do extrato.
 *
 * Salários e projetos NÃO entram: o extrato Nu já os contém até openingAsOf.
 * Com opening 21/07 = 6.369,01, vestido e vida do dia 21 já estão no PDF.
 */
export function recomputeCashBalance(input: {
  expenses: Expense[]
  otherIncomes: OtherIncome[]
  cash?: CashBalance | null
  throughDate?: string
  vestidoPaidFromBank?: boolean
}): CashBalance {
  const openingAsOf = input.cash?.openingAsOf || CASH_OPENING_AS_OF
  const openingAmount =
    typeof input.cash?.openingAmount === 'number' && Number.isFinite(input.cash.openingAmount)
      ? input.cash.openingAmount
      : CASH_OPENING_DEFAULT

  const through =
    input.throughDate ||
    input.cash?.asOf ||
    deviceTodayKey()

  let lifeOut = 0
  for (const e of input.expenses) {
    if ((e.purpose || 'life') !== 'life') continue
    if (/vestido/i.test(e.name)) continue
    lifeOut += lifeExpenseCashDrain(e, openingAsOf)
  }

  let extrasIn = 0
  for (const o of input.otherIncomes || []) {
    extrasIn += otherIncomeLedgerCreditAll(o, openingAsOf, through)
  }

  // Vestido já está no saldo se o extrato inclui 21/07
  const vestidoOut =
    input.vestidoPaidFromBank === false || openingAsOf >= '2026-07-21'
      ? 0
      : VESTIDO_PAID_2026_07_21

  const amount = round2(openingAmount - vestidoOut - lifeOut + extrasIn)

  const asOf = latestDate(
    openingAsOf,
    through,
    ...input.expenses
      .filter((e) => e.paid && (e.purpose || 'life') === 'life')
      .map((e) => e.date),
  )

  return {
    openingAmount,
    openingAsOf,
    amount,
    asOf,
    notes: `Calculado: extrato ${openingAsOf} ${openingAmount.toFixed(2)} − vestido ${vestidoOut.toFixed(2)} − vida ${lifeOut.toFixed(2)} + extras ${extrasIn.toFixed(2)}`,
  }
}
