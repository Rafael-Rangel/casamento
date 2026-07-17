import { useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useFinance } from '../context/FinanceContext'
import {
  buildDayAgenda,
  capitalizeWeekday,
  cashflowSnapshot,
  type AgendaEvent,
} from '../lib/agenda'
import { buildMonthPlan } from '../lib/monthPlan'
import { fmt } from '../lib/format'
import { Money } from './ui'

const KIND_LABEL: Record<AgendaEvent['kind'], string> = {
  salary: 'Salário',
  project_payment: 'Projeto',
  project_monthly: 'Mensalidade',
  other_income: 'Receita',
  expense: 'Vida/cartão',
}

function monthsUntilWeddingEnd(today: Date) {
  const end = new Date(2026, 11, 1) // dez/2026
  const months =
    (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth())
  return Math.max(0, months)
}

export function AgendaPage() {
  const { state } = useFinance()
  const today = useMemo(() => new Date(), [])
  const untilDec = monthsUntilWeddingEnd(today)
  const [monthsAhead, setMonthsAhead] = useState(Math.min(2, untilDec || 2))
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'upcoming'>('upcoming')

  const from = startOfMonth(today)
  const to = endOfMonth(addMonths(today, monthsAhead))

  const days = useMemo(
    () => buildDayAgenda(state, from, to, today),
    [state, from, to, today],
  )

  const snap = useMemo(
    () => cashflowSnapshot(state, today, monthsAhead),
    [state, today, monthsAhead],
  )
  const plan = useMemo(() => buildMonthPlan(state, today), [state, today])

  const visibleDays = days.filter((d) => {
    if (filter === 'upcoming') return d.isToday || d.isFuture
    if (filter === 'in') return d.events.some((e) => e.direction === 'in')
    if (filter === 'out') return d.events.some((e) => e.direction === 'out')
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Dia a dia
          </p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Agenda</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })} · o que cai e o que pagar em
            cada data.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          Horizonte
          <select
            value={monthsAhead}
            onChange={(e) => setMonthsAhead(Number(e.target.value))}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
          >
            <option value={0}>Só este mês</option>
            <option value={1}>Este + 1 mês</option>
            <option value={2}>Este + 2 meses</option>
            {untilDec > 2 && <option value={untilDec}>Até dezembro</option>}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Recebemos (mês)
          </p>
          <Money value={plan.incomeTotal} className="mt-1 block text-2xl" />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Já {fmt(plan.incomeReceived)} · falta {fmt(plan.incomePending)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Casamento a pagar
          </p>
          <Money value={-plan.weddingPending} className="mt-1 block text-2xl" />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Total do mês {fmt(plan.weddingTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Vida/cartão a pagar
          </p>
          <Money value={-plan.lifePending} className="mt-1 block text-2xl" />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Já lançado no mês {fmt(plan.lifeTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Sobra p/ vida e cartão
          </p>
          <Money value={plan.leftoverForLife} className="mt-1 block text-2xl" />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Recebemos − casamento do mês
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-display text-lg font-bold">Próximos recebimentos</h3>
          {snap.nextIncomes.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">Nada pendente no horizonte.</p>
          ) : (
            <ul className="space-y-2">
              {snap.nextIncomes.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)]">{e.label}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {format(new Date(e.date + 'T12:00:00'), "dd/MM · EEE", { locale: ptBR })} ·{' '}
                      {e.meta}
                    </p>
                  </div>
                  <Money value={e.amount} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-display text-lg font-bold">Próximos pagamentos (vida)</h3>
          {snap.nextExpenses.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">Nenhuma despesa futura no horizonte.</p>
          ) : (
            <ul className="space-y-2">
              {snap.nextExpenses.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)]">{e.label}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {format(new Date(e.date + 'T12:00:00'), "dd/MM · EEE", { locale: ptBR })} ·{' '}
                      {e.meta}
                    </p>
                  </div>
                  <Money value={-e.amount} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['upcoming', 'A partir de hoje'],
            ['all', 'Todos os dias'],
            ['in', 'Só entradas'],
            ['out', 'Só saídas'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === id
                ? 'bg-[var(--ink)] text-white'
                : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleDays.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-muted)]">
            Nenhum lançamento neste filtro.
          </div>
        )}

        {visibleDays.map((day) => {
          const events =
            filter === 'in'
              ? day.events.filter((e) => e.direction === 'in')
              : filter === 'out'
                ? day.events.filter((e) => e.direction === 'out')
                : day.events

          if (events.length === 0 && !day.isToday) return null

          const futureBadge =
            day.isFuture && events.some((e) => e.direction === 'in') && events.some((e) => e.direction === 'out')
              ? 'Entradas e saídas'
              : day.isFuture && events.some((e) => e.direction === 'in')
                ? 'A receber'
                : day.isFuture && events.some((e) => e.direction === 'out')
                  ? 'A pagar'
                  : day.isFuture
                    ? 'Futuro'
                    : null

          return (
            <section
              key={day.date}
              className={`rounded-2xl border p-4 ${
                day.isToday
                  ? 'border-[var(--rose)] bg-[var(--accent-soft)]/40'
                  : 'border-[var(--line)] bg-[var(--surface)]'
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold capitalize text-[var(--ink)]">
                      {capitalizeWeekday(day.weekday)}
                    </h2>
                    {day.isToday && (
                      <span className="rounded-full bg-[var(--rose)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Hoje
                      </span>
                    )}
                    {day.isPast && !day.isToday && (
                      <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ink-muted)]">
                        Já passou
                      </span>
                    )}
                    {futureBadge && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                        {futureBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs capitalize text-[var(--ink-muted)]">{day.label}</p>
                </div>
                <div className="text-right text-xs">
                  {day.totalIn > 0 && (
                    <p className="font-semibold text-[var(--positive)]">+ {fmt(day.totalIn)}</p>
                  )}
                  {day.totalOut > 0 && (
                    <p className="font-semibold text-[var(--negative)]">− {fmt(day.totalOut)}</p>
                  )}
                </div>
              </div>

              {events.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">Sem lançamentos neste dia.</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2 ${
                        day.isPast || day.isToday
                          ? e.direction === 'in'
                            ? 'bg-emerald-50'
                            : 'bg-orange-50'
                          : 'bg-[var(--surface-2)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              e.direction === 'in'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {KIND_LABEL[e.kind]}
                          </span>
                          <span className="text-sm font-semibold text-[var(--ink)]">{e.label}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{e.meta}</p>
                      </div>
                      <Money
                        value={e.direction === 'in' ? e.amount : -e.amount}
                        className="shrink-0 text-sm"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
