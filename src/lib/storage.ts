import {
  CASH_AND_JULY_PAID_SEED_VERSION,
  createInitialState,
  JULY21_SPEND_AND_VESTIDO_VERSION,
  NOIVA_PARCELAS_VERSION,
  PROJECT_SEED_VERSION,
  REMOVE_POWER_VOLTS_VERSION,
  POWER_VOLTS_PROJECT_ID,
  CASH_LEDGER_VERSION,
  NU_EXTRATO_21JUL_VERSION,
  NU_BALANCE_2026_07_21,
  JULY22_FOOD_SPEND_VERSION,
  DANIELE_EXTRA_AND_SALARY_NOTE_VERSION,
  FRESH_START_AUG12_VERSION,
  SALAO_OPENBAR_FORCE_VERSION,
  SALARY_SEED_VERSION,
  seedCashBalance,
  seedJuly20MonicaNoivas,
  seedJuly21LifeExpenses,
  seedJuly22LifeExpenses,
  seedOtherIncomes,
  seedProjects,
  seedSalaries,
  SEED_VERSION,
  STORAGE_KEY,
  WEDDING_BALANCE_VERSION,
  WEDDING_FOTO2_AUG_SEED_VERSION,
  WEDDING_FULL_SCHEDULE_SEED_VERSION,
} from './defaults'
import { recomputeCashBalance } from './cashLedger'
import { migrateExpensePaymentStatus } from './expensePayment'
import { migrateOtherIncomeReceivedStatus } from './incomePayment'
import { deviceTodayKey } from './referenceDate'
import {
  buildWeddingSchedule,
  createDefaultDemands,
  createWeddingState,
  DEFERRED_FLEX_IDS,
  demandsToFlexItems,
  DIA_NOIVA_TOTAL,
  JUNE_PAID_CHECKS,
  JULY_ALREADY_PAID_CHECKS,
  JULY_PAID_EXCEPT_DIA_NOIVA,
  OPEN_BAR_AMOUNT,
  SALAO_ALREADY_PAID,
  SALAO_REMAINING,
  VESTIDO_PM,
} from './wedding'
import type {
  CashBalance,
  Expense,
  FinanceState,
  OtherIncome,
  Project,
  SalarySource,
  WeddingState,
} from '../types/finance'

/** Injeta / atualiza projetos-semente */
function applyProjectSeed(projects: Project[], seedVersion: number | undefined): Project[] {
  if (seedVersion === undefined || seedVersion < FRESH_START_AUG12_VERSION) {
    return seedProjects()
  }

  let next = projects
  if (seedVersion < REMOVE_POWER_VOLTS_VERSION) {
    next = next.filter(
      (p) =>
        p.id !== POWER_VOLTS_PROJECT_ID &&
        !/power\s*volts/i.test(p.client || '') &&
        !(p.name === 'Website' && /power/i.test(p.client || '')),
    )
  }
  if (seedVersion >= PROJECT_SEED_VERSION) return next
  const existingIds = new Set(next.map((p) => p.id))
  const missing = seedProjects().filter((p) => !existingIds.has(p.id))
  return [...next, ...missing]
}

function applySalarySeed(
  salaries: SalarySource[],
  seedVersion: number | undefined,
): SalarySource[] {
  if (seedVersion !== undefined && seedVersion >= SALARY_SEED_VERSION) return salaries

  const seeds = seedSalaries()
  const byName = new Map(seeds.map((salary) => [salary.name.toLocaleLowerCase('pt-BR'), salary]))
  const found = new Set<string>()

  const migrated = salaries.map((salary) => {
    const key = salary.name.trim().toLocaleLowerCase('pt-BR')
    const seed = byName.get(key)
    if (!seed) return salary
    found.add(key)
    return { ...salary, ...seed, id: salary.id }
  })

  return [
    ...migrated,
    ...seeds.filter((salary) => !found.has(salary.name.toLocaleLowerCase('pt-BR'))),
  ]
}

/** Garante extras pontuais (ex.: Daniele 1.100) sem duplicar. */
function applyOtherIncomeSeed(
  incomes: OtherIncome[],
  seedVersion: number | undefined,
): OtherIncome[] {
  const seeds = seedOtherIncomes()
  const ids = new Set(incomes.map((o) => o.id))
  const soft = new Set(
    incomes.map((o) => {
      const n = o.name.toLocaleLowerCase('pt-BR')
      if (/daniele/i.test(n)) return `daniele|${o.amount}`
      return `${o.date}|${n}|${o.amount}`
    }),
  )
  const missing = seeds.filter((s) => {
    if (ids.has(s.id)) return false
    const n = s.name.toLocaleLowerCase('pt-BR')
    const key = /daniele/i.test(n) ? `daniele|${s.amount}` : `${s.date}|${n}|${s.amount}`
    return !soft.has(key)
  })
  if (
    seedVersion !== undefined &&
    seedVersion >= DANIELE_EXTRA_AND_SALARY_NOTE_VERSION &&
    missing.length === 0
  ) {
    return incomes
  }
  return [...incomes, ...missing]
}

function applyCashSeed(
  cash: CashBalance | undefined,
  expenses: Expense[],
  otherIncomes: OtherIncome[],
  seedVersion: number | undefined,
): CashBalance {
  if (seedVersion === undefined || seedVersion < FRESH_START_AUG12_VERSION) {
    return recomputeCashBalance({
      expenses,
      otherIncomes,
      cash: seedCashBalance(),
      throughDate: deviceTodayKey(),
    })
  }

  const needsNu21 =
    seedVersion === undefined || seedVersion < NU_EXTRATO_21JUL_VERSION
  const base = needsNu21
    ? {
        ...(cash || seedCashBalance()),
        openingAmount: NU_BALANCE_2026_07_21,
        openingAsOf: '2026-07-21',
        notes: seedCashBalance().notes,
      }
    : cash && seedVersion !== undefined && seedVersion >= CASH_LEDGER_VERSION
      ? cash
      : {
          ...(cash || seedCashBalance()),
          openingAmount: cash?.openingAmount ?? NU_BALANCE_2026_07_21,
          openingAsOf: cash?.openingAsOf ?? '2026-07-21',
        }
  return recomputeCashBalance({
    expenses,
    otherIncomes,
    cash: base,
    throughDate: deviceTodayKey(),
  })
}

/** Zera histórico de despesas únicas; mantém só recorrentes de vida. */
function applyFreshExpenseReset(
  expenses: Expense[],
  seedVersion: number | undefined,
): Expense[] {
  if (seedVersion !== undefined && seedVersion >= FRESH_START_AUG12_VERSION) {
    return expenses
  }
  const recurring = expenses.filter(
    (e) => (e.purpose || 'life') === 'life' && e.kind === 'recurring',
  )
  if (recurring.length) return recurring
  return createInitialState().expenses
}

/** Marca julho quitado, exceto Dia da Noiva. */
function applyJulyPaidExceptDiaNoiva(
  wedding: WeddingState,
  seedVersion: number | undefined,
): WeddingState {
  if (seedVersion !== undefined && seedVersion >= FRESH_START_AUG12_VERSION) {
    return wedding
  }

  const base = createWeddingState()
  const demands =
    wedding.demands?.length ? wedding.demands : base.demands?.length ? base.demands : createDefaultDemands()
  const withDemands: WeddingState = {
    ...base,
    ...wedding,
    demands,
    flexItems: demandsToFlexItems(demands),
  }
  const { schedule } = buildWeddingSchedule(WEDDING_MONTHS_BUDGET_PLACEHOLDER, withDemands)
  const july = schedule.find((m) => m.key === '2026-07')
  const checked: Record<string, boolean> = {
    ...JUNE_PAID_CHECKS,
    ...JULY_PAID_EXCEPT_DIA_NOIVA,
    ...(wedding.checked || {}),
  }

  if (july) {
    for (const p of july.payments) {
      const key = `${july.short}::${p.name}`
      if (/dia da noiva/i.test(p.name)) {
        delete checked[key]
        continue
      }
      // Salão de julho não entra mais no cronograma (já nos R$ 6.194)
      if (/sal[aã]o/i.test(p.name)) {
        delete checked[key]
        continue
      }
      checked[key] = true
    }
  }

  const nextDemands = demands.map((d) =>
    d.id === 'dia-noiva' ? { ...d, amount: DIA_NOIVA_TOTAL } : d,
  )

  return {
    ...withDemands,
    checked,
    demands: nextDemands,
    flexItems: demandsToFlexItems(nextDemands),
    alreadyPaid: base.alreadyPaid,
    totals: {
      ...withDemands.totals,
      ...base.totals,
    },
  }
}

const OLD_SALAO_IDS = new Set([
  'salao-mensal',
  'salao-ultima',
  'salao-complemento',
])

/** True se o salão/open bar ainda está no formato/valor antigo. */
function weddingHasStaleSalaoOpenbar(wedding: WeddingState): boolean {
  const demands = wedding.demands || []
  if (demands.some((d) => OLD_SALAO_IDS.has(d.id))) return true

  const salao = demands.find((d) => d.id === 'salao')
  if (
    !salao ||
    Math.abs(salao.amount - SALAO_REMAINING) > 0.01 ||
    salao.startMonth !== '2026-08' ||
    salao.endMonth !== '2026-12' ||
    salao.amountMode !== 'total_split'
  ) {
    return true
  }

  const openbarTotal = demands
    .filter((d) => d.id === 'openbar' || d.id.startsWith('openbar__'))
    .reduce((s, d) => s + (d.amount || 0), 0)
  if (Math.abs(openbarTotal - OPEN_BAR_AMOUNT) > 0.01) return true

  const paidSalao = (wedding.alreadyPaid || [])
    .filter((i) => /sal[aã]o/i.test(i.name))
    .reduce((s, i) => s + (i.amount || 0), 0)
  if (Math.abs(paidSalao - SALAO_ALREADY_PAID) > 0.01) return true

  if (Math.abs((wedding.totals?.salaRemaining ?? 0) - SALAO_REMAINING) > 0.01) {
    return true
  }

  return false
}

/** Recalcula Salão (24.500 − 6.194) e Open Bar (2.100). */
function applySalaoOpenbarRecalc(
  wedding: WeddingState,
  seedVersion: number | undefined,
): WeddingState {
  const seedOk =
    seedVersion !== undefined && seedVersion >= SALAO_OPENBAR_FORCE_VERSION
  if (seedOk && !weddingHasStaleSalaoOpenbar(wedding)) {
    return wedding
  }

  const defaults = createDefaultDemands()
  const defaultIds = new Set(defaults.map((d) => d.id))
  const knownFlexRoots = new Set([
    'obra-mat',
    'aliancas',
    'banda',
    'love',
    'openbar',
    'terno',
    'buque',
    'mobilia',
    'salao',
    'salao-mensal',
    'salao-ultima',
    'salao-complemento',
  ])

  const custom = (wedding.demands || []).filter((d) => {
    if (defaultIds.has(d.id)) return false
    const root = d.id.split('__')[0]
    if (knownFlexRoots.has(root)) return false
    if (OLD_SALAO_IDS.has(root)) return false
    if (defaultIds.has(root)) return false
    return true
  })

  let sortOrder = defaults.reduce((m, d) => Math.max(m, d.sortOrder), 0) + 1
  const demands = [
    ...defaults,
    ...custom.map((d) => ({ ...d, sortOrder: sortOrder++ })),
  ]

  const alreadyPaid = [
    { name: 'Entrada / parcial Salão (já pago)', amount: SALAO_ALREADY_PAID },
    ...(wedding.alreadyPaid || []).filter((i) => !/sal[aã]o/i.test(i.name)),
  ]

  const checked = { ...(wedding.checked || {}) }
  for (const key of Object.keys(checked)) {
    if (/::.*sal[aã]o/i.test(key)) delete checked[key]
  }

  return {
    ...wedding,
    demands,
    flexItems: demandsToFlexItems(demands),
    alreadyPaid,
    checked: {
      ...JUNE_PAID_CHECKS,
      ...JULY_PAID_EXCEPT_DIA_NOIVA,
      ...checked,
    },
    totals: {
      ...wedding.totals,
      salaRemaining: SALAO_REMAINING,
    },
  }
}

/**
 * Sempre: remove vestido de vida, sapato no dia 21, dedupe (permite 2 Jaé no 21/07).
 */
function sanitizeLifeExpenses(expenses: Expense[]): Expense[] {
  const withoutWrong = expenses.filter((e) => {
    if ((e.purpose || 'life') !== 'life') return true
    if (/vestido/i.test(e.name)) return false
    if (e.date === '2026-07-21' && /sapato|monica\s*noivas|jim\.com/i.test(e.name)) {
      return false
    }
    if (e.id === 'seed-sapato-2026-07-21') return false
    return true
  })

  const softKey = (e: Expense) => {
    const n = e.name.toLocaleLowerCase('pt-BR')
    if (/ja[eé]|bilhete/i.test(n)) {
      // Extrato tem 2 Jaé de R$ 10 no dia 21 — seeds com ids distintos
      if (e.id.startsWith('seed-jae')) return `jae:${e.id}`
      return `jae:${e.date}|${e.amount}|${e.id}`
    }
    if (/chiuq|chiqu|chicl/i.test(n)) return `chiuquete|${e.date}|${e.amount}`
    if (/sync\s*pay/i.test(n)) return `syncpay|${e.date}|${e.amount}`
    if (/monique/i.test(n) && e.date === '2026-07-21') return `monique|${e.date}|${e.amount}`
    if (/monica|sapato|jim/i.test(n)) return `monica|${e.date}|${e.amount}`
    return `${e.date}|${n.trim()}|${e.amount}`
  }

  const seen = new Set<string>()
  const deduped: Expense[] = []
  for (const e of withoutWrong) {
    if ((e.purpose || 'life') === 'life' && e.kind === 'unique') {
      const key = softKey(e)
      if (seen.has(key)) continue
      seen.add(key)
    }
    deduped.push(e)
  }
  return deduped
}

/** Garante gastos do extrato 20–21/07 + lançamentos 22/07. */
function applyJuly21LifeExpenses(
  expenses: Expense[],
  seedVersion: number | undefined,
): Expense[] {
  const cleaned = sanitizeLifeExpenses(expenses)
  const seeds = [
    ...seedJuly21LifeExpenses(),
    seedJuly20MonicaNoivas(),
    ...seedJuly22LifeExpenses(),
  ]
  const ids = new Set(cleaned.map((e) => e.id))
  const softKeys = new Set(
    cleaned
      .filter((e) => (e.purpose || 'life') === 'life')
      .map((e) => {
        const n = e.name.toLocaleLowerCase('pt-BR')
        if (e.id.startsWith('seed-jae') || /ja[eé]|bilhete/i.test(n)) {
          return e.id.startsWith('seed-jae')
            ? `jae:${e.id}`
            : `jae:${e.date}|${e.amount}|${e.id}`
        }
        if (/chiuq|chiqu|chicl/i.test(n)) return `chiuquete|${e.date}|${e.amount}`
        if (/sync\s*pay/i.test(n)) return `syncpay|${e.date}|${e.amount}`
        if (/monique/i.test(n) && e.date === '2026-07-21') return `monique|${e.date}|${e.amount}`
        if (/monica|sapato|jim/i.test(n)) return `monica|${e.date}|${e.amount}`
        if (/g[eê]nesis|luiz\s*otavio/i.test(n) && e.date === '2026-07-22')
          return `genesis|${e.date}|${e.amount}`
        if (/manancia/i.test(n) && e.date === '2026-07-22')
          return `mananciais|${e.date}|${e.amount}`
        return `${e.date}|${n}|${e.amount}`
      }),
  )
  const missing = seeds.filter((s) => {
    if (ids.has(s.id)) return false
    const n = s.name.toLocaleLowerCase('pt-BR')
    const key = s.id.startsWith('seed-jae')
      ? `jae:${s.id}`
      : /chiuq|chiqu|chicl/i.test(n)
        ? `chiuquete|${s.date}|${s.amount}`
        : /sync\s*pay/i.test(n)
          ? `syncpay|${s.date}|${s.amount}`
          : /monique/i.test(n)
            ? `monique|${s.date}|${s.amount}`
            : /monica|sapato/i.test(n)
              ? `monica|${s.date}|${s.amount}`
              : /g[eê]nesis/i.test(n)
                ? `genesis|${s.date}|${s.amount}`
                : /manancia/i.test(n)
                  ? `mananciais|${s.date}|${s.amount}`
                  : `${s.date}|${n}|${s.amount}`
    if (softKeys.has(key)) return false
    return true
  })
  if (
    seedVersion !== undefined &&
    seedVersion >= JULY22_FOOD_SPEND_VERSION &&
    missing.length === 0
  ) {
    return cleaned
  }
  return [...cleaned, ...missing]
}

/** Vestido 333,33 + checks julho + já pagos atualizados. */
function applyVestidoAndJuly21Wedding(
  wedding: WeddingState | undefined,
  seedVersion: number | undefined,
): WeddingState {
  const base = createWeddingState()
  if (!wedding) return base
  if (seedVersion !== undefined && seedVersion >= JULY21_SPEND_AND_VESTIDO_VERSION) {
    return wedding
  }

  const alreadyPaid = (wedding.alreadyPaid || []).map((item) => {
    if (/vestido/i.test(item.name) && Math.abs(item.amount - 300) < 0.01) {
      return { ...item, amount: VESTIDO_PM }
    }
    return item
  })

  const hasJulVestido = alreadyPaid.some((i) => /vestido/i.test(i.name) && /julho|2\/7/i.test(i.name))
  if (!hasJulVestido) {
    alreadyPaid.push({
      name: 'Vestido (2/7 · julho) · Tavares Noiva',
      amount: VESTIDO_PM,
    })
  }

  return {
    ...wedding,
    checked: {
      ...(wedding.checked || {}),
      ...JULY_ALREADY_PAID_CHECKS,
    },
    alreadyPaid,
    totals: {
      ...base.totals,
      ...(wedding.totals || {}),
      vestidoTotal: base.totals.vestidoTotal,
    },
  }
}

/** Dia da Noiva 392,50 × 6 = 2.355; vestido permanece 333,33/mês. */
function applyNoivaParcelas(
  wedding: WeddingState | undefined,
  seedVersion: number | undefined,
): WeddingState {
  const base = createWeddingState()
  if (!wedding) return base
  if (seedVersion !== undefined && seedVersion >= NOIVA_PARCELAS_VERSION) {
    return wedding
  }
  return {
    ...wedding,
    totals: {
      ...base.totals,
      ...(wedding.totals || {}),
      vestidoTotal: Math.round(VESTIDO_PM * 5 * 100) / 100,
      diaNoivaRemaining: DIA_NOIVA_TOTAL,
    },
  }
}

function applyWeddingJuneSeed(
  wedding: WeddingState | undefined,
  seedVersion: number | undefined,
): WeddingState {
  const base = createWeddingState()
  if (!wedding) return base

  if (seedVersion !== undefined && seedVersion >= CASH_AND_JULY_PAID_SEED_VERSION) {
    const flexItems = (wedding.flexItems || []).filter((f) => !DEFERRED_FLEX_IDS.has(f.id))
    return {
      ...wedding,
      checked: { ...(wedding.checked || {}), ...JULY_ALREADY_PAID_CHECKS },
      flexItems: flexItems.length ? flexItems : base.flexItems,
      alreadyPaid: wedding.alreadyPaid?.length ? wedding.alreadyPaid : base.alreadyPaid,
    }
  }

  if (seedVersion !== undefined && seedVersion >= WEDDING_FULL_SCHEDULE_SEED_VERSION) {
    const flexItems = (wedding.flexItems || []).filter((f) => !DEFERRED_FLEX_IDS.has(f.id))
    const paidNames = new Set((wedding.alreadyPaid || []).map((i) => i.name))
    const mergedPaid = [
      ...(wedding.alreadyPaid || []),
      ...base.alreadyPaid.filter((i) => !paidNames.has(i.name)),
    ]
    return {
      ...wedding,
      checked: { ...(wedding.checked || {}), ...JULY_ALREADY_PAID_CHECKS },
      flexItems: flexItems.length ? flexItems : base.flexItems,
      alreadyPaid: mergedPaid.length ? mergedPaid : base.alreadyPaid,
    }
  }

  if (seedVersion !== undefined && seedVersion >= WEDDING_FOTO2_AUG_SEED_VERSION) {
    return {
      ...base,
      ...wedding,
      checked: wedding.checked || {},
      flexItems: wedding.flexItems?.length ? wedding.flexItems : base.flexItems,
      alreadyPaid: wedding.alreadyPaid?.length ? wedding.alreadyPaid : base.alreadyPaid,
    }
  }

  const paidNames = new Set((wedding.alreadyPaid || []).map((i) => i.name))
  const mergedPaid = [
    ...(wedding.alreadyPaid || []),
    ...base.alreadyPaid.filter((i) => !paidNames.has(i.name)),
  ]

  const checked = { ...(wedding.checked || {}), ...JUNE_PAID_CHECKS }
  delete checked['Jun::Salão de Festas']
  delete checked['Jun::Fotógrafo – 1ª parcela']

  // Remapeia labels antigos do cronograma (check keys)
  const rename: Record<string, string> = {
    'Jul::Salão (resto junho)': 'Jul::Salão (complemento)',
    'Jul::Obra banheiro ✓ quitado': 'Jul::Obra banheiro (restante)',
    'Jul::Fotógrafo ✓ quitado (2ª/2)': 'Ago::Fotógrafo – 2ª parcela',
    'Jul::Fotógrafo – 2ª parcela': 'Ago::Fotógrafo – 2ª parcela',
    'Dez::Salão ✓ quitado': 'Dez::Salão (última parcela)',
    'Dez::Vestido ✓ quitado (7/7)': 'Dez::Vestido (7/7 · última)',
    'Dez::Dia da Noiva ✓ quitado': 'Dez::Dia da Noiva (última)',
  }
  for (const [from, to] of Object.entries(rename)) {
    if (checked[from]) {
      checked[to] = true
      delete checked[from]
    }
  }

  return {
    ...base,
    ...wedding,
    checked,
    alreadyPaid: mergedPaid,
    totals: {
      ...base.totals,
      ...(wedding.totals || {}),
      salaRemaining: base.totals.salaRemaining,
      vestidoTotal: base.totals.vestidoTotal,
      obraMaoDeObra: base.totals.obraMaoDeObra,
      fotografo: base.totals.fotografo,
    },
    flexItems: wedding.flexItems?.length ? wedding.flexItems : base.flexItems,
  }
}

/**
 * Popula `demands` a partir do cronograma padrão (+ flex customizados).
 * v22: redistribui flexíveis nos meses mais leves.
 */
function applyWeddingDemandsSeed(
  wedding: WeddingState | undefined,
  seedVersion: number | undefined,
): WeddingState {
  const base = createWeddingState()
  if (!wedding) return base

  const dateLabel = wedding.dateLabel || base.dateLabel
  const defaults = createDefaultDemands()
  const defaultIds = new Set(defaults.map((d) => d.id))
  // ids base de flex (antes do balanceamento gerava chunks __YYYY-MM)
  const knownFlexRoots = new Set([
    'obra-mat',
    'aliancas',
    'banda',
    'love',
    'openbar',
    'terno',
    'buque',
    'mobilia',
  ])

  if (
    seedVersion !== undefined &&
    seedVersion >= WEDDING_BALANCE_VERSION &&
    wedding.demands?.length
  ) {
    return {
      ...wedding,
      demands: wedding.demands,
      flexItems: demandsToFlexItems(wedding.demands),
    }
  }

  // Já tinha demands (v21): reaplica defaults equilibrados e preserva demandas custom
  if (wedding.demands?.length) {
    const custom = wedding.demands.filter((d) => {
      if (defaultIds.has(d.id)) return false
      const root = d.id.split('__')[0]
      if (knownFlexRoots.has(root)) return false
      if (defaultIds.has(root)) return false
      return true
    })
    let sortOrder = defaults.reduce((m, d) => Math.max(m, d.sortOrder), 0) + 1
    const merged = [
      ...defaults,
      ...custom.map((d) => ({ ...d, sortOrder: sortOrder++ })),
    ]
    return {
      ...base,
      ...wedding,
      dateLabel,
      checked: {
        ...JUNE_PAID_CHECKS,
        ...JULY_ALREADY_PAID_CHECKS,
        ...(wedding.checked || {}),
      },
      demands: merged,
      flexItems: demandsToFlexItems(merged),
    }
  }

  const byId = new Map(defaults.map((d) => [d.id, d]))
  let sortOrder = defaults.reduce((m, d) => Math.max(m, d.sortOrder), 0) + 1
  for (const f of wedding.flexItems || []) {
    if (byId.has(f.id) || knownFlexRoots.has(f.id)) {
      // valores custom no flex conhecido: rebalance usa defaults; amount fica no spec via recreate
      continue
    }
    if (DEFERRED_FLEX_IDS.has(f.id)) {
      byId.set(f.id, {
        id: f.id,
        name: f.name,
        amount: f.amount,
        tag: f.tag || 'casa',
        duration: 'permanent',
        startMonth: '2026-07',
        amountMode: 'per_month',
        sortOrder: sortOrder++,
        active: false,
        naming: 'plain',
      })
      continue
    }
    byId.set(f.id, {
      id: f.id,
      name: f.name,
      amount: f.amount,
      tag: f.tag || 'casamento',
      duration: 'until_wedding',
      startMonth: '2026-07',
      amountMode: 'total_split',
      sortOrder: sortOrder++,
      active: true,
      naming: 'parts',
    })
  }

  const demands = [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder)
  const { schedule } = buildWeddingSchedule(WEDDING_MONTHS_BUDGET_PLACEHOLDER, {
    ...wedding,
    dateLabel,
    demands,
    flexItems: demandsToFlexItems(demands),
  })

  const checked = { ...(wedding.checked || {}) }
  for (const month of schedule) {
    for (const p of month.payments) {
      const newKey = `${month.short}::${p.name}`
      if (checked[newKey]) continue
      const baseName = p.name
        .replace(/\s*\(\d+\/\d+(?:\s*·\s*última)?\)\s*$/, '')
        .replace(/\s*\(última\)\s*$/, '')
        .trim()
      const candidates = [
        `${month.short}::${baseName}`,
        `${month.short}::${baseName} (parcial)`,
        `${month.short}::${baseName} ✓ quitado`,
        `${month.short}::${baseName} (planejado)`,
      ]
      for (const oldKey of candidates) {
        if (checked[oldKey]) {
          checked[newKey] = true
          break
        }
      }
    }
  }

  return {
    ...base,
    ...wedding,
    dateLabel,
    checked: { ...JUNE_PAID_CHECKS, ...JULY_ALREADY_PAID_CHECKS, ...checked },
    demands,
    flexItems: demandsToFlexItems(demands),
  }
}

/** Placeholder de orçamento só para remap de checks na migração. */
const WEDDING_MONTHS_BUDGET_PLACEHOLDER = [0, 0, 0, 0, 0, 0]

/** Aplica migrações/sementes em estado local ou vindo da nuvem. */
export function hydrateState(parsed: Partial<FinanceState> | null | undefined): FinanceState {
  const base = createInitialState()
  if (!parsed) return base

  const asOf =
    parsed.cashBalance?.asOf ||
    base.cashBalance.asOf ||
    new Date().toISOString().slice(0, 10)

  const needsFresh = parsed.seedVersion === undefined || parsed.seedVersion < FRESH_START_AUG12_VERSION

  const expenses = applyFreshExpenseReset(
    applyJuly21LifeExpenses(
      (parsed.expenses || base.expenses).map((e: Expense) =>
        migrateExpensePaymentStatus(
          {
            ...e,
            purpose: e.purpose || 'life',
          } as Expense,
          asOf,
        ),
      ),
      needsFresh ? undefined : parsed.seedVersion,
    ),
    parsed.seedVersion,
  )

  const otherIncomes = needsFresh
    ? []
    : applyOtherIncomeSeed(
        (parsed.otherIncomes || base.otherIncomes).map((o: OtherIncome) =>
          migrateOtherIncomeReceivedStatus(o, asOf),
        ),
        parsed.seedVersion,
      )

  const cashBalance = applyCashSeed(
    parsed.cashBalance,
    expenses,
    otherIncomes,
    parsed.seedVersion,
  )

  const wedding = applySalaoOpenbarRecalc(
    applyJulyPaidExceptDiaNoiva(
      applyWeddingDemandsSeed(
        applyNoivaParcelas(
          applyVestidoAndJuly21Wedding(
            applyWeddingJuneSeed(parsed.wedding, parsed.seedVersion),
            parsed.seedVersion,
          ),
          parsed.seedVersion,
        ),
        parsed.seedVersion,
      ),
      parsed.seedVersion,
    ),
    parsed.seedVersion,
  )

  return {
    ...base,
    ...parsed,
    categories: parsed.categories?.length ? parsed.categories : base.categories,
    salaries: applySalarySeed(parsed.salaries ?? base.salaries, parsed.seedVersion),
    projects: applyProjectSeed(parsed.projects ?? base.projects, parsed.seedVersion),
    otherIncomes,
    cashBalance,
    seedVersion: SEED_VERSION,
    wedding,
    expenses,
  }
}

export function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    return hydrateState(JSON.parse(raw) as Partial<FinanceState>)
  } catch {
    return createInitialState()
  }
}

export function saveState(state: FinanceState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
