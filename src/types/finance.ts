export type ExpenseKind = 'unique' | 'installment' | 'recurring'

/** life = vida geral/cartão (reduz sobra); wedding = gasto do casamento (rastreado no módulo Casamento) */
export type ExpensePurpose = 'life' | 'wedding'

export interface SalarySource {
  id: string
  name: string
  amount: number
  payDay: number
  startDate: string
  endDate: string | null
  active: boolean
}

export interface ProjectInstallment {
  id: string
  amount: number
  date: string
}

export interface Project {
  id: string
  name: string
  client: string
  closeDate: string
  totalValue: number
  installments: ProjectInstallment[]
  hasMonthly: boolean
  monthlyAmount: number
  monthlyStart: string | null
  monthlyEnd: string | null
  notes: string
}

export interface Expense {
  id: string
  name: string
  categoryId: string
  amount: number
  kind: ExpenseKind
  purpose: ExpensePurpose
  date: string
  installmentCount?: number
  endDate?: string | null
  notes: string
  /**
   * unique: se a despesa já saiu da conta.
   * installment/recurring: use paidOccurrences por data.
   */
  paid: boolean
  /** Parcelas/ocorrências pagas (chave = yyyy-MM-dd). */
  paidOccurrences?: Record<string, boolean>
}

export interface OtherIncome {
  id: string
  name: string
  amount: number
  date: string
  recurring: boolean
  endDate: string | null
  notes: string
  /**
   * unique (!recurring): se o valor já entrou na conta.
   * recurring: use receivedOccurrences por data.
   */
  received: boolean
  /** Ocorrências recebidas (chave = yyyy-MM-dd). */
  receivedOccurrences?: Record<string, boolean>
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface WeddingPaidItem {
  name: string
  amount: number
}

export interface WeddingFlexItem {
  id: string
  name: string
  amount: number
  tag: string
}

/** Como a demanda se espalha no tempo */
export type DemandDuration = 'month' | 'range' | 'until_wedding' | 'permanent'
/** total_split = divide o valor; per_month = mesmo valor em cada mês */
export type DemandAmountMode = 'total_split' | 'per_month'
/**
 * plain = só o nome
 * parts = Nome (k/N) · última no fim
 * simple_last = Nome nos meses; Nome (última) no último
 */
export type DemandNaming = 'plain' | 'parts' | 'simple_last'

export interface WeddingDemand {
  id: string
  name: string
  amount: number
  tag: string
  duration: DemandDuration
  /** YYYY-MM — mês único ou início */
  startMonth: string
  /** YYYY-MM — só para range */
  endMonth?: string | null
  amountMode: DemandAmountMode
  sortOrder: number
  /** false = fora do cronograma (ex.: mobília) */
  active: boolean
  naming?: DemandNaming
  /** Para naming parts: índice da 1ª parcela (vestido = 2) */
  partStart?: number
  /** Para naming parts: total exibido (vestido = 7) */
  partTotal?: number
}

export interface WeddingState {
  dateLabel: string
  /** Checkboxes do cronograma: "Jun::Salão de Festas" */
  checked: Record<string, boolean>
  alreadyPaid: WeddingPaidItem[]
  /** Legado — espelho; fonte do cronograma é `demands` */
  flexItems: WeddingFlexItem[]
  /** Demandas editáveis (fonte de verdade do cronograma) */
  demands: WeddingDemand[]
  /** Totais fixos usados no resumo */
  totals: {
    salaRemaining: number
    vestidoTotal: number
    diaNoivaRemaining: number
    fotografo: number
    preWedding: number
    obraMaoDeObra: number
  }
}

export interface CashBalance {
  /** Dinheiro disponível agora (resultado do ledger) */
  amount: number
  /** Data de referência do saldo (YYYY-MM-DD) */
  asOf: string
  notes: string
  /** Saldo do extrato Nu na data openingAsOf (base do cálculo) */
  openingAmount?: number
  /** Último dia incluso no extrato (gastos desse dia já estão no opening) */
  openingAsOf?: string
}

export interface FinanceState {
  salaries: SalarySource[]
  projects: Project[]
  expenses: Expense[]
  otherIncomes: OtherIncome[]
  categories: Category[]
  projectionMonths: number
  wedding: WeddingState
  /** Saldo disponível na conta na data de referência */
  cashBalance: CashBalance
  /** Controle de sementes já aplicadas (ex.: projetos KoruVision) */
  seedVersion?: number
}

export type EntryKind =
  | 'salary'
  | 'project_payment'
  | 'project_monthly'
  | 'other_income'
  | 'expense'

export interface MonthEntry {
  id: string
  kind: EntryKind
  label: string
  amount: number
  category?: string
  meta?: string
  sourceId: string
  purpose?: ExpensePurpose
}

export interface MonthProjection {
  key: string
  year: number
  month: number
  label: string
  short: string
  incomes: MonthEntry[]
  expenses: MonthEntry[]
  totalIncome: number
  totalExpense: number
  /** Despesas de vida (exclui wedding) */
  lifeExpense: number
  /** Sobra disponível para o casamento */
  weddingBudget: number
  balance: number
  cumulativeBalance: number
}
