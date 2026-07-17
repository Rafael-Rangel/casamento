import { uid } from './format'
import type { WeddingFlexItem, WeddingState } from '../types/finance'

/** Cronograma ativo: Jul–Dez (junho já foi pago e saiu da lista) */
export const WEDDING_MONTHS = [
  { key: '2026-07', label: 'Julho 2026', short: 'Jul', emoji: '🎊' },
  { key: '2026-08', label: 'Agosto 2026', short: 'Ago', emoji: '🌺' },
  { key: '2026-09', label: 'Setembro 2026', short: 'Set', emoji: '🌙' },
  { key: '2026-10', label: 'Outubro 2026', short: 'Out', emoji: '🍂' },
  { key: '2026-11', label: 'Novembro 2026', short: 'Nov', emoji: '💫' },
  { key: '2026-12', label: 'Dezembro 2026', short: 'Dez', emoji: '💒' },
] as const

export const SALAO_PM = 1557
export const SALAO_LAST = 1558
/** Em junho pagaram só R$ 500 dos R$ 1.557 do salão */
export const SALAO_JUNE_PAID = 500
export const SALAO_JUNE_REST = SALAO_PM - SALAO_JUNE_PAID
export const VESTIDO_PM = 300
export const VESTIDO_LAST = 200
export const DIA_PM = 368
export const DIA_LAST = 370

export const DEFAULT_FLEX: WeddingFlexItem[] = [
  { id: 'obra-mat', name: 'Materiais / Obra banheiro', amount: 6556, tag: 'obra' },
  { id: 'aliancas', name: 'Alianças de Ouro', amount: 2500, tag: 'casamento' },
  { id: 'banda', name: 'Banda', amount: 600, tag: 'casamento' },
  { id: 'love', name: 'Love – Decoração', amount: 150, tag: 'casamento' },
  { id: 'openbar', name: 'Open Bar', amount: 1200, tag: 'casamento' },
  { id: 'terno', name: 'Terno do Noivo', amount: 1000, tag: 'casamento' },
  { id: 'buque', name: 'Buquê da Noiva', amount: 250, tag: 'noiva' },
  { id: 'lua', name: 'Lua de Mel', amount: 6000, tag: 'luademel' },
]

/** Fora do cronograma Jul–Dez (planejar depois do casamento) */
export const DEFERRED_FLEX: WeddingFlexItem[] = [
  { id: 'mobilia', name: 'Mobília da Casa', amount: 12000, tag: 'casa' },
]

export const DEFERRED_FLEX_IDS = new Set(DEFERRED_FLEX.map((f) => f.id))

export function activeFlexItems(flexItems: WeddingFlexItem[]): WeddingFlexItem[] {
  return flexItems.filter((f) => !DEFERRED_FLEX_IDS.has(f.id))
}

export function deferredFlexItems(flexItems: WeddingFlexItem[]): WeddingFlexItem[] {
  const fromState = flexItems.filter((f) => DEFERRED_FLEX_IDS.has(f.id))
  if (fromState.length > 0) return fromState
  return DEFERRED_FLEX.map((f) => ({ ...f }))
}

/**
 * Pagamentos de junho já liquidados (histórico).
 * Fotógrafo 1ª parcela NÃO está aqui — foi remanejado para julho.
 */
export const JUNE_PAID_CHECKS: Record<string, boolean> = {
  'Jun::Salão (parcial R$ 500)': true,
  'Jun::Vestido (1/7)': true,
  'Jun::Obra banheiro (1ª parcela)': true,
  'Jun::Presentes Padrinhos': true,
  'Jun::Presentes Damonsellies': true,
}

export function createWeddingState(): WeddingState {
  return {
    dateLabel: '12/12/2026',
    checked: { ...JUNE_PAID_CHECKS },
    alreadyPaid: [
      { name: 'Entrada Salão', amount: 2800 },
      { name: 'Obra – banheiro (parcial)', amount: 400 },
      { name: 'Dia da Noiva (junho)', amount: 400 },
      { name: 'Brownies / Lembranças', amount: 550 },
      { name: 'Materiais obra', amount: 2244 },
      { name: 'Salão junho (parcial)', amount: SALAO_JUNE_PAID },
      { name: 'Vestido (1/7)', amount: VESTIDO_PM },
      { name: 'Obra banheiro (1ª parcela)', amount: 200 },
      { name: 'Presentes Padrinhos', amount: 440 },
      { name: 'Presentes Damonsellies', amount: 111 },
    ],
    flexItems: DEFAULT_FLEX.map((f) => ({ ...f, id: f.id || uid() })),
    totals: {
      /** 10.900 − 500 pago em junho = 10.400 ainda do salão */
      salaRemaining: 10400,
      vestidoTotal: 1700, // 2000 − 300 já pago
      diaNoivaRemaining: 2210,
      fotografo: 3400,
      preWedding: 830,
      obraMaoDeObra: 600, // 800 − 200 da 1ª parcela
    },
  }
}

export const TAG_COLORS: Record<string, string> = {
  salão: 'bg-rose-500/15 text-rose-300',
  noiva: 'bg-pink-500/15 text-pink-300',
  foto: 'bg-sky-500/15 text-sky-300',
  casamento: 'bg-fuchsia-500/15 text-fuchsia-300',
  casa: 'bg-amber-500/15 text-amber-300',
  luademel: 'bg-cyan-500/15 text-cyan-300',
  convites: 'bg-emerald-500/15 text-emerald-300',
  obra: 'bg-orange-500/15 text-orange-300',
}

export const TAG_LABEL: Record<string, string> = {
  salão: 'Salão',
  noiva: 'Noiva',
  foto: 'Foto',
  obra: 'Obra',
  casamento: 'Festa',
  casa: 'Casa',
  luademel: 'Lua de Mel',
  convites: 'Convites',
}

export interface SchedulePayment {
  name: string
  amount: number
  tag: string
}

export interface MonthSchedule {
  key: string
  label: string
  short: string
  emoji: string
  budget: number
  payments: SchedulePayment[]
  remainingBudget: number
}

/**
 * Monta o cronograma Jul–Dez.
 * `monthlyBudgets` = sobra de cada mês (receitas − vida/cartão).
 * Se um único número for passado, replica nos 6 meses.
 */
export function buildWeddingSchedule(
  monthlyBudgets: number | number[],
  flexItems: WeddingFlexItem[],
): {
  schedule: MonthSchedule[]
  /** Quanto falta ganhar a mais no total (meses negativos) */
  deficit: number
  unpaid: { name: string; amount: number; remaining: number; tag: string }[]
  totalRemaining: number
  deferred: WeddingFlexItem[]
} {
  const budgets = Array.isArray(monthlyBudgets)
    ? WEDDING_MONTHS.map(
        (_, i) => monthlyBudgets[i] ?? monthlyBudgets[monthlyBudgets.length - 1] ?? 0,
      )
    : WEDDING_MONTHS.map(() => monthlyBudgets)

  const lastIdx = WEDDING_MONTHS.length - 1
  const activeFlex = activeFlexItems(flexItems)
  const deferred = deferredFlexItems(flexItems)

  const sched: MonthSchedule[] = WEDDING_MONTHS.map((m, i) => {
    const last = i === lastIdx
    const july = i === 0
    const august = i === 1
    const payments: SchedulePayment[] = []
    let rem = budgets[i]
    const add = (name: string, amount: number, tag: string) => {
      payments.push({ name, amount, tag })
      rem -= amount
    }

    add(last ? 'Salão (última parcela)' : 'Salão de Festas', last ? SALAO_LAST : SALAO_PM, 'salão')
    if (july) {
      add('Salão (complemento)', SALAO_JUNE_REST, 'salão')
    }

    const vestidoN = i + 2
    add(
      last ? 'Vestido (7/7 · última)' : `Vestido (${vestidoN}/7)`,
      last ? VESTIDO_LAST : VESTIDO_PM,
      'noiva',
    )

    add(last ? 'Dia da Noiva (última)' : 'Dia da Noiva', last ? DIA_LAST : DIA_PM, 'noiva')

    if (july) {
      add('Obra banheiro (restante)', 600, 'obra')
      add('Fotógrafo – 1ª parcela', 1700, 'foto')
    }
    if (august) {
      add('Fotógrafo – 2ª parcela', 1700, 'foto')
    }

    if (last) {
      add('Pré-Wedding', 830, 'foto')
    }

    return {
      ...m,
      budget: budgets[i],
      payments,
      remainingBudget: rem,
    }
  })

  const flex = activeFlex.map((f) => ({ ...f, paid: 0 }))

  // 1ª passada: encaixa o que couber no orçamento de cada mês
  for (let i = 0; i < sched.length; i++) {
    let budget = sched[i].remainingBudget
    for (const item of flex) {
      if (item.paid >= item.amount) continue
      if (budget <= 0) continue
      const needed = item.amount - item.paid
      const pay = Math.min(budget, needed)
      const done = pay >= needed
      const hasPartial = item.paid > 0
      sched[i].payments.push({
        name: done
          ? hasPartial
            ? `${item.name} ✓ quitado`
            : item.name
          : `${item.name} (parcial)`,
        amount: pay,
        tag: item.tag,
      })
      item.paid += pay
      budget -= pay
    }
    sched[i].remainingBudget = budget
  }

  // 2ª passada: agenda o resto nos meses mesmo sem orçamento (fica negativo)
  let forceMonth = 0
  for (const item of flex) {
    if (item.paid >= item.amount) continue
    const needed = item.amount - item.paid
    const mi = forceMonth % sched.length
    forceMonth++
    const hasPartial = item.paid > 0
    sched[mi].payments.push({
      name: hasPartial ? `${item.name} (planejado)` : item.name,
      amount: needed,
      tag: item.tag,
    })
    sched[mi].remainingBudget -= needed
    item.paid = item.amount
  }

  const unpaid = flex
    .filter((f) => f.paid < f.amount)
    .map((f) => ({
      name: f.name,
      amount: f.amount,
      remaining: f.amount - f.paid,
      tag: f.tag,
    }))

  const deficit = sched.reduce((s, m) => s + Math.max(0, -m.remainingBudget), 0)

  const fixedTotal = sched.reduce(
    (s, m) =>
      s +
      m.payments
        .filter((p) => !activeFlex.some((f) => p.name.startsWith(f.name)))
        .reduce((a, p) => a + p.amount, 0),
    0,
  )
  const flexTotal = activeFlex.reduce((s, f) => s + f.amount, 0)
  const totalRemaining = fixedTotal + flexTotal

  return { schedule: sched, deficit, unpaid, totalRemaining, deferred }
}
