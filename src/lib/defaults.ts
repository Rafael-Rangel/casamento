import type { Category, Expense, FinanceState } from '../types/finance'
import { uid } from './format'
import { createWeddingState } from './wedding'

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
    salaries: [
      {
        id: uid(),
        name: 'Gênesis',
        amount: 8800,
        payDay: 5,
        startDate: '2026-01-01',
        endDate: null,
        active: true,
      },
    ],
    projects: [],
    expenses: [
      lifeExpense('Gastos pessoais / custo de vida', 2320, 'outros', {
        notes: 'Moradia, comida, transporte e o essencial do dia a dia',
      }),
    ],
    otherIncomes: [],
    categories: [...DEFAULT_CATEGORIES],
    projectionMonths: 12,
    wedding: createWeddingState(),
  }
}

export const STORAGE_KEY = 'casamento-fluxo-v2'
