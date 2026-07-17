import { uid } from './format'
import type { WeddingFlexItem, WeddingState } from '../types/finance'

export const WEDDING_MONTHS = [
  { key: '2026-06', label: 'Junho 2026', short: 'Jun', emoji: '💍' },
  { key: '2026-07', label: 'Julho 2026', short: 'Jul', emoji: '🎊' },
  { key: '2026-08', label: 'Agosto 2026', short: 'Ago', emoji: '🌺' },
  { key: '2026-09', label: 'Setembro 2026', short: 'Set', emoji: '🌙' },
  { key: '2026-10', label: 'Outubro 2026', short: 'Out', emoji: '🍂' },
  { key: '2026-11', label: 'Novembro 2026', short: 'Nov', emoji: '💫' },
  { key: '2026-12', label: 'Dezembro 2026', short: 'Dez', emoji: '💒' },
] as const

export const SALAO_PM = 1557
export const SALAO_LAST = 1558
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
  { id: 'mobilia', name: 'Mobília da Casa', amount: 12000, tag: 'casa' },
]

export function createWeddingState(): WeddingState {
  return {
    dateLabel: '12/12/2026',
    checked: {},
    alreadyPaid: [
      { name: 'Entrada Salão', amount: 2800 },
      { name: 'Obra – banheiro (parcial)', amount: 400 },
      { name: 'Dia da Noiva (junho)', amount: 400 },
      { name: 'Brownies / Lembranças', amount: 550 },
      { name: 'Materiais obra', amount: 2244 },
    ],
    flexItems: DEFAULT_FLEX.map((f) => ({ ...f, id: f.id || uid() })),
    totals: {
      salaRemaining: 10900,
      vestidoTotal: 2000,
      diaNoivaRemaining: 2210,
      fotografo: 3400,
      preWedding: 830,
      obraMaoDeObra: 800,
    },
  }
}

export const TAG_COLORS: Record<string, string> = {
  salão: 'bg-rose-100 text-rose-800',
  noiva: 'bg-pink-100 text-pink-800',
  foto: 'bg-sky-100 text-sky-800',
  casamento: 'bg-fuchsia-100 text-fuchsia-800',
  casa: 'bg-amber-100 text-amber-800',
  luademel: 'bg-cyan-100 text-cyan-800',
  convites: 'bg-emerald-100 text-emerald-800',
  obra: 'bg-orange-100 text-orange-800',
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
 * Monta o cronograma Jun–Dez.
 * `monthlyBudgets` = sobra de cada mês (receitas − vida/cartão).
 * Se um único número for passado, replica nos 7 meses (comportamento original).
 */
export function buildWeddingSchedule(
  monthlyBudgets: number | number[],
  flexItems: WeddingFlexItem[],
): { schedule: MonthSchedule[]; deficit: number; unpaid: { name: string; amount: number; remaining: number; tag: string }[]; totalRemaining: number } {
  const budgets = Array.isArray(monthlyBudgets)
    ? WEDDING_MONTHS.map((_, i) => monthlyBudgets[i] ?? monthlyBudgets[monthlyBudgets.length - 1] ?? 0)
    : WEDDING_MONTHS.map(() => monthlyBudgets)

  const sched: MonthSchedule[] = WEDDING_MONTHS.map((m, i) => {
    const last = i === 6
    const june = i === 0
    const july = i === 1
    const payments: SchedulePayment[] = []
    let rem = budgets[i]
    const add = (name: string, amount: number, tag: string) => {
      payments.push({ name, amount, tag })
      rem -= amount
    }

    add(last ? 'Salão ✓ quitado' : 'Salão de Festas', last ? SALAO_LAST : SALAO_PM, 'salão')
    add(
      last ? 'Vestido ✓ quitado (7/7)' : `Vestido (${i + 1}/7)`,
      last ? VESTIDO_LAST : VESTIDO_PM,
      'noiva',
    )
    if (!june) {
      add(last ? 'Dia da Noiva ✓ quitado' : 'Dia da Noiva', last ? DIA_LAST : DIA_PM, 'noiva')
    }
    if (june) {
      add('Obra banheiro (1ª parcela)', 200, 'obra')
      add('Fotógrafo – 1ª parcela', 1700, 'foto')
      add('Presentes Padrinhos', 440, 'convites')
      add('Presentes Damonsellies', 111, 'convites')
    }
    if (july) {
      add('Obra banheiro ✓ quitado', 600, 'obra')
      add('Fotógrafo ✓ quitado (2ª/2)', 1700, 'foto')
    }
    if (last) {
      add('Pré-Wedding', 830, 'foto')
    }

    return {
      ...m,
      budget: budgets[i],
      payments,
      remainingBudget: Math.max(0, rem),
    }
  })

  const flex = flexItems.map((f) => ({ ...f, paid: 0 }))
  for (let i = 0; i < sched.length; i++) {
    let budget = sched[i].remainingBudget
    for (const item of flex) {
      if (budget <= 0) break
      if (item.paid >= item.amount) continue
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

  const unpaid = flex
    .filter((f) => f.paid < f.amount)
    .map((f) => ({ name: f.name, amount: f.amount, remaining: f.amount - f.paid, tag: f.tag }))
  const deficit = unpaid.reduce((s, f) => s + f.remaining, 0)

  const fixedTotal = sched.reduce(
    (s, m) =>
      s +
      m.payments
        .filter((p) => !flexItems.some((f) => p.name.startsWith(f.name)))
        .reduce((a, p) => a + p.amount, 0),
    0,
  )
  const flexTotal = flexItems.reduce((s, f) => s + f.amount, 0)
  const totalRemaining = fixedTotal + flexTotal

  return { schedule: sched, deficit, unpaid, totalRemaining }
}
