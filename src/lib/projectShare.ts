/**
 * Regras KoruVision:
 * - Implementação / parcelas do projeto → 100% seu
 * - Mensalidade → dividida em 3; você + esposa ficam com 2/3
 */
export const MONTHLY_PARTNERS = 3
export const MONTHLY_YOUR_PARTS = 2

/** Valor de implementação / parcela (100%) */
export function implementationIncome(gross: number) {
  return roundMoney(gross)
}

/** Sua parte da mensalidade (2/3 do valor cobrado do cliente) */
export function monthlyYourShare(grossMonthly: number) {
  return roundMoney((grossMonthly * MONTHLY_YOUR_PARTS) / MONTHLY_PARTNERS)
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}
