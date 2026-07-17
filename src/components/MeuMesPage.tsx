import { useMemo } from 'react'
import { format } from 'date-fns'
import { useFinance } from '../context/FinanceContext'
import { buildMonthPlan, type MonthObligation } from '../lib/monthPlan'
import { fmt } from '../lib/format'
import { Money } from './ui'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ItemRow({ item }: { item: MonthObligation }) {
  const badge = item.paid
    ? 'Na data'
    : item.direction === 'in'
      ? 'A receber'
      : 'A pagar'
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              item.paid
                ? 'bg-emerald-100 text-emerald-800'
                : item.direction === 'in'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-amber-100 text-amber-800'
            }`}
          >
            {badge}
          </span>
          <span
            className={`font-semibold ${
              item.paid ? 'text-[var(--ink-muted)] line-through' : 'text-[var(--ink)]'
            }`}
          >
            {item.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
          {format(new Date(item.date + 'T12:00:00'), 'dd/MM')} · {item.meta}
        </p>
      </div>
      <Money
        value={item.direction === 'in' ? item.amount : -item.amount}
        className="shrink-0"
      />
    </li>
  )
}

export function MeuMesPage() {
  const { state } = useFinance()
  const today = useMemo(() => new Date(), [])
  const plan = useMemo(() => buildMonthPlan(state, today), [state, today])

  const payQueue = [
    ...plan.lifeItems.filter((i) => !i.paid),
    ...plan.weddingItems.filter((i) => !i.paid),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  const receiveQueue = plan.incomeItems
    .filter((i) => !i.paid)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  const nextDays = plan.daily
    .filter((d) => d.isToday || d.isFuture)
    .filter((d) => d.receive.length > 0 || d.pay.length > 0)
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Visão do mês
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[var(--ink)]">
          {capitalize(plan.monthLabel)}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Recebemos (salários + projetos) − gastos do casamento = sobra para vida e cartão.
        </p>
      </header>

      <section className="overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--ink)] p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Sobra para vida e cartão
        </p>
        <p
          className={`mt-2 font-display text-4xl font-extrabold tabular-nums ${
            plan.leftoverForLife >= 0 ? 'text-[#7cdba8]' : 'text-[#f2b6c8]'
          }`}
        >
          {fmt(plan.leftoverForLife)}
        </p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Recebemos</p>
            <p className="font-bold text-[#7cdba8]">{fmt(plan.incomeTotal)}</p>
            <p className="mt-0.5 text-[10px] text-white/45">
              Já {fmt(plan.incomeReceived)} · falta {fmt(plan.incomePending)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/50">
              − Casamento do mês
            </p>
            <p className="font-bold text-[#f2b6c8]">{fmt(plan.weddingTotal)}</p>
            <p className="mt-0.5 text-[10px] text-white/45">
              Falta pagar {fmt(plan.weddingPending)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/55">
          Vida e cartão já lançados: {fmt(plan.lifeTotal)} · depois disso sobra livre{' '}
          <span
            className={`font-bold ${
              plan.leftoverAfterLife >= 0 ? 'text-[#7cdba8]' : 'text-[#f2b6c8]'
            }`}
          >
            {fmt(plan.leftoverAfterLife)}
          </span>
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Casamento por categoria</h2>
            <p className="text-xs text-[var(--ink-muted)]">Onde o dinheiro do mês vai</p>
          </div>
          <Money value={-plan.weddingTotal} />
        </div>
        {plan.weddingByCategory.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">Nada do casamento neste mês.</p>
        ) : (
          <ul className="space-y-2">
            {plan.weddingByCategory.map((c) => {
              const pct = plan.weddingTotal > 0 ? (c.total / plan.weddingTotal) * 100 : 0
              return (
                <li key={c.tag}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--ink)]">{c.label}</span>
                    <span className="tabular-nums text-[var(--ink)]">{fmt(c.total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-2 rounded-full bg-[var(--rose)]"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  {c.pending > 0 && (
                    <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">
                      Falta pagar {fmt(c.pending)}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="font-display text-lg font-bold">Ainda vai entrar</h2>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Conta só na data (salário, parcela, mensalidade 2/3).
          </p>
          {receiveQueue.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">Nada pendente de entrada este mês.</p>
          ) : (
            <ul className="space-y-2">
              {receiveQueue.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="font-display text-lg font-bold">Próximos a pagar</h2>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Casamento + vida/cartão, na ordem do mês.
          </p>
          {payQueue.length === 0 ? (
            <p className="text-sm text-[var(--positive)]">Tudo do mês já passou da data.</p>
          ) : (
            <ul className="space-y-2">
              {payQueue.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-bold">Próximos dias</h2>
          <p className="text-xs text-[var(--ink-muted)]">
            Resumo rápido · dia a dia completo na aba Agenda.
          </p>
        </div>

        {nextDays.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--ink-muted)]">
            Sem lançamentos futuros neste mês.
          </p>
        ) : (
          nextDays.map((day) => (
            <div
              key={day.date}
              className={`rounded-2xl border p-4 ${
                day.isToday
                  ? 'border-[var(--rose)] bg-[var(--accent-soft)]/50'
                  : 'border-[var(--line)] bg-[var(--surface)]'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold capitalize">
                      {capitalize(day.weekday)}
                    </h3>
                    {day.isToday && (
                      <span className="rounded-full bg-[var(--rose)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Hoje
                      </span>
                    )}
                  </div>
                  <p className="text-xs capitalize text-[var(--ink-muted)]">{day.label}</p>
                </div>
                <div className="text-right text-xs font-semibold">
                  {day.receiveTotal > 0 && (
                    <p className="text-[var(--positive)]">+ {fmt(day.receiveTotal)}</p>
                  )}
                  {day.payTotal > 0 && (
                    <p className="text-[var(--negative)]">− {fmt(day.payTotal)}</p>
                  )}
                </div>
              </div>
              <ul className="space-y-1.5">
                {[...day.receive, ...day.pay].map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
