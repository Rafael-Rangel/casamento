import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useFinance } from '../context/FinanceContext'
import { buildMonthPlan, type MonthObligation } from '../lib/monthPlan'
import { fmt } from '../lib/format'
import { Money } from './ui'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ItemRow({ item }: { item: MonthObligation }) {
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
            {item.paid ? 'Feito' : item.direction === 'in' ? 'A receber' : 'A pagar'}
          </span>
          <span className={`font-semibold ${item.paid ? 'text-[var(--ink-muted)] line-through' : 'text-[var(--ink)]'}`}>
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
  const [showPaid, setShowPaid] = useState(false)

  const upcomingDays = plan.daily.filter((d) => {
    if (d.isPast && !d.isToday) {
      const hasUnpaid = [...d.receive, ...d.pay].some((i) => !i.paid)
      return showPaid || hasUnpaid
    }
    return true
  })

  const payQueue = [
    ...plan.lifeItems.filter((i) => !i.paid),
    ...plan.weddingItems.filter((i) => !i.paid),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const receiveQueue = plan.incomeItems
    .filter((i) => !i.paid)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Seu mês em uma tela
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[var(--ink)]">
          {capitalize(plan.monthLabel)}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Hoje {format(today, "d 'de' MMMM", { locale: ptBR })} · projetos entram nas datas
          certas · você vê o que pagar e o que sobra pra você.
        </p>
      </header>

      {/* Resposta principal */}
      <section className="overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--ink)] p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Depois de pagar tudo deste mês, sobra pra você
        </p>
        <p
          className={`mt-2 font-display text-4xl font-extrabold tabular-nums ${
            plan.leftoverForMe >= 0 ? 'text-[#7cdba8]' : 'text-[#f2b6c8]'
          }`}
        >
          {fmt(plan.leftoverForMe)}
        </p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Caixa agora</p>
            <p className="font-bold">{fmt(plan.cashNow)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/50">+ Entra no mês</p>
            <p className="font-bold text-[#7cdba8]">{fmt(plan.incomeTotal)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/50">− Precisa pagar</p>
            <p className="font-bold text-[#f2b6c8]">{fmt(plan.mustPayTotal)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/55">
          Daqui pra frente (ainda não recebido − ainda não pago):{' '}
          <span className="font-semibold text-white">{fmt(plan.leftoverFromNow)}</span>
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Entra no mês
          </p>
          <Money value={plan.incomeTotal} className="mt-1 block text-xl" />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Já: {fmt(plan.incomeReceived)} · Falta: {fmt(plan.incomePending)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Pagar no mês
          </p>
          <Money value={-plan.mustPayTotal} className="mt-1 block text-xl" />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Vida {fmt(plan.lifeTotal)} · Casamento {fmt(plan.weddingTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Ainda falta pagar
          </p>
          <Money value={-plan.mustPayPending} className="mt-1 block text-xl" />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Vida {fmt(plan.lifePending)} · Casamento {fmt(plan.weddingPending)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="font-display text-lg font-bold">Ainda vai entrar</h2>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Só conta na data (ex.: Power Volts dia 20).
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
          <h2 className="font-display text-lg font-bold">O que você deve ir pagando</h2>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Vida/cartão + casamento, na ordem sugerida por dia.
          </p>
          {payQueue.length === 0 ? (
            <p className="text-sm text-[var(--positive)]">Tudo do mês já está quitado.</p>
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
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold">Agenda do mês</h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Dia a dia: o que recebe e o que deve pagar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPaid((v) => !v)}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)]"
          >
            {showPaid ? 'Ocultar dias passados' : 'Mostrar dias passados'}
          </button>
        </div>

        {upcomingDays.map((day) => (
          <div
            key={day.date}
            className={`rounded-2xl border p-4 ${
              day.isToday
                ? 'border-[var(--rose)] bg-[var(--accent-soft)]/50'
                : 'border-[var(--line)] bg-[var(--surface)]'
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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

            {day.receive.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--positive)]">
                  Receber
                </p>
                <ul className="space-y-1.5">
                  {day.receive.map((i) => (
                    <ItemRow key={i.id} item={i} />
                  ))}
                </ul>
              </div>
            )}

            {day.pay.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--negative)]">
                  Pagar
                </p>
                <ul className="space-y-1.5">
                  {day.pay.map((i) => (
                    <ItemRow key={i.id} item={i} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
