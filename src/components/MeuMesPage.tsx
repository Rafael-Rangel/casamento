import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useFinance } from '../context/FinanceContext'
import { buildMonthPlan, type MonthObligation } from '../lib/monthPlan'
import { fmt } from '../lib/format'
import { Money } from './ui'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ItemRow({ item }: { item: MonthObligation }) {
  const isWedding = item.source === 'wedding'
  const badge = item.paid
    ? isWedding
      ? 'Pago'
      : 'Na data'
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
                ? 'bg-emerald-500/15 text-emerald-300'
                : item.direction === 'in'
                  ? 'bg-sky-500/15 text-sky-300'
                  : 'bg-amber-500/15 text-amber-300'
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
          {isWedding
            ? item.meta
            : `${format(new Date(item.date + 'T12:00:00'), 'dd/MM')} · ${item.meta}`}
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
  const { state, setCashBalance } = useFinance()
  const plan = useMemo(() => buildMonthPlan(state), [state])
  const [editingCash, setEditingCash] = useState(false)
  const [cashDraft, setCashDraft] = useState('')

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
            Conta − casamento do mês = sobra pra viver. Marcar ✓ no casamento sobe a sobra.
          </p>
      </header>

      <section className="overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-gradient-to-br from-[#2c2019] via-[#1b232b] to-[#1a2c35] p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Sobra para vida e cartão
        </p>
        <p className="mt-1 text-[11px] text-white/45">
          Se pagar tudo do casamento deste mês com o que tem agora
        </p>
        <p
          className={`mt-2 font-display text-4xl font-extrabold tabular-nums ${
            plan.leftoverForLife >= 0 ? 'text-[#7bd3a0]' : 'text-[#ef9d86]'
          }`}
        >
          {fmt(plan.leftoverForLife)}
        </p>
        <p className="mt-1 text-[11px] text-white/40">
          {fmt(plan.cashNow)} − {fmt(plan.weddingPending)} casamento
        </p>

        <div className="mt-4 space-y-2">
          <div className="rounded-xl bg-white/10 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Valor na conta</p>
            {editingCash ? (
              <form
                className="mt-1 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const amount = Number(cashDraft.replace(',', '.'))
                  if (!Number.isFinite(amount)) return
                  setCashBalance({
                    amount,
                    asOf: format(new Date(), 'yyyy-MM-dd'),
                    notes: 'Saldo atualizado manualmente',
                  })
                  setEditingCash(false)
                }}
              >
                <input
                  autoFocus
                  inputMode="decimal"
                  value={cashDraft}
                  onChange={(e) => setCashDraft(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/30 px-2 py-1 text-sm font-bold text-white outline-none"
                />
                <button type="submit" className="text-[10px] font-bold text-[#7bd3a0]">
                  OK
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  setCashDraft(String(plan.cashNow))
                  setEditingCash(true)
                }}
              >
                <p className="mt-0.5 font-display text-2xl font-bold text-white">
                  {fmt(plan.cashNow)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  Tudo que já entrou − o que já saiu · toque para editar
                </p>
              </button>
            )}
          </div>

          <div className="rounded-xl bg-white/10 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Recebimentos do mês</p>
            <p className="mt-0.5 text-sm font-bold text-white">
              <span className="text-[#7bd3a0]">Total {fmt(plan.incomeTotal)}</span>
              <span className="mx-1.5 font-normal text-white/35">·</span>
              <span className="text-[#ef9d86]">falta {fmt(plan.incomePending)}</span>
            </p>
            <p className="mt-0.5 text-[10px] text-white/40">
              Já recebido {fmt(plan.incomeReceived)} · falta entrar para fechar o total
            </p>
          </div>
        </div>

        {plan.lifePending > 0 && (
          <p className="mt-3 text-xs text-white/55">
            Depois da vida/cartão pendente ({fmt(plan.lifePending)}), sobra{' '}
            <span
              className={`font-bold ${
                plan.leftoverAfterLife >= 0 ? 'text-[#7bd3a0]' : 'text-[#ef9d86]'
              }`}
            >
              {fmt(plan.leftoverAfterLife)}
            </span>
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Casamento por categoria</h2>
            <p className="text-xs text-[var(--ink-muted)]">O que ainda falta pagar</p>
          </div>
          <Money value={-plan.weddingPending} />
        </div>
        {plan.weddingByCategory.filter((c) => c.pending > 0).length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">Nada pendente do casamento neste mês.</p>
        ) : (
          <ul className="space-y-2">
            {plan.weddingByCategory
              .filter((c) => c.pending > 0)
              .map((c) => {
              const pct =
                plan.weddingPending > 0 ? (c.pending / plan.weddingPending) * 100 : 0
              return (
                <li key={c.tag}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--ink)]">{c.label}</span>
                    <span className="tabular-nums text-[var(--ink)]">{fmt(c.pending)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-2 rounded-full bg-[var(--rose)]"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
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
