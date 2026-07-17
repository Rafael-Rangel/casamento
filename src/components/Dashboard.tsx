import { useMemo, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, CalendarDays, TrendingUp, Wallet } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import {
  futureMonthlyFees,
  recurringRevenue,
  sumByKind,
  upcomingExpenses,
  upcomingIncomes,
} from '../lib/projections'
import { cashflowSnapshot } from '../lib/agenda'
import { capitalize, fmt } from '../lib/format'
import { Money } from './ui'

gsap.registerPlugin(useGSAP)

export function Dashboard() {
  const { state, projections } = useFinance()
  const root = useRef<HTMLDivElement>(null)

  const current = projections[0]
  const recurring = recurringRevenue(state)
  const nextIn = upcomingIncomes(projections, 5)
  const nextOut = upcomingExpenses(projections, 5)
  const monthlyFees = futureMonthlyFees(state)
  const snap = useMemo(() => cashflowSnapshot(state, new Date(), 2), [state])

  const chartData = projections.map((m) => ({
    name: capitalize(m.short),
    receitas: m.totalIncome,
    despesas: m.totalExpense,
    saldo: m.balance,
    patrimonio: m.cumulativeBalance,
  }))

  useGSAP(
    () => {
      gsap.from('.dash-kpi', {
        y: 18,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
      })
      gsap.from('.dash-panel', {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.15,
        ease: 'power2.out',
      })
    },
    { scope: root, dependencies: [projections.length] },
  )

  if (!current) return null

  return (
    <div ref={root} className="space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#f2b6c855,transparent_50%),radial-gradient(ellipse_at_90%_30%,#c45b7a33,transparent_45%),linear-gradient(145deg,#3d1f2b_0%,#5c2f40_55%,#7a3d55_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23ffffff%27 fill-opacity=%270.06%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative">
          <p className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Casamento
          </p>
          <p className="mt-3 max-w-md text-base text-white/70">
            Conta por data: o que já caiu até hoje e o que ainda vai entrar (ex.: Power Volts
            no dia 20).
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-pink-100 backdrop-blur">
            <CalendarDays size={16} />
            {capitalize(current.label)}
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: 'Saldo em caixa',
            value: state.cashBalance?.amount ?? 0,
            icon: Wallet,
            tone: 'accent' as const,
          },
          {
            label: 'Já recebido até hoje',
            value: snap.receivedUntilToday,
            icon: ArrowUpRight,
            tone: 'positive' as const,
          },
          {
            label: 'Ainda a receber',
            value: snap.pendingIncome,
            icon: ArrowUpRight,
            tone: 'positive' as const,
          },
          {
            label: 'Ainda a pagar',
            value: snap.pendingExpense,
            icon: ArrowDownRight,
            tone: 'negative' as const,
          },
          {
            label: 'Receita recorrente',
            value: recurring,
            icon: TrendingUp,
            tone: 'accent' as const,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="dash-kpi rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                {kpi.label}
              </span>
              <kpi.icon size={16} className="text-[var(--ink-faint)]" />
            </div>
            <Money value={kpi.value} className="text-2xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Caixa + a receber − a pagar
          </p>
          <Money
            value={(state.cashBalance?.amount ?? 0) + snap.pendingIncome - snap.pendingExpense}
            className="mt-1 block text-xl"
          />
        </div>
        <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Receita total do mês (com datas futuras)
          </p>
          <Money value={snap.thisMonthIn} className="mt-1 block text-xl" />
        </div>
        <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Despesas do mês (com datas futuras)
          </p>
          <Money value={-snap.thisMonthOut} className="mt-1 block text-xl" />
        </div>
      </div>

      <div className="dash-panel grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-4 font-display text-lg font-bold">Receitas × Despesas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5e0db" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5c736a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5c736a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(v) => fmt(Number(v))}
                  contentStyle={{ borderRadius: 12, border: '1px solid #d5e0db' }}
                />
                <Bar dataKey="receitas" fill="#2f6b5a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" fill="#c46a3a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-4 font-display text-lg font-bold">Evolução do patrimônio</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7cdba8" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#7cdba8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5e0db" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5c736a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5c736a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(v) => fmt(Number(v))}
                  contentStyle={{ borderRadius: 12, border: '1px solid #d5e0db' }}
                />
                <Area type="monotone" dataKey="patrimonio" stroke="#1a4338" fill="url(#pat)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <h3 className="mb-4 font-display text-lg font-bold">Fluxo de caixa mensal</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5e0db" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5c736a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5c736a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(v) => fmt(Number(v))}
                contentStyle={{ borderRadius: 12, border: '1px solid #d5e0db' }}
              />
              <Bar dataKey="saldo" radius={[6, 6, 0, 0]}>
                {chartData.map((row) => (
                  <Cell key={row.name} fill={row.saldo >= 0 ? '#2f6b5a' : '#c46a3a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-display text-lg font-bold">Próximos recebimentos</h3>
          <ul className="space-y-2">
            {nextIn.length === 0 && (
              <li className="text-sm text-[var(--ink-muted)]">Nenhum recebimento projetado.</li>
            )}
            {nextIn.map(({ dateLabel, entry }) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">{entry.label}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{capitalize(dateLabel)}</p>
                </div>
                <Money value={entry.amount} />
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-display text-lg font-bold">Próximos pagamentos</h3>
          <ul className="space-y-2">
            {nextOut.length === 0 && (
              <li className="text-sm text-[var(--ink-muted)]">Nenhuma despesa projetada.</li>
            )}
            {nextOut.map(({ dateLabel, entry }) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">{entry.label}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {capitalize(dateLabel)}
                    {entry.category ? ` · ${entry.category}` : ''}
                  </p>
                </div>
                <Money value={-entry.amount} />
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-display text-lg font-bold">Mensalidades futuras</h3>
          <ul className="space-y-2">
            {monthlyFees.length === 0 && (
              <li className="text-sm text-[var(--ink-muted)]">Nenhuma mensalidade ativa.</li>
            )}
            {monthlyFees.map((f) => (
              <li key={f.name + f.start} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">{f.name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    2/3 de {fmt(f.gross)} · desde {f.start}
                    {f.end ? ` até ${f.end}` : ''}
                  </p>
                </div>
                <Money value={f.amount} />
              </li>
            ))}
          </ul>
          {current && (
            <div className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-muted)]">
              Salário este mês: {fmt(sumByKind(current.incomes, 'salary'))} · Projetos:{' '}
              {fmt(
                sumByKind(current.incomes, 'project_payment') +
                  sumByKind(current.incomes, 'project_monthly'),
              )}
            </div>
          )}
        </div>
      </div>

      <FinanceCalendar />
    </div>
  )
}

function FinanceCalendar() {
  const { projections } = useFinance()
  return (
    <div className="dash-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <h3 className="mb-4 font-display text-lg font-bold">Calendário financeiro</h3>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {projections.map((m) => (
          <div
            key={m.key}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
              {capitalize(m.short)}
            </p>
            <p className="mt-2 text-xs text-[var(--positive)]">+ {fmt(m.totalIncome, true)}</p>
            <p className="text-xs text-[var(--negative)]">− {fmt(m.totalExpense, true)}</p>
            <p
              className={`mt-2 text-sm font-bold tabular-nums ${
                m.balance >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
              }`}
            >
              {fmt(m.balance, true)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
