import { useMemo, useState } from 'react'
import { useFinance } from '../context/FinanceContext'
import { weddingMonthBudgets } from '../lib/projections'
import { buildWeddingSchedule, TAG_COLORS, TAG_LABEL } from '../lib/wedding'
import { fmt } from '../lib/format'
import { Button, Field, Input, Money } from './ui'

export function WeddingPage() {
  const { state, toggleWeddingCheck, isWeddingChecked, setCashBalance } = useFinance()
  const [tab, setTab] = useState<'cronograma' | 'resumo'>('cronograma')
  const [activeMonth, setActiveMonth] = useState(0)
  const [showDeficit, setShowDeficit] = useState(false)
  const [cashDraft, setCashDraft] = useState(String(state.cashBalance?.amount ?? ''))

  const budgets = useMemo(() => weddingMonthBudgets(state), [state])
  const avgBudget =
    budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0
  const cash = state.cashBalance?.amount ?? 0

  const { schedule, deficit, unpaid, totalRemaining } = useMemo(
    () => buildWeddingSchedule(budgets, state.wedding.flexItems),
    [budgets, state.wedding.flexItems],
  )

  const totalSavings = budgets.reduce((s, b) => s + Math.max(0, b), 0)
  const m = schedule[activeMonth] || schedule[0]
  const monthTotal = m?.payments.reduce((s, p) => s + p.amount, 0) || 0
  const paidTotal =
    m?.payments.reduce(
      (s, p) => (isWeddingChecked(m.short, p.name) ? s + p.amount : s),
      0,
    ) || 0
  const accumulated = schedule.map((_, i) =>
    budgets.slice(0, i + 1).reduce((s, b) => s + Math.max(0, b), 0),
  )

  const alreadyPaidTotal = state.wedding.alreadyPaid.reduce((s, i) => s + i.amount, 0)
  const toPayList = [
    ['Salão de Festas', state.wedding.totals.salaRemaining],
    ['Fotógrafo Casamento', state.wedding.totals.fotografo],
    ['Pré-Wedding (dez)', state.wedding.totals.preWedding],
    ['Vestido da Noiva', state.wedding.totals.vestidoTotal],
    ['Dia da Noiva (restante)', state.wedding.totals.diaNoivaRemaining],
    ...state.wedding.flexItems.map((f) => [f.name, f.amount] as const),
    ['Obra banheiro – mão de obra (restante)', state.wedding.totals.obraMaoDeObra],
  ] as [string, number][]

  const saveCash = () => {
    const amount = Number(String(cashDraft).replace(',', '.')) || 0
    setCashBalance({
      amount,
      asOf: state.cashBalance?.asOf || '2026-07-17',
      notes:
        state.cashBalance?.notes ||
        'Saldo disponível após receitas e despesas pessoais',
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="text-center">
        <p className="text-3xl">💒</p>
        <h1 className="font-display text-2xl font-extrabold text-[var(--ink)]">
          Casamento {state.wedding.dateLabel}
        </h1>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Junho → Dezembro · 7 meses · sobra média {fmt(avgBudget, true)}/mês
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="mb-1 text-sm font-bold text-[var(--ink)]">Saldo disponível hoje</p>
        <p className="mb-3 text-xs text-[var(--ink-muted)]">
          O que sobrou na conta em {state.cashBalance?.asOf || '2026-07-17'} — entra no
          orçamento de julho do casamento.
        </p>
        <div className="flex items-end gap-2">
          <Field label="Valor em caixa">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={cashDraft}
              onChange={(e) => setCashDraft(e.target.value)}
            />
          </Field>
          <Button onClick={saveCash} className="mb-0.5 shrink-0">
            Salvar
          </Button>
        </div>
        <div className="mt-3 flex justify-between text-sm font-bold">
          <span>Registrado</span>
          <Money value={cash} />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="mb-2 text-sm font-bold text-[var(--ink)]">Sobra para o casamento</p>
        <p className="text-xs text-[var(--ink-muted)]">
          Em julho: saldo em caixa + o que ainda vai cair (com data) − o que ainda falta
          pagar. Ex.: Power Volts só conta no dia 20.
        </p>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-[var(--ink-muted)]">Saldo em caixa (17/07)</span>
          <Money value={cash} />
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-[var(--ink-muted)]">Média mensal (com caixa)</span>
          <Money value={avgBudget} />
        </div>
        <div className="mt-1 flex justify-between text-sm font-bold">
          <span>Total disponível 7 meses</span>
          <Money value={totalSavings} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-xs text-[var(--ink-muted)]">Sobra/mês</p>
          <p className="text-base font-bold text-[var(--positive)]">{fmt(avgBudget, true)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-xs text-[var(--ink-muted)]">Total 7 meses</p>
          <p className="text-base font-bold text-[var(--positive)]">{fmt(totalSavings, true)}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeficit(!showDeficit)}
          className={`rounded-2xl border p-3 text-center transition active:scale-95 ${
            deficit === 0
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p
            className={`text-xs ${deficit === 0 ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {deficit === 0 ? 'Coberto!' : 'Déficit'}
          </p>
          <p
            className={`text-base font-bold ${
              deficit === 0 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {deficit === 0 ? 'R$ 0' : fmt(deficit, true)}
          </p>
        </button>
      </div>

      {showDeficit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-800">Déficit = o buraco</p>
          <p className="mt-1 text-sm text-amber-800/80">
            Diferença entre o que falta pagar do casamento e o que a sobra dos 7 meses cobre
            nos itens flexíveis.
          </p>
          <div className="mt-3 space-y-1 rounded-xl border border-amber-100 bg-white p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Itens flexíveis + fixos no plano</span>
              <span className="font-bold">{fmt(totalRemaining, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Sobra acumulada (7 meses)</span>
              <span className="font-bold text-[var(--positive)]">
                {fmt(totalSavings, true)}
              </span>
            </div>
            <div className="flex justify-between border-t border-amber-100 pt-1 font-bold">
              <span>Déficit flexível</span>
              <span className={deficit === 0 ? 'text-emerald-600' : 'text-amber-700'}>
                {fmt(deficit, true)}
              </span>
            </div>
          </div>
          {unpaid.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1 text-xs font-bold text-amber-800">Sobram para depois:</p>
              {unpaid.map((u) => (
                <div
                  key={u.name}
                  className="flex justify-between py-0.5 text-xs text-amber-800"
                >
                  <span>{u.name}</span>
                  <span className="font-bold">falta {fmt(u.remaining, true)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-emerald-700">
              Tudo coberto com essa poupança!
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {(
          [
            ['cronograma', 'Cronograma'],
            ['resumo', 'Resumo'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-[var(--ink)] text-white shadow'
                : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'cronograma' && m && (
        <div>
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {schedule.map((s, i) => {
              const monthPaidCount = s.payments.filter((p) =>
                isWeddingChecked(s.short, p.name),
              ).length
              const allDone =
                monthPaidCount === s.payments.length && s.payments.length > 0
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveMonth(i)}
                  className={`relative flex-shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    activeMonth === i
                      ? 'bg-[var(--rose)] text-white shadow'
                      : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]'
                  }`}
                >
                  {allDone && (
                    <span className="absolute -right-1 -top-1 text-[10px]">✓</span>
                  )}
                  {s.emoji} {s.short}
                </button>
              )
            })}
          </div>

          <div className="mb-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-bold text-[var(--ink)]">
                {m.emoji} {m.label}
              </h2>
              <span className="text-sm font-bold text-[var(--rose)]">
                {fmt(monthTotal, true)}
              </span>
            </div>
            <p className="mb-3 text-xs text-[var(--ink-muted)]">
              Orçamento do mês (sobra): {fmt(m.budget, true)}
            </p>

            {paidTotal > 0 && (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-[var(--ink-muted)]">
                  <span>Pago este mês</span>
                  <span className="font-semibold text-[var(--positive)]">
                    {fmt(paidTotal, true)} / {fmt(monthTotal, true)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-2 rounded-full bg-emerald-400 transition-all"
                    style={{
                      width: `${Math.min((paidTotal / Math.max(monthTotal, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              {m.payments.map((p) => {
                const done = isWeddingChecked(m.short, p.name)
                return (
                  <button
                    key={`${m.short}-${p.name}`}
                    type="button"
                    onClick={() => toggleWeddingCheck(m.short, p.name)}
                    className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition active:scale-[0.99] ${
                      done
                        ? 'border border-emerald-200 bg-emerald-50'
                        : 'border border-transparent bg-[var(--surface-2)] hover:border-[var(--line)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {done && <span className="text-xs font-bold">✓</span>}
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          TAG_COLORS[p.tag] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {TAG_LABEL[p.tag] || p.tag}
                      </span>
                      <span
                        className={`truncate text-sm ${
                          done ? 'text-gray-400 line-through' : 'text-[var(--ink)]'
                        }`}
                      >
                        {p.name}
                      </span>
                    </div>
                    <span
                      className={`ml-2 flex-shrink-0 text-sm font-semibold ${
                        done ? 'text-emerald-500' : 'text-[var(--ink)]'
                      }`}
                    >
                      {fmt(p.amount, true)}
                    </span>
                  </button>
                )
              })}
            </div>

            {paidTotal === monthTotal && monthTotal > 0 && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-center">
                <span className="text-sm font-bold text-emerald-700">
                  Mês {m.short} totalmente pago!
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="mb-2 flex justify-between text-xs text-[var(--ink-muted)]">
              <span>Acumulado até {m.short}</span>
              <span className="font-semibold text-[var(--positive)]">
                {fmt(accumulated[activeMonth] || 0, true)}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-[var(--surface-2)]">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-[var(--rose)] to-pink-400 transition-all"
                style={{
                  width: `${
                    totalSavings > 0
                      ? Math.min(
                          ((accumulated[activeMonth] || 0) / totalSavings) * 100,
                          100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-[var(--ink-faint)]">
              <span>Jun</span>
              <span>
                {totalSavings > 0
                  ? Math.round(((accumulated[activeMonth] || 0) / totalSavings) * 100)
                  : 0}
                %
              </span>
              <span>Dez — {fmt(totalSavings, true)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'resumo' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-3 font-bold text-[var(--ink)]">Já pago</p>
            {state.wedding.alreadyPaid.map((item) => (
              <div key={item.name} className="flex justify-between py-1 text-sm">
                <span className="text-[var(--ink-muted)]">{item.name}</span>
                <span className="font-semibold text-[var(--positive)]">
                  {fmt(item.amount, true)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-[var(--line)] pt-2 text-sm font-bold">
              <span>Total pago</span>
              <span className="text-[var(--positive)]">{fmt(alreadyPaidTotal, true)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-3 font-bold text-[var(--ink)]">Total a pagar</p>
            {toPayList.map(([n, v]) => (
              <div
                key={n}
                className="flex justify-between border-b border-[var(--surface-2)] py-1 text-sm last:border-0"
              >
                <span className="text-[var(--ink-muted)]">{n}</span>
                <span className="font-semibold">{fmt(v, true)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-[var(--line)] pt-2 text-sm font-bold">
              <span>Total restante</span>
              <span>{fmt(toPayList.reduce((s, [, v]) => s + v, 0), true)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
