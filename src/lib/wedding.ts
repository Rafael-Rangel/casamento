import { uid } from './format'
import type {
  WeddingDemand,
  WeddingFlexItem,
  WeddingState,
} from '../types/finance'

/** Cronograma ativo: Jul–Dez (junho já foi pago e saiu da lista) */
export const WEDDING_MONTHS = [
  { key: '2026-07', label: 'Julho 2026', short: 'Jul', emoji: '🎊' },
  { key: '2026-08', label: 'Agosto 2026', short: 'Ago', emoji: '🌺' },
  { key: '2026-09', label: 'Setembro 2026', short: 'Set', emoji: '🌙' },
  { key: '2026-10', label: 'Outubro 2026', short: 'Out', emoji: '🍂' },
  { key: '2026-11', label: 'Novembro 2026', short: 'Nov', emoji: '💫' },
  { key: '2026-12', label: 'Dezembro 2026', short: 'Dez', emoji: '💒' },
] as const

export const SALAO_TOTAL = 24500
export const SALAO_ALREADY_PAID = 6194
/** Ainda a pagar do salão (Ago–Dez) */
export const SALAO_REMAINING = SALAO_TOTAL - SALAO_ALREADY_PAID
export const SALAO_PM = 3661.2
export const SALAO_LAST = 3661.2
/** Legado — julho já quitado no histórico */
export const SALAO_JUNE_PAID = 500
export const SALAO_JUNE_REST = 1057
export const OPEN_BAR_AMOUNT = 2100
export const VESTIDO_PM = 333.33
export const VESTIDO_LAST = 333.33
export const DIA_NOIVA_TOTAL = 2358
export const DIA_PM = 393
export const DIA_LAST = 393
export const LUA_MEL_TOTAL = 6000
export const LUA_MEL_ID = 'lua'

export const DEFAULT_FLEX: WeddingFlexItem[] = [
  { id: 'obra-mat', name: 'Materiais / Obra banheiro', amount: 6556, tag: 'obra' },
  { id: 'aliancas', name: 'Alianças de Ouro', amount: 2500, tag: 'casamento' },
  { id: 'banda', name: 'Banda', amount: 600, tag: 'casamento' },
  { id: 'love', name: 'Love – Decoração', amount: 150, tag: 'casamento' },
  { id: 'openbar', name: 'Open Bar', amount: OPEN_BAR_AMOUNT, tag: 'casamento' },
  { id: 'terno', name: 'Terno do Noivo', amount: 1000, tag: 'casamento' },
  { id: 'buque', name: 'Buquê da Noiva', amount: 250, tag: 'noiva' },
  { id: LUA_MEL_ID, name: 'Lua de Mel', amount: LUA_MEL_TOTAL, tag: 'luademel' },
]

export const DEFERRED_FLEX: WeddingFlexItem[] = [
  { id: 'mobilia', name: 'Mobília da Casa', amount: 12000, tag: 'casa' },
]

export const DEFERRED_FLEX_IDS = new Set(DEFERRED_FLEX.map((f) => f.id))

/** Divide um total em N parcelas (centavos no último mês). */
export function splitAcrossMonths(total: number, months: number): number[] {
  if (months <= 0) return []
  if (!(total > 0)) return Array.from({ length: months }, () => 0)
  const base = Math.floor((total / months) * 100) / 100
  const parts = Array.from({ length: months }, () => base)
  const sum = Math.round(base * (months - 1) * 100) / 100
  parts[months - 1] = Math.round((total - sum) * 100) / 100
  return parts
}

export function activeFlexItems(flexItems: WeddingFlexItem[]): WeddingFlexItem[] {
  return flexItems.filter((f) => !DEFERRED_FLEX_IDS.has(f.id))
}

export function deferredFlexItems(flexItems: WeddingFlexItem[]): WeddingFlexItem[] {
  const fromState = flexItems.filter((f) => DEFERRED_FLEX_IDS.has(f.id))
  if (fromState.length > 0) return fromState
  return DEFERRED_FLEX.map((f) => ({ ...f }))
}

export const JUNE_PAID_CHECKS: Record<string, boolean> = {
  'Jun::Salão (parcial R$ 500)': true,
  'Jun::Vestido (1/7)': true,
  'Jun::Obra banheiro (1ª parcela)': true,
  'Jun::Presentes Padrinhos': true,
  'Jun::Presentes Damonsellies': true,
}

export const JULY_ALREADY_PAID_CHECKS: Record<string, boolean> = {
  'Jul::Vestido (2/7)': true,
  'Jul::Obra banheiro (restante)': true,
}

/**
 * Julho quase todo quitado — só Dia da Noiva (R$ 393) ficou pendente.
 * Salão de julho já está dentro dos R$ 6.194 pagos (fora do cronograma Ago–Dez).
 */
export const JULY_PAID_EXCEPT_DIA_NOIVA: Record<string, boolean> = {
  ...JULY_ALREADY_PAID_CHECKS,
  'Jul::Fotógrafo – 1ª parcela': true,
}

/** Parseia dateLabel `DD/MM/YYYY` → `YYYY-MM`. */
export function weddingDateToMonthKey(dateLabel: string): string {
  const m = dateLabel.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return WEDDING_MONTHS[WEDDING_MONTHS.length - 1].key
  return `${m[3]}-${m[2].padStart(2, '0')}`
}

function monthKeyToParts(key: string): { y: number; m: number } {
  const [y, m] = key.split('-').map(Number)
  return { y, m }
}

function addMonthKey(key: string, delta: number): string {
  const { y, m } = monthKeyToParts(key)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function compareMonthKey(a: string, b: string): number {
  return a.localeCompare(b)
}

/** Lista de YYYY-MM de start a end (inclusive). */
export function monthKeysInRange(start: string, end: string): string[] {
  if (!start || !end || compareMonthKey(start, end) > 0) return []
  const out: string[] = []
  let cur = start
  for (let i = 0; i < 120; i++) {
    out.push(cur)
    if (cur === end) break
    cur = addMonthKey(cur, 1)
  }
  return out
}

/** Meses do plano (WEDDING_MONTHS) estendidos se a demanda for além. */
export function planMonthKeys(demands: WeddingDemand[], weddingMonth: string): string[] {
  const base = WEDDING_MONTHS.map((m) => m.key as string)
  let min = base[0]
  let max = base[base.length - 1]
  if (weddingMonth && compareMonthKey(weddingMonth, max) > 0) max = weddingMonth
  for (const d of demands) {
    if (!d.active) continue
    if (d.startMonth && compareMonthKey(d.startMonth, min) < 0) min = d.startMonth
    const end =
      d.duration === 'month'
        ? d.startMonth
        : d.duration === 'range'
          ? d.endMonth || d.startMonth
          : d.duration === 'until_wedding'
            ? weddingMonth
            : max
    if (end && compareMonthKey(end, max) > 0) max = end
  }
  return monthKeysInRange(min, max)
}

export function resolveDemandMonths(
  demand: WeddingDemand,
  weddingMonth: string,
  planEnd: string,
): string[] {
  if (!demand.active || !demand.startMonth) return []
  const start = demand.startMonth
  switch (demand.duration) {
    case 'month':
      return [start]
    case 'range': {
      const end = demand.endMonth || start
      return monthKeysInRange(start, end)
    }
    case 'until_wedding':
      return monthKeysInRange(start, weddingMonth || planEnd)
    case 'permanent':
      return monthKeysInRange(start, planEnd)
    default:
      return []
  }
}

export function paymentNameForDemand(
  demand: WeddingDemand,
  index: number,
  count: number,
): string {
  const naming = demand.naming || (count <= 1 ? 'plain' : 'parts')
  if (naming === 'plain' || count <= 1) return demand.name
  if (naming === 'simple_last') {
    return index === count - 1 ? `${demand.name} (última)` : demand.name
  }
  const start = demand.partStart ?? 1
  const total = demand.partTotal ?? count
  const k = start + index
  const last = index === count - 1
  return last ? `${demand.name} (${k}/${total} · última)` : `${demand.name} (${k}/${total})`
}

export function amountsForDemand(demand: WeddingDemand, monthCount: number): number[] {
  if (monthCount <= 0) return []
  if (demand.amountMode === 'per_month') {
    return Array.from({ length: monthCount }, () => demand.amount)
  }
  return splitAcrossMonths(demand.amount, monthCount)
}

/** Preview para a UI de gestão. */
export function previewDemand(
  demand: WeddingDemand,
  dateLabel: string,
): { months: string[]; amounts: number[]; labels: string[]; total: number } {
  const weddingMonth = weddingDateToMonthKey(dateLabel)
  const planEnd =
    WEDDING_MONTHS[WEDDING_MONTHS.length - 1].key > weddingMonth
      ? WEDDING_MONTHS[WEDDING_MONTHS.length - 1].key
      : weddingMonth
  const months = resolveDemandMonths(demand, weddingMonth, planEnd)
  const amounts = amountsForDemand(demand, months.length)
  const labels = months.map((_, i) => paymentNameForDemand(demand, i, months.length))
  const total = Math.round(amounts.reduce((s, a) => s + a, 0) * 100) / 100
  return { months, amounts, labels, total }
}

function shortForMonthKey(key: string): string {
  const known = WEDDING_MONTHS.find((m) => m.key === key)
  if (known) return known.short
  const { m } = monthKeyToParts(key)
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return names[m - 1] || key
}

function labelForMonthKey(key: string): string {
  const known = WEDDING_MONTHS.find((m) => m.key === key)
  if (known) return known.label
  const { y, m } = monthKeyToParts(key)
  const names = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  return `${names[m - 1] || key} ${y}`
}

function emojiForMonthKey(key: string): string {
  return WEDDING_MONTHS.find((m) => m.key === key)?.emoji || '📅'
}

type FlexSpec = { id: string; name: string; amount: number; tag: string }

/**
 * Distribui itens flexíveis nos meses com mais folga, após os custos fixos,
 * para deixar o total mensal o mais igual possível.
 */
export function allocateFlexToLightMonths(
  fixedLoadByMonth: Record<string, number>,
  flexItems: FlexSpec[],
  monthKeys: string[] = WEDDING_MONTHS.map((m) => m.key),
): { id: string; name: string; amount: number; tag: string; month: string }[] {
  const flexTotal = flexItems.reduce((s, f) => s + f.amount, 0)
  const fixedTotal = monthKeys.reduce((s, m) => s + (fixedLoadByMonth[m] || 0), 0)
  const avg = (fixedTotal + flexTotal) / Math.max(monthKeys.length, 1)
  const cap: Record<string, number> = {}
  for (const m of monthKeys) {
    cap[m] = Math.max(0, Math.round((avg - (fixedLoadByMonth[m] || 0)) * 100) / 100)
  }

  const buckets = new Map<string, Map<string, number>>() // itemId -> month -> amount
  const meta = new Map<string, FlexSpec>()

  for (const item of [...flexItems].sort((a, b) => b.amount - a.amount)) {
    meta.set(item.id, item)
    let rem = item.amount
    while (rem > 0.009) {
      const m = monthKeys.reduce((best, x) => ((cap[x] || 0) > (cap[best] || 0) ? x : best))
      const room = cap[m] || 0
      const pay =
        room <= 0.009
          ? Math.round(rem * 100) / 100
          : Math.round(Math.min(room, rem) * 100) / 100
      if (pay <= 0) break
      if (!buckets.has(item.id)) buckets.set(item.id, new Map())
      const byMonth = buckets.get(item.id)!
      byMonth.set(m, Math.round(((byMonth.get(m) || 0) + pay) * 100) / 100)
      cap[m] = Math.round(((cap[m] || 0) - pay) * 100) / 100
      rem = Math.round((rem - pay) * 100) / 100
    }
  }

  const out: { id: string; name: string; amount: number; tag: string; month: string }[] = []
  for (const [itemId, byMonth] of buckets) {
    const item = meta.get(itemId)!
    const months = [...byMonth.keys()].sort()
    months.forEach((month, i) => {
      const amount = byMonth.get(month)!
      const multi = months.length > 1
      out.push({
        id: multi ? `${itemId}__${month}` : itemId,
        name: multi
          ? i === months.length - 1
            ? `${item.name} (${i + 1}/${months.length} · última)`
            : `${item.name} (${i + 1}/${months.length})`
          : item.name,
        amount,
        tag: item.tag,
        month,
      })
    })
  }
  return out
}

function fixedMonthlyLoad(demands: WeddingDemand[], dateLabel: string): Record<string, number> {
  const weddingMonth = weddingDateToMonthKey(dateLabel)
  const planEnd = WEDDING_MONTHS[WEDDING_MONTHS.length - 1].key
  const load: Record<string, number> = {}
  for (const m of WEDDING_MONTHS) load[m.key] = 0
  for (const d of demands) {
    if (!d.active) continue
    const months = resolveDemandMonths(d, weddingMonth, planEnd)
    const amounts = amountsForDemand(d, months.length)
    months.forEach((mk, i) => {
      load[mk] = Math.round(((load[mk] || 0) + (amounts[i] || 0)) * 100) / 100
    })
  }
  return load
}

/**
 * Demandas iniciais = parcelas mensais obrigatórias + flex equilibrado entre meses.
 */
export function createDefaultDemands(): WeddingDemand[] {
  let order = 0
  const next = () => order++
  const jul = '2026-07'
  const ago = '2026-08'
  const dez = '2026-12'
  const dateLabel = '12/12/2026'

  const fixed: WeddingDemand[] = [
    {
      id: 'salao',
      name: 'Salão de Festas',
      amount: SALAO_REMAINING,
      tag: 'salão',
      duration: 'range',
      startMonth: ago,
      endMonth: dez,
      amountMode: 'total_split',
      sortOrder: next(),
      active: true,
      naming: 'parts',
      partStart: 1,
      partTotal: 5,
    },
    {
      id: 'vestido',
      name: 'Vestido',
      amount: VESTIDO_PM,
      tag: 'noiva',
      duration: 'range',
      startMonth: jul,
      endMonth: dez,
      amountMode: 'per_month',
      sortOrder: next(),
      active: true,
      naming: 'parts',
      partStart: 2,
      partTotal: 7,
    },
    {
      id: 'dia-noiva',
      name: 'Dia da Noiva',
      amount: DIA_NOIVA_TOTAL,
      tag: 'noiva',
      duration: 'range',
      startMonth: jul,
      endMonth: dez,
      amountMode: 'total_split',
      sortOrder: next(),
      active: true,
      naming: 'simple_last',
    },
    {
      id: 'obra-restante',
      name: 'Obra banheiro (restante)',
      amount: 600,
      tag: 'obra',
      duration: 'month',
      startMonth: jul,
      amountMode: 'per_month',
      sortOrder: next(),
      active: true,
      naming: 'plain',
    },
    {
      id: 'foto-1',
      name: 'Fotógrafo – 1ª parcela',
      amount: 1700,
      tag: 'foto',
      duration: 'month',
      startMonth: jul,
      amountMode: 'per_month',
      sortOrder: next(),
      active: true,
      naming: 'plain',
    },
    {
      id: 'foto-2',
      name: 'Fotógrafo – 2ª parcela',
      amount: 1700,
      tag: 'foto',
      duration: 'month',
      startMonth: ago,
      amountMode: 'per_month',
      sortOrder: next(),
      active: true,
      naming: 'plain',
    },
    {
      id: 'pre-wedding',
      name: 'Pré-Wedding',
      amount: 830,
      tag: 'foto',
      duration: 'month',
      startMonth: dez,
      amountMode: 'per_month',
      sortOrder: next(),
      active: true,
      naming: 'plain',
    },
    {
      id: LUA_MEL_ID,
      name: 'Lua de Mel',
      amount: LUA_MEL_TOTAL,
      tag: 'luademel',
      duration: 'range',
      startMonth: jul,
      endMonth: dez,
      amountMode: 'total_split',
      sortOrder: next(),
      active: true,
      naming: 'parts',
    },
  ]

  const flexSpecs: FlexSpec[] = [
    { id: 'obra-mat', name: 'Materiais / Obra banheiro', amount: 6556, tag: 'obra' },
    { id: 'aliancas', name: 'Alianças de Ouro', amount: 2500, tag: 'casamento' },
    { id: 'banda', name: 'Banda', amount: 600, tag: 'casamento' },
    { id: 'love', name: 'Love – Decoração', amount: 150, tag: 'casamento' },
    { id: 'openbar', name: 'Open Bar', amount: OPEN_BAR_AMOUNT, tag: 'casamento' },
    { id: 'terno', name: 'Terno do Noivo', amount: 1000, tag: 'casamento' },
    { id: 'buque', name: 'Buquê da Noiva', amount: 250, tag: 'noiva' },
  ]

  const load = fixedMonthlyLoad(fixed, dateLabel)
  const allocated = allocateFlexToLightMonths(load, flexSpecs)

  const flexDemands: WeddingDemand[] = allocated.map((a) => ({
    id: a.id,
    name: a.name,
    amount: a.amount,
    tag: a.tag,
    duration: 'month' as const,
    startMonth: a.month,
    endMonth: null,
    amountMode: 'per_month' as const,
    sortOrder: next(),
    active: true,
    naming: 'plain' as const,
  }))

  const mobilia: WeddingDemand = {
    id: 'mobilia',
    name: 'Mobília da Casa',
    amount: 12000,
    tag: 'casa',
    duration: 'permanent',
    startMonth: jul,
    amountMode: 'per_month',
    sortOrder: next(),
    active: false,
    naming: 'plain',
  }

  return [...fixed, ...flexDemands, mobilia]
}

/** Espelha demands → flexItems (legado / agent). */
export function demandsToFlexItems(demands: WeddingDemand[]): WeddingFlexItem[] {
  return demands.map((d) => ({
    id: d.id,
    name: d.name,
    amount: d.amount,
    tag: d.tag,
  }))
}

export function createWeddingState(): WeddingState {
  const demands = createDefaultDemands()
  return {
    dateLabel: '12/12/2026',
    checked: {
      ...JUNE_PAID_CHECKS,
      ...JULY_PAID_EXCEPT_DIA_NOIVA,
    },
    alreadyPaid: [
      { name: 'Entrada / parcial Salão (já pago)', amount: SALAO_ALREADY_PAID },
      { name: 'Obra – banheiro (parcial)', amount: 400 },
      { name: 'Dia da Noiva (junho)', amount: 400 },
      { name: 'Brownies / Lembranças', amount: 550 },
      { name: 'Materiais obra', amount: 2244 },
      { name: 'Vestido (1/7) · Tavares Noiva', amount: VESTIDO_PM },
      { name: 'Obra banheiro (1ª parcela)', amount: 200 },
      { name: 'Presentes Padrinhos', amount: 440 },
      { name: 'Presentes Damonsellies', amount: 111 },
      { name: 'Vestido (2/7 · julho) · Tavares Noiva', amount: VESTIDO_PM },
      { name: 'Obra banheiro (restante · julho)', amount: 600 },
      { name: 'Fotógrafo – 1ª parcela (julho)', amount: 1700 },
    ],
    flexItems: demandsToFlexItems(demands.filter((d) => d.active || DEFERRED_FLEX_IDS.has(d.id))),
    demands,
    totals: {
      salaRemaining: SALAO_REMAINING,
      vestidoTotal: Math.round(VESTIDO_PM * 5 * 100) / 100,
      diaNoivaRemaining: DIA_NOIVA_TOTAL,
      fotografo: 1700,
      preWedding: 830,
      obraMaoDeObra: 0,
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
  demandId?: string
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
 * Monta o cronograma a partir de `demands` (fonte de verdade).
 * Aceita WeddingState ou só demands + dateLabel para compat.
 */
export function buildWeddingSchedule(
  monthlyBudgets: number | number[],
  weddingOrFlex: WeddingState | WeddingFlexItem[],
  dateLabelFallback = '12/12/2026',
): {
  schedule: MonthSchedule[]
  deficit: number
  unpaid: { name: string; amount: number; remaining: number; tag: string }[]
  totalRemaining: number
  deferred: WeddingFlexItem[]
} {
  const isState =
    !Array.isArray(weddingOrFlex) &&
    weddingOrFlex != null &&
    typeof weddingOrFlex === 'object' &&
    'dateLabel' in weddingOrFlex
  const wedding = isState
    ? (weddingOrFlex as WeddingState)
    : ({
        dateLabel: dateLabelFallback,
        demands: [] as WeddingDemand[],
        flexItems: weddingOrFlex as WeddingFlexItem[],
        checked: {},
        alreadyPaid: [],
        totals: {
          salaRemaining: 0,
          vestidoTotal: 0,
          diaNoivaRemaining: 0,
          fotografo: 0,
          preWedding: 0,
          obraMaoDeObra: 0,
        },
      } satisfies WeddingState)

  const demands =
    wedding.demands?.length > 0
      ? wedding.demands
      : createDefaultDemands()

  const weddingMonth = weddingDateToMonthKey(wedding.dateLabel || dateLabelFallback)
  const planKeys = planMonthKeys(demands, weddingMonth)
  const planEnd = planKeys[planKeys.length - 1] || WEDDING_MONTHS[WEDDING_MONTHS.length - 1].key

  const budgets = Array.isArray(monthlyBudgets)
    ? planKeys.map((_, i) => monthlyBudgets[i] ?? monthlyBudgets[monthlyBudgets.length - 1] ?? 0)
    : planKeys.map(() => monthlyBudgets)

  type Slot = SchedulePayment & { sortOrder: number }
  const byMonth = new Map<string, Slot[]>()
  for (const key of planKeys) byMonth.set(key, [])

  for (const demand of demands) {
    if (!demand.active) continue
    const months = resolveDemandMonths(demand, weddingMonth, planEnd)
    if (!months.length) continue
    const amounts = amountsForDemand(demand, months.length)
    months.forEach((mk, i) => {
      const list = byMonth.get(mk)
      if (!list) return
      list.push({
        name: paymentNameForDemand(demand, i, months.length),
        amount: amounts[i] ?? 0,
        tag: demand.tag,
        demandId: demand.id,
        sortOrder: demand.sortOrder,
      })
    })
  }

  const sched: MonthSchedule[] = planKeys.map((key, i) => {
    const slots = (byMonth.get(key) || []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR'),
    )
    const payments: SchedulePayment[] = slots.map(({ sortOrder: _s, ...p }) => p)
    const spent = payments.reduce((s, p) => s + p.amount, 0)
    const budget = budgets[i] ?? 0
    return {
      key,
      label: labelForMonthKey(key),
      short: shortForMonthKey(key),
      emoji: emojiForMonthKey(key),
      budget,
      payments,
      remainingBudget: budget - spent,
    }
  })

  const deferred = demands
    .filter((d) => !d.active)
    .map((d) => ({ id: d.id, name: d.name, amount: d.amount, tag: d.tag }))

  const unpaid: { name: string; amount: number; remaining: number; tag: string }[] = []
  const deficit = sched.reduce((s, m) => s + Math.max(0, -m.remainingBudget), 0)
  const totalRemaining = sched.reduce(
    (s, m) => s + m.payments.reduce((a, p) => a + p.amount, 0),
    0,
  )

  return { schedule: sched, deficit, unpaid, totalRemaining, deferred }
}

export function isPaymentChecked(
  checked: Record<string, boolean>,
  monthShort: string,
  paymentName: string,
): boolean {
  return !!checked[`${monthShort}::${paymentName}`]
}

export function schedulePendingByItem(
  schedule: MonthSchedule[],
  checked: Record<string, boolean>,
): { name: string; amount: number; tag: string }[] {
  const map = new Map<string, { amount: number; tag: string }>()
  for (const month of schedule) {
    for (const p of month.payments) {
      if (isPaymentChecked(checked, month.short, p.name)) continue
      const prev = map.get(p.name)
      if (prev) prev.amount += p.amount
      else map.set(p.name, { amount: p.amount, tag: p.tag })
    }
  }
  return [...map.entries()].map(([name, v]) => ({ name, ...v }))
}

export function scheduleTotals(
  schedule: MonthSchedule[],
  checked: Record<string, boolean>,
) {
  let total = 0
  let pending = 0
  let paid = 0
  for (const month of schedule) {
    for (const p of month.payments) {
      total += p.amount
      if (isPaymentChecked(checked, month.short, p.name)) paid += p.amount
      else pending += p.amount
    }
  }
  return { total, pending, paid }
}

/** Blank demand for UI forms. */
export function blankDemand(startMonth = WEDDING_MONTHS[0].key): WeddingDemand {
  return {
    id: uid(),
    name: '',
    amount: 0,
    tag: 'casamento',
    duration: 'month',
    startMonth,
    endMonth: null,
    amountMode: 'per_month',
    sortOrder: 999,
    active: true,
    naming: 'plain',
  }
}
