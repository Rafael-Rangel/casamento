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
}

export interface OtherIncome {
  id: string
  name: string
  amount: number
  date: string
  recurring: boolean
  endDate: string | null
  notes: string
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

export interface WeddingState {
  dateLabel: string
  /** Checkboxes do cronograma: "Jun::Salão de Festas" */
  checked: Record<string, boolean>
  alreadyPaid: WeddingPaidItem[]
  flexItems: WeddingFlexItem[]
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
  /** Dinheiro disponível agora (conta / caixa) */
  amount: number
  /** Data de referência do saldo (YYYY-MM-DD) */
  asOf: string
  notes: string
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
