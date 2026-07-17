import type {
  CashBalance,
  Category,
  Expense,
  FinanceState,
  Project,
  SalarySource,
} from '../types/finance'
import { uid } from './format'
import { createWeddingState } from './wedding'

export const PROJECT_SEED_VERSION = 1
export const SALARY_SEED_VERSION = 2
export const CASH_SEED_VERSION = 3
export const SEED_VERSION = CASH_SEED_VERSION

export function seedCashBalance(): CashBalance {
  return {
    amount: 6760.22,
    asOf: '2026-07-17',
    notes: 'Saldo disponível após receitas e despesas pessoais até 17/07/2026',
  }
}

export function seedSalaries(): SalarySource[] {
  return [
    {
      id: 'seed-salary-genesis',
      name: 'Gênesis',
      amount: 4000,
      payDay: 10,
      startDate: '2026-01-01',
      endDate: null,
      active: true,
    },
    {
      id: 'seed-salary-brixclub',
      name: 'BrixClub',
      amount: 200,
      payDay: 10,
      startDate: '2026-01-01',
      endDate: null,
      active: true,
    },
  ]
}

/** Projetos KoruVision pré-cadastrados (IDs estáveis p/ semente única) */
export function seedProjects(): Project[] {
  return [
    {
      id: 'seed-landing-mia-flor',
      name: 'Landing Page',
      client: 'Mia Fllor',
      closeDate: '2026-07-13',
      totalValue: 950,
      installments: [{ id: 'seed-landing-1', amount: 950, date: '2026-07-13' }],
      hasMonthly: true,
      monthlyAmount: 300,
      monthlyStart: '2026-08-13',
      monthlyEnd: null,
      notes: '',
    },
    {
      id: 'seed-ecommerce-mia-flor',
      name: 'Ecommerce',
      client: 'Mia Fllor',
      closeDate: '2026-07-13',
      totalValue: 2500,
      installments: [{ id: 'seed-ecommerce-1', amount: 2500, date: '2026-07-13' }],
      hasMonthly: true,
      monthlyAmount: 650,
      monthlyStart: '2026-10-13',
      monthlyEnd: null,
      notes: '',
    },
    {
      id: 'seed-crm-mia-flor',
      name: 'CRM',
      client: 'Mia Fllor',
      closeDate: '2026-07-13',
      totalValue: 0,
      installments: [{ id: 'seed-crm-1', amount: 0, date: '2026-07-13' }],
      hasMonthly: true,
      monthlyAmount: 200,
      monthlyStart: '2026-08-10',
      monthlyEnd: null,
      notes: '',
    },
    {
      id: 'seed-website-power-volts',
      name: 'Website',
      client: 'Power Volts',
      closeDate: '2026-07-20',
      totalValue: 3490,
      installments: [
        { id: 'seed-website-1', amount: 1745, date: '2026-07-20' },
        { id: 'seed-website-2', amount: 1745, date: '2026-08-20' },
      ],
      hasMonthly: true,
      monthlyAmount: 600,
      monthlyStart: '2026-08-20',
      monthlyEnd: null,
      notes: '',
    },
  ]
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'moradia', name: 'Moradia', color: '#9B4D6A' },
  { id: 'alimentacao', name: 'Alimentação', color: '#C46A3A' },
  { id: 'transporte', name: 'Transporte', color: '#3A6EA5' },
  { id: 'cartao', name: 'Cartão de crédito', color: '#B83B5E' },
  { id: 'assinaturas', name: 'Assinaturas', color: '#6B5B95' },
  { id: 'lazer', name: 'Lazer', color: '#E0A100' },
  { id: 'saude', name: 'Saúde', color: '#2A9D8F' },
  { id: 'educacao', name: 'Educação', color: '#457B9D' },
  { id: 'investimentos', name: 'Investimentos', color: '#1F8A5B' },
  { id: 'casamento', name: 'Casamento (extra)', color: '#D45B8C' },
  { id: 'outros', name: 'Outros', color: '#6C757D' },
]

function lifeExpense(
  name: string,
  amount: number,
  categoryId: string,
  extra: Partial<Expense> = {},
): Expense {
  return {
    id: uid(),
    name,
    categoryId,
    amount,
    kind: 'recurring',
    purpose: 'life',
    date: '2026-01-01',
    endDate: '2026-12-31',
    notes: '',
    ...extra,
  }
}

export function createInitialState(): FinanceState {
  return {
    salaries: seedSalaries(),
    projects: seedProjects(),
    expenses: [
      lifeExpense('Gastos pessoais / custo de vida', 2320, 'outros', {
        notes: 'Moradia, comida, transporte e o essencial do dia a dia',
      }),
    ],
    otherIncomes: [],
    categories: [...DEFAULT_CATEGORIES],
    projectionMonths: 12,
    wedding: createWeddingState(),
    cashBalance: seedCashBalance(),
    seedVersion: SEED_VERSION,
  }
}

export const STORAGE_KEY = 'casamento-fluxo-v2'
