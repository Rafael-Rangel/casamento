import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import { weddingMonthBudgets } from '../lib/projections'
import { buildWeddingSchedule, TAG_COLORS, TAG_LABEL, activeFlexItems } from '../lib/wedding'
import { fmt, uid } from '../lib/format'
import type { WeddingFlexItem } from '../types/finance'
import { Button, Field, Input, Modal, Money, Select } from './ui'

const TAG_OPTIONS = Object.keys(TAG_LABEL)

function blankFlex(): WeddingFlexItem {
  return { id: uid(), name: '', amount: 0, tag: 'casamento' }
}

export function WeddingPage() {
  const { state, toggleWeddingCheck, isWeddingChecked, updateWedding } = useFinance()
  const [tab, setTab] = useState<'cronograma' | 'resumo'>('cronograma')
  const [activeMonth, setActiveMonth] = useState(0)
  const [showDeficit, setShowDeficit] = useState(false)
  const [showPaid, setShowPaid] = useState(false)
  const [flexOpen, setFlexOpen] = useState(false)
  const [flexForm, setFlexForm] = useState<WeddingFlexItem>(blankFlex())

  const budgets = useMemo(() => weddingMonthBudgets(state), [state])
  const avgBudget =
    budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0
  const monthCount = budgets.length

  const { schedule, unpaid, totalRemaining, deferred } = useMemo(
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
  /** Valor em destaque: cai a cada check */
  const stillToPay = monthTotal - paidTotal
  /** Quanto falta ganhar a mais só para o que ainda não foi marcado */
  const needMoreForPending = Math.max(0, stillToPay - (m?.budget ?? 0))
  const accumulated = schedule.map((_, i) =>
    budgets.slice(0, i + 1).reduce((s, b) => s + Math.max(0, b), 0),
  )

  const visiblePayments =
    m?.payments.filter((p) => showPaid || !isWeddingChecked(m.short, p.name)) || []
  const hiddenPaidCount = (m?.payments.length || 0) - visiblePayments.length

  /** Déficit do plano inteiro, mas só com o que ainda falta marcar em todos os meses */
  const stillNeedAcrossMonths = schedule.reduce((sum, month) => {
    const pending = month.payments
      .filter((p) => !isWeddingChecked(month.short, p.name))
      .reduce((s, p) => s + p.amount, 0)
    return sum + Math.max(0, pending - month.budget)
  }, 0)

  const alreadyPaidTotal = state.wedding.alreadyPaid.reduce((s, i) => s + i.amount, 0)
  const fixedToPay = [
    ['Salão de Festas', state.wedding.totals.salaRemaining],
    ['Fotógrafo Casamento', state.wedding.totals.fotografo],
    ['Pré-Wedding (dez)', state.wedding.totals.preWedding],
    ['Vestido da Noiva', state.wedding.totals.vestidoTotal],
    ['Dia da Noiva (restante)', state.wedding.totals.diaNoivaRemaining],
    ['Obra banheiro – mão de obra (restante)', state.wedding.totals.obraMaoDeObra],
  ] as [string, number][]

  const saveFlex = () => {
    if (!flexForm.name.trim() || flexForm.amount <= 0) return
    const items = state.wedding.flexItems
    const exists = items.some((x) => x.id === flexForm.id)
    updateWedding({
      flexItems: exists
        ? items.map((x) => (x.id === flexForm.id ? flexForm : x))
        : [...items, flexForm],
    })
    setFlexOpen(false)
  }

  const removeFlex = (id: string) => {
    if (!confirm('Excluir este item do casamento?')) return
    updateWedding({
      flexItems: state.wedding.flexItems.filter((x) => x.id !== id),
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="text-center">
        <h1 className="font-display text-2xl font-extrabold text-[var(--ink)]">
          Casamento {state.wedding.dateLabel}
        </h1>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Marque o que pagou · edite itens · tudo salva neste aparelho
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="mb-2 text-sm font-bold text-[var(--ink)]">Orçamento para o plano</p>
        <p className="text-xs text-[var(--ink-muted)]">
          Dinheiro disponível para cobrir o cronograma (receitas − vida/cartão). A “sobra
          para vida” fica em Meu mês.
        </p>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-[var(--ink-muted)]">Disponível em {m?.short || 'Jul'}</span>
          <Money value={m?.budget ?? 0} />
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-[var(--ink-muted)]">Média mensal</span>
          <Money value={avgBudget} />
        </div>
        <div className="mt-1 flex justify-between text-sm font-bold">
          <span>Total {monthCount} meses</span>
          <Money value={totalSavings} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-xs text-[var(--ink-muted)]">Budget/mês</p>
          <p className="text-base font-bold text-[var(--positive)]">{fmt(avgBudget, true)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-xs text-[var(--ink-muted)]">Total plano</p>
          <p className="text-base font-bold text-[var(--positive)]">{fmt(totalSavings, true)}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeficit(!showDeficit)}
          className={`rounded-2xl border p-3 text-center transition active:scale-95 ${
            stillNeedAcrossMonths === 0
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <p
            className={`text-xs ${
              stillNeedAcrossMonths === 0 ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {stillNeedAcrossMonths === 0 ? 'Coberto!' : 'Falta ganhar'}
          </p>
          <p
            className={`text-base font-bold ${
              stillNeedAcrossMonths === 0 ? 'text-emerald-200' : 'text-amber-200'
            }`}
          >
            {stillNeedAcrossMonths === 0 ? 'R$ 0' : fmt(stillNeedAcrossMonths, true)}
          </p>
        </button>
      </div>

      {showDeficit && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="font-bold text-amber-200">Quanto falta ganhar a mais</p>
          <p className="mt-1 text-sm text-amber-100/80">
            Soma dos meses em que o que ainda falta pagar (sem check) passa do orçamento.
            Conforme você marca ✓, esse número cai.
          </p>
          <div className="mt-3 space-y-1 rounded-xl border border-amber-500/20 bg-[var(--surface-2)] p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Itens no plano</span>
              <span className="font-bold">{fmt(totalRemaining, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Orçamento acumulado</span>
              <span className="font-bold text-[var(--positive)]">
                {fmt(totalSavings, true)}
              </span>
            </div>
            <div className="flex justify-between border-t border-amber-500/20 pt-1 font-bold">
              <span>Ainda precisa ganhar a mais</span>
              <span
                className={
                  stillNeedAcrossMonths === 0 ? 'text-emerald-300' : 'text-amber-300'
                }
              >
                {fmt(stillNeedAcrossMonths, true)}
              </span>
            </div>
          </div>
          {unpaid.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1 text-xs font-bold text-amber-200">Ainda não encaixados:</p>
              {unpaid.map((u) => (
                <div
                  key={u.name}
                  className="flex justify-between py-0.5 text-xs text-amber-100/90"
                >
                  <span>{u.name}</span>
                  <span className="font-bold">falta {fmt(u.remaining, true)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-emerald-300">
              Tudo coberto com esse orçamento!
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {(
          [
            ['cronograma', 'Cronograma'],
            ['resumo', 'Itens & resumo'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-[var(--rose)] text-white shadow'
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
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Ainda a pagar
                </p>
                <span className="text-sm font-bold text-[var(--rose)]">
                  {fmt(stillToPay, true)}
                </span>
              </div>
            </div>
            <p className="mb-3 text-xs text-[var(--ink-muted)]">
              Receita do plano: {fmt(m.budget, true)} · plano cheio {fmt(monthTotal, true)} ·
              já marcado {fmt(paidTotal, true)}
              {needMoreForPending > 0 ? (
                <span className="mt-1 block font-semibold text-[var(--negative)]">
                  Para o que ainda falta, precisa ganhar a mais: {fmt(needMoreForPending, true)}
                </span>
              ) : stillToPay > 0 ? (
                <span className="mt-1 block font-semibold text-[var(--positive)]">
                  Orçamento cobre o que ainda falta neste mês
                </span>
              ) : (
                <span className="mt-1 block font-semibold text-[var(--positive)]">
                  Nada pendente neste mês
                </span>
              )}
            </p>

            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="h-2 flex-1 rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-2 rounded-full bg-emerald-400 transition-all"
                  style={{
                    width: `${Math.min((paidTotal / Math.max(monthTotal, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPaid((v) => !v)}
                className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ink-muted)]"
              >
                {showPaid ? 'Ocultar pagos' : `Ver pagos (${hiddenPaidCount})`}
              </button>
            </div>

            <div className="space-y-2">
              {visiblePayments.length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--positive)]">
                  Tudo deste mês já foi marcado como pago.
                </p>
              ) : (
                visiblePayments.map((p) => {
                  const done = isWeddingChecked(m.short, p.name)
                  return (
                    <button
                      key={`${m.short}-${p.name}`}
                      type="button"
                      onClick={() => toggleWeddingCheck(m.short, p.name)}
                      className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition active:scale-[0.99] ${
                        done
                          ? 'border border-emerald-500/30 bg-emerald-500/10'
                          : 'border border-transparent bg-[var(--surface-2)] hover:border-[var(--line)]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            done
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-[var(--ink-faint)]'
                          }`}
                        >
                          {done && <span className="text-xs font-bold">✓</span>}
                        </div>
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
                            TAG_COLORS[p.tag] || 'bg-white/10 text-[var(--ink-soft)]'
                          }`}
                        >
                          {TAG_LABEL[p.tag] || p.tag}
                        </span>
                        <span
                          className={`truncate text-sm ${
                            done ? 'text-[var(--ink-muted)] line-through' : 'text-[var(--ink)]'
                          }`}
                        >
                          {p.name}
                        </span>
                      </div>
                      <span
                        className={`ml-2 flex-shrink-0 text-sm font-semibold ${
                          done ? 'text-emerald-300' : 'text-[var(--ink)]'
                        }`}
                      >
                        {fmt(p.amount, true)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {stillToPay === 0 && monthTotal > 0 && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-center">
                <span className="text-sm font-bold text-emerald-300">
                  Mês {m.short} totalmente quitado!
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="mb-2 flex justify-between text-xs text-[var(--ink-muted)]">
              <span>Orçamento acumulado até {m.short}</span>
              <span className="font-semibold text-[var(--positive)]">
                {fmt(accumulated[activeMonth] || 0, true)}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-[var(--surface-2)]">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-[var(--rose)] to-[var(--accent)] transition-all"
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
              <span>Jul</span>
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-[var(--ink)]">Itens flexíveis</p>
                <p className="text-xs text-[var(--ink-muted)]">
                  Adicione, edite ou exclua (alianças, banda, lua de mel…)
                </p>
              </div>
              <Button
                className="shrink-0"
                onClick={() => {
                  setFlexForm(blankFlex())
                  setFlexOpen(true)
                }}
              >
                <Plus size={14} /> Novo
              </Button>
            </div>
            {state.wedding.flexItems.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Nenhum item flexível.</p>
            ) : (
              <ul className="space-y-2">
                {activeFlexItems(state.wedding.flexItems).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            TAG_COLORS[item.tag] || 'bg-white/10'
                          }`}
                        >
                          {TAG_LABEL[item.tag] || item.tag}
                        </span>
                        <span className="truncate text-sm font-semibold">{item.name}</span>
                      </div>
                      <Money value={item.amount} className="text-sm" />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        className="px-2"
                        onClick={() => {
                          setFlexForm({ ...item })
                          setFlexOpen(true)
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        className="px-2"
                        onClick={() => removeFlex(item.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-3 font-bold text-[var(--ink)]">Já pago (histórico)</p>
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
            <p className="mb-3 font-bold text-[var(--ink)]">Fixos ainda a pagar</p>
            {fixedToPay.map(([n, v]) => (
              <div
                key={n}
                className="flex justify-between border-b border-[var(--surface-2)] py-1 text-sm last:border-0"
              >
                <span className="text-[var(--ink-muted)]">{n}</span>
                <span className="font-semibold">{fmt(v, true)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-[var(--line)] pt-2 text-sm font-bold">
              <span>Fixos + flexíveis (cronograma)</span>
              <span>
                {fmt(
                  fixedToPay.reduce((s, [, v]) => s + v, 0) +
                    activeFlexItems(state.wedding.flexItems).reduce((s, f) => s + f.amount, 0),
                  true,
                )}
              </span>
            </div>
          </div>

          {deferred.length > 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="mb-2 font-bold text-[var(--ink)]">Para depois do casamento</p>
              <p className="mb-3 text-xs text-[var(--ink-muted)]">
                Fora do cronograma Jul–Dez — planeja quando quiser.
              </p>
              {deferred.map((item) => (
                <div key={item.id} className="flex justify-between py-1 text-sm">
                  <span className="text-[var(--ink-muted)]">{item.name}</span>
                  <span className="font-semibold">{fmt(item.amount, true)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={flexOpen}
        title={
          state.wedding.flexItems.some((x) => x.id === flexForm.id)
            ? 'Editar item'
            : 'Novo item do casamento'
        }
        onClose={() => setFlexOpen(false)}
      >
        <div className="space-y-3">
          <Field label="Nome">
            <Input
              value={flexForm.name}
              onChange={(e) => setFlexForm({ ...flexForm, name: e.target.value })}
              placeholder="Alianças de Ouro"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={flexForm.amount || ''}
                onChange={(e) =>
                  setFlexForm({ ...flexForm, amount: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Categoria">
              <Select
                value={flexForm.tag}
                onChange={(e) => setFlexForm({ ...flexForm, tag: e.target.value })}
              >
                {TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>
                    {TAG_LABEL[tag]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button className="w-full" onClick={saveFlex}>
            Salvar item
          </Button>
        </div>
      </Modal>
    </div>
  )
}
