import type {
  CashBalance,
  Category,
  Expense,
  FinanceState,
  OtherIncome,
  Project,
  SalarySource,
} from '../types/finance'
import { uid } from './format'
import { createWeddingState } from './wedding'

export const PROJECT_SEED_VERSION = 1
export const SALARY_SEED_VERSION = 2
export const CASH_SEED_VERSION = 3
export const WEDDING_JUNE_SEED_VERSION = 4
export const WEDDING_OBRA_SEED_VERSION = 5
/** Junho sai do cronograma; fotógrafo 1ª parcela vai para julho */
export const WEDDING_DROP_JUNE_SEED_VERSION = 6
/** Labels do cronograma sem “✓ quitado” prematuro */
export const WEDDING_LABELS_SEED_VERSION = 7
/** Fotógrafo 2ª parcela passa de julho para agosto */
export const WEDDING_FOTO2_AUG_SEED_VERSION = 8
/** Todos os itens no cronograma (mesmo negativo); mobília fora do plano */
export const WEDDING_FULL_SCHEDULE_SEED_VERSION = 9
/** Caixa 6.720,22 + Vestido/Obra julho já pagos */
export const CASH_AND_JULY_PAID_SEED_VERSION = 10
/** Despesas únicas/parceladas de vida já lançadas passam a baixar o caixa */
export const LIFE_EXPENSE_CASH_SYNC_VERSION = 11
/** Status explícito pago/pendente nas despesas */
export const EXPENSE_PAYMENT_STATUS_VERSION = 12
/** Status recebido/pendente nas receitas extras */
export const OTHER_INCOME_RECEIVED_VERSION = 13
/**
 * Extrato Nu até 20/07 = 6.788,38.
 * Em 21/07: Vestido Tavares 333,33 + Chiuquete Adri 7,98 + Jaé 10,00 → caixa 6.437,07.
 * Parcela do vestido corrigida para 333,33.
 */
export const JULY21_SPEND_AND_VESTIDO_VERSION = 14
/** Vestido 333,33/mês até dez; Dia da Noiva 2.355 ÷ 6 = 392,50 */
export const NOIVA_PARCELAS_VERSION = 15
/**
 * Força caixa = extrato Nu 20/07 (6.788,38) − gastos 21/07 (333,33+7,98+10) = 6.437,07.
 * Corrige aparelhos que ficaram com seedVersion >= 14 mas saldo antigo (ex.: 5.777,94).
 */
export const FORCE_CASH_JULY21_VERSION = 16
/**
 * Extrato Nu 01–20/07: saldo final R$ 6.788,38.
 * 20/07 já inclui JIM.COM* MONICA NOIVAS R$ 60 (sapato) — não descontar de novo.
 * 21/07: vestido 333,33 + chiuquete 7,98 + Jaé 10 → saldo R$ 6.437,07.
 */
export const RECONCILE_NU_CASH_VERSION = 18
/** Força de novo o reconcile (v18 podia rodar sem expenses limpos). */
export const RECONCILE_NU_CASH_V2_VERSION = 19
/** Corrige: sapato/Monica Noivas é do dia 20 (já no PDF), não do 21. */
export const RECONCILE_NU_CASH_V3_VERSION = 20
/** Cronograma vira demandas editáveis (período + modo de valor). */
export const WEDDING_DEMANDS_VERSION = 21
/** Redistribui flexíveis nos meses mais leves (agosto menos carregado). */
export const WEDDING_BALANCE_VERSION = 22
/** Remove projeto Power Volts (não pago — não contar receita). */
export const REMOVE_POWER_VOLTS_VERSION = 23
/**
 * Extrato Nu 01–21/07/2026 (PDF gerado 22/07): saldo final R$ 6.369,01.
 * Já inclui vestido 333,33 + vida do dia 21 (2× Jaé, chiuquete, Sync Pay, Monique)
 * e sapato Monica Noivas no dia 20.
 */
export const CASH_LEDGER_VERSION = 24
/** Força opening = saldo Nu fechado em 21/07 (6.369,01) — corrige 6.437,07 antigo. */
export const NU_EXTRATO_21JUL_VERSION = 25
/** Almoço Gênesis 18 + Cafeteria Mananciais 27,50 em 22/07 (baixam o caixa). */
export const JULY22_FOOD_SPEND_VERSION = 26
/** Extra Daniele R$ 1.100 (única) + salários Gênesis+Brix = Pix 4.200 no Nu. */
export const DANIELE_EXTRA_AND_SALARY_NOTE_VERSION = 27
/**
 * Novo controle a partir de 12/08/2026:
 * caixa R$ 4.882,46 · zera histórico de despesas · Mia Flow + Powervolt atualizados.
 */
export const FRESH_START_AUG12_VERSION = 28
/** Salão total 24.500 − 6.194 pagos = 18.306 · Open Bar 2.100 */
export const SALAO_OPENBAR_RECALC_VERSION = 29
/** Força de novo: aparelhos/nuvem com seed 29 ainda no salão antigo (1.557). */
export const SALAO_OPENBAR_FORCE_VERSION = 30
/** Replaneja meses: fixos mensais + Open Bar 2.280 + obra perto do casamento. */
export const WEDDING_REPLAN_AUG26_VERSION = 31
export const SEED_VERSION = WEDDING_REPLAN_AUG26_VERSION

export const POWER_VOLTS_PROJECT_ID = 'seed-website-power-volts'

/** Extrato Nu fechado em 20/07/2026 (antes do dia 21) */
export const NU_BALANCE_2026_07_20 = 6788.38
/** Extrato Nu fechado em 21/07/2026 — saldo final do PDF */
export const NU_BALANCE_2026_07_21 = 6369.01
/** Vestido Tavares pago em 21/07 (casamento — já no saldo 21/07) */
export const VESTIDO_PAID_2026_07_21 = 333.33

/** Novo ponto de partida do controle financeiro */
export const CASH_OPENING_FRESH = 4882.46
export const CASH_OPENING_FRESH_AS_OF = '2026-08-12'

export function seedCashBalance(): CashBalance {
  return {
    openingAmount: CASH_OPENING_FRESH,
    openingAsOf: CASH_OPENING_FRESH_AS_OF,
    amount: CASH_OPENING_FRESH,
    asOf: CASH_OPENING_FRESH_AS_OF,
    notes:
      'Novo controle desde 12/08/2026 · saldo disponível R$ 4.882,46 · histórico anterior zerado',
  }
}

/** Recalcula saldo a partir do fechamento Nu 21/07 (sem rebaixar o que já está no PDF). */
export function reconcileCashFromNuExtrato(_expenses: Expense[]): CashBalance {
  return seedCashBalance()
}

/** Gastos de vida do extrato 21/07 (já no saldo 6.369,01 — não reaplicar no ledger). */
export function seedJuly21LifeExpenses(): Expense[] {
  return [
    {
      id: 'seed-chiuquete-2026-07-21',
      name: 'Chiuquete (condomínio Adri)',
      categoryId: 'lazer',
      amount: 7.98,
      kind: 'unique',
      purpose: 'life',
      date: '2026-07-21',
      notes: 'ClassicMarket 21/07 — já no saldo Nu',
      paid: true,
    },
    {
      id: 'seed-jae-2026-07-21',
      name: 'Bilhete digital Jaé',
      categoryId: 'transporte',
      amount: 10,
      kind: 'unique',
      purpose: 'life',
      date: '2026-07-21',
      notes: 'CBD Bilhete Digital 21/07 — já no saldo Nu',
      paid: true,
    },
    {
      id: 'seed-jae-2026-07-21-b',
      name: 'Bilhete digital Jaé (2)',
      categoryId: 'transporte',
      amount: 10,
      kind: 'unique',
      purpose: 'life',
      date: '2026-07-21',
      notes: '2º CBD Bilhete Digital 21/07 — já no saldo Nu',
      paid: true,
    },
    {
      id: 'seed-syncpay-2026-07-21',
      name: 'Sync Pay',
      categoryId: 'outros',
      amount: 8.06,
      kind: 'unique',
      purpose: 'life',
      date: '2026-07-21',
      notes: 'Pix Sync Pay 21/07 — já no saldo Nu',
      paid: true,
    },
    {
      id: 'seed-monique-2026-07-21',
      name: 'Pix Monique',
      categoryId: 'outros',
      amount: 50,
      kind: 'unique',
      purpose: 'life',
      date: '2026-07-21',
      notes: 'Pix Monique Freire 21/07 — já no saldo Nu',
      paid: true,
    },
  ]
}

/** Sapato no PDF 20/07 (JIM.COM* MONICA NOIVAS) — já no saldo 6.369,01. */
export function seedJuly20MonicaNoivas(): Expense {
  return {
    id: 'seed-monica-noivas-2026-07-20',
    name: 'Monica Noivas (sapato)',
    categoryId: 'outros',
    amount: 60,
    kind: 'unique',
    purpose: 'life',
    date: '2026-07-20',
    notes: 'No extrato Nu 20/07 — já no saldo do PDF',
    paid: true,
  }
}

/** Gastos de vida 22/07 — depois do extrato → baixam o caixa. */
export function seedJuly22LifeExpenses(): Expense[] {
  return [
    {
      id: 'seed-almoco-genesis-2026-07-22',
      name: 'Almoço Gênesis',
      categoryId: 'alimentacao',
      amount: 18,
      kind: 'unique',
      purpose: 'life',
      date: '2026-07-22',
      notes: '22/07 — LuizOtavio / Gênesis',
      paid: true,
    },
    {
      id: 'seed-cafeteria-mananciais-2026-07-22',
      name: 'Cafeteria Mananciais',
      categoryId: 'alimentacao',
      amount: 27.5,
      kind: 'unique',
      purpose: 'life',
      date: '2026-07-22',
      notes: '22/07 — comida',
      paid: true,
    },
  ]
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

/**
 * Receitas extras pontuais — zeradas no novo controle (histórico anterior encerrado).
 */
export function seedOtherIncomes(): OtherIncome[] {
  return []
}

/**
 * Projetos KoruVision — visão a partir de ago/2026.
 * Mensalidades Mia Flow e parcelas Powervolt entram como installments (valor líquido 100%).
 * Ecommerce: 1ª metade já paga / em produção — sem nova entrada.
 */
export function seedProjects(): Project[] {
  return [
    {
      id: 'seed-landing-mia-flor',
      name: 'Landing Page',
      client: 'Mia Flow',
      closeDate: '2026-07-13',
      totalValue: 900,
      installments: [
        { id: 'seed-landing-m1', amount: 300, date: '2026-08-14' },
        { id: 'seed-landing-m2', amount: 300, date: '2026-09-10' },
        { id: 'seed-landing-m3', amount: 300, date: '2026-10-10' },
      ],
      hasMonthly: false,
      monthlyAmount: 0,
      monthlyStart: null,
      monthlyEnd: null,
      notes: '3 mensalidades de R$ 300 (ago 14 · set 10 · out 10)',
    },
    {
      id: 'seed-ecommerce-mia-flor',
      name: 'Ecommerce',
      client: 'Mia Flow',
      closeDate: '2026-07-13',
      totalValue: 2500,
      installments: [],
      hasMonthly: false,
      monthlyAmount: 0,
      monthlyStart: null,
      monthlyEnd: null,
      notes: '1ª metade já paga · em produção — sem nova entrada no controle atual',
    },
    {
      id: 'seed-crm-mia-flor',
      name: 'Coruvision CRM',
      client: 'Mia Flow',
      closeDate: '2026-07-13',
      totalValue: 599.7,
      installments: [
        { id: 'seed-crm-m1', amount: 199.9, date: '2026-08-17' },
        { id: 'seed-crm-m2', amount: 199.9, date: '2026-09-10' },
        { id: 'seed-crm-m3', amount: 199.9, date: '2026-10-10' },
      ],
      hasMonthly: false,
      monthlyAmount: 0,
      monthlyStart: null,
      monthlyEnd: null,
      notes: '3 mensalidades de R$ 199,90 (ago 17 · set 10 · out 10)',
    },
    {
      id: POWER_VOLTS_PROJECT_ID,
      name: 'Website',
      client: 'Powervolt',
      closeDate: '2026-08-14',
      totalValue: 3490,
      installments: [
        { id: 'seed-website-1', amount: 1745, date: '2026-08-14' },
        { id: 'seed-website-2', amount: 1745, date: '2026-09-10' },
        { id: 'seed-website-maint-1', amount: 597, date: '2026-09-10' },
      ],
      hasMonthly: false,
      monthlyAmount: 0,
      monthlyStart: null,
      monthlyEnd: null,
      notes: '2 parcelas R$ 1.745 + manutenção 1 mês R$ 597 em 10/09 (depois decide se continua)',
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
    paid: false,
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
    otherIncomes: seedOtherIncomes(),
    categories: [...DEFAULT_CATEGORIES],
    projectionMonths: 12,
    wedding: createWeddingState(),
    cashBalance: seedCashBalance(),
    seedVersion: SEED_VERSION,
  }
}

export const STORAGE_KEY = 'casamento-fluxo-v2'
