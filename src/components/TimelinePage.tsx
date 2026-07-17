import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useFinance } from '../context/FinanceContext'
import { capitalize } from '../lib/format'
import { Money, Select } from './ui'
import type { MonthEntry } from '../types/finance'

gsap.registerPlugin(useGSAP)

const KIND_STYLE: Record<MonthEntry['kind'], string> = {
  salary: 'bg-emerald-50 text-emerald-800',
  project_payment: 'bg-sky-50 text-sky-800',
  project_monthly: 'bg-teal-50 text-teal-800',
  other_income: 'bg-lime-50 text-lime-800',
  expense: 'bg-orange-50 text-orange-800',
}

const KIND_LABEL: Record<MonthEntry['kind'], string> = {
  salary: 'Salário',
  project_payment: 'Projeto',
  project_monthly: 'Mensalidade',
  other_income: 'Receita',
  expense: 'Gasto',
}

export function TimelinePage() {
  const { projections, state, setProjectionMonths } = useFinance()
  const [expanded, setExpanded] = useState<string | null>(projections[0]?.key ?? null)
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.from('.tl-month', {
        y: 20,
        opacity: 0,
        duration: 0.45,
        stagger: 0.05,
        ease: 'power2.out',
      })
    },
    { scope: root, dependencies: [projections.length] },
  )

  return (
    <div ref={root} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Linha do tempo</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Visão mensal: recebemos, vida/cartão e quanto sobra para o plano do casamento.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          Horizonte
          <Select
            value={state.projectionMonths}
            onChange={(e) => setProjectionMonths(Number(e.target.value))}
            className="w-28"
          >
            {[6, 12, 18, 24, 36].map((n) => (
              <option key={n} value={n}>
                {n} meses
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="relative space-y-4 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-px before:bg-[var(--line)] sm:before:left-[15px]">
        {projections.map((m) => {
          const open = expanded === m.key
          return (
            <div key={m.key} className="tl-month relative pl-8 sm:pl-10">
              <span
                className={`absolute left-0 top-5 h-6 w-6 rounded-full border-2 border-[var(--surface)] ${
                  m.balance >= 0 ? 'bg-[var(--accent)]' : 'bg-[var(--negative)]'
                }`}
              />
              <button
                type="button"
                onClick={() => setExpanded(open ? null : m.key)}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--accent)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold capitalize">{m.label}</h2>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {m.incomes.length} entradas · {m.expenses.length} saídas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--ink-muted)]">Orçamento p/ casamento</p>
                    <Money value={m.weddingBudget} className="text-lg" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-[var(--surface-2)] p-2">
                    <p className="text-[var(--ink-muted)]">Recebemos</p>
                    <Money value={m.totalIncome} className="text-sm" />
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)] p-2">
                    <p className="text-[var(--ink-muted)]">Vida/cartão</p>
                    <Money value={-m.lifeExpense} className="text-sm" />
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)] p-2">
                    <p className="text-[var(--ink-muted)]">Saldo do mês</p>
                    <Money value={m.balance} className="text-sm" />
                  </div>
                </div>
              </button>

              {open && (
                <div className="mt-2 space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/80 p-4">
                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                      Entradas
                    </h3>
                    {m.incomes.length === 0 && (
                      <p className="text-sm text-[var(--ink-faint)]">Sem entradas neste mês.</p>
                    )}
                    <ul className="space-y-1.5">
                      {m.incomes.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_STYLE[e.kind]}`}
                            >
                              {KIND_LABEL[e.kind]}
                            </span>
                            <span className="truncate">
                              {e.label}
                              {e.meta ? (
                                <span className="text-[var(--ink-muted)]"> · {e.meta}</span>
                              ) : null}
                            </span>
                          </div>
                          <Money value={e.amount} />
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                      Gastos
                    </h3>
                    {m.expenses.length === 0 && (
                      <p className="text-sm text-[var(--ink-faint)]">Sem gastos neste mês.</p>
                    )}
                    <ul className="space-y-1.5">
                      {m.expenses.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_STYLE[e.kind]}`}
                            >
                              {e.category || KIND_LABEL[e.kind]}
                            </span>
                            <span className="truncate">
                              {e.label}
                              {e.meta ? (
                                <span className="text-[var(--ink-muted)]"> · {e.meta}</span>
                              ) : null}
                            </span>
                          </div>
                          <Money value={-e.amount} />
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="flex justify-between border-t border-[var(--line)] pt-3 text-sm font-bold">
                    <span>Saldo {capitalize(m.short)}</span>
                    <Money value={m.balance} />
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Orçamento disponível para o cronograma do casamento:{' '}
                    <Money value={Math.max(0, m.weddingBudget)} className="text-xs" />
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
