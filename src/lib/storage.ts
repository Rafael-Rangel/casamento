import {
  CASH_SEED_VERSION,
  createInitialState,
  PROJECT_SEED_VERSION,
  SALARY_SEED_VERSION,
  seedCashBalance,
  seedProjects,
  seedSalaries,
  SEED_VERSION,
  STORAGE_KEY,
  WEDDING_FOTO2_AUG_SEED_VERSION,
  WEDDING_FULL_SCHEDULE_SEED_VERSION,
} from './defaults'
import {
  createWeddingState,
  DEFERRED_FLEX_IDS,
  JUNE_PAID_CHECKS,
} from './wedding'
import type {
  CashBalance,
  Expense,
  FinanceState,
  Project,
  SalarySource,
  WeddingState,
} from '../types/finance'

/** Injeta projetos-semente ausentes (por id) uma única vez por versão de semente */
function applyProjectSeed(projects: Project[], seedVersion: number | undefined): Project[] {
  if (seedVersion !== undefined && seedVersion >= PROJECT_SEED_VERSION) return projects
  const existingIds = new Set(projects.map((p) => p.id))
  const missing = seedProjects().filter((p) => !existingIds.has(p.id))
  return [...projects, ...missing]
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

function applyCashSeed(
  cash: CashBalance | undefined,
  seedVersion: number | undefined,
): CashBalance {
  if (seedVersion !== undefined && seedVersion >= CASH_SEED_VERSION && cash) return cash
  return seedCashBalance()
}

function applyWeddingJuneSeed(
  wedding: WeddingState | undefined,
  seedVersion: number | undefined,
): WeddingState {
  const base = createWeddingState()
  if (!wedding) return base

  if (seedVersion !== undefined && seedVersion >= WEDDING_FULL_SCHEDULE_SEED_VERSION) {
    const flexItems = (wedding.flexItems || []).filter((f) => !DEFERRED_FLEX_IDS.has(f.id))
    return {
      ...base,
      ...wedding,
      checked: wedding.checked || {},
      flexItems: flexItems.length ? flexItems : base.flexItems,
      alreadyPaid: wedding.alreadyPaid?.length ? wedding.alreadyPaid : base.alreadyPaid,
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

export function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as Partial<FinanceState>
    const base = createInitialState()
    return {
      ...base,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : base.categories,
      salaries: applySalarySeed(parsed.salaries ?? base.salaries, parsed.seedVersion),
      projects: applyProjectSeed(parsed.projects ?? base.projects, parsed.seedVersion),
      cashBalance: applyCashSeed(parsed.cashBalance, parsed.seedVersion),
      seedVersion: SEED_VERSION,
      wedding: applyWeddingJuneSeed(parsed.wedding, parsed.seedVersion),
      expenses: (parsed.expenses || base.expenses).map((e: Expense) => ({
        ...e,
        purpose: e.purpose || 'life',
      })),
    }
  } catch {
    return createInitialState()
  }
}

export function saveState(state: FinanceState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
