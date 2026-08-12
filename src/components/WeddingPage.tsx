import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import { weddingMonthBudgets } from '../lib/projections'
import {
  blankDemand,
  buildWeddingSchedule,
  demandsToFlexItems,
  previewDemand,
  schedulePendingByItem,
  scheduleTotals,
  TAG_COLORS,
  TAG_LABEL,
  WEDDING_MONTHS,
} from '../lib/wedding'
import { fmt } from '../lib/format'
import type {
  DemandAmountMode,
  DemandDuration,
  DemandNaming,
  WeddingDemand,
  WeddingPaidItem,
} from '../types/finance'
import { Button, Field, Input, Modal, Money, Select } from './ui'
import { PageEnter } from './PageEnter'

const TAG_OPTIONS = Object.keys(TAG_LABEL)

const DURATION_LABEL: Record<DemandDuration, string> = {
  month: 'Só um mês',
  range: 'Intervalo de meses',
  until_wedding: 'Até a data do casamento',
  permanent: 'Permanente (até remover)',
}

const AMOUNT_MODE_LABEL: Record<DemandAmountMode, string> = {
  total_split: 'Total dividido entre os meses',
  per_month: 'Mesmo valor em cada mês',
}

const MONTH_OPTIONS = WEDDING_MONTHS.map((m) => ({ value: m.key, label: m.label }))

function durationHint(d: WeddingDemand): string {
  if (d.duration === 'month') return d.startMonth
  if (d.duration === 'range') return `${d.startMonth} → ${d.endMonth || d.startMonth}`
  if (d.duration === 'until_wedding') return `${d.startMonth} → casamento`
  return `${d.startMonth} → …`
}

export function WeddingPage() {
  const { state, toggleWeddingCheck, isWeddingChecked, updateWedding } = useFinance()
  const [tab, setTab] = useState<'cronograma' | 'gerenciar' | 'resumo'>('cronograma')
  const [activeMonth, setActiveMonth] = useState(0)
  const [showDeficit, setShowDeficit] = useState(false)
  const [showPaid, setShowPaid] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const [demandOpen, setDemandOpen] = useState(false)
  const [demandForm, setDemandForm] = useState<WeddingDemand>(blankDemand())
  const [paidOpen, setPaidOpen] = useState(false)
  const [paidForm, setPaidForm] = useState<WeddingPaidItem & { index: number }>({
    name: '',
    amount: 0,
    index: -1,
  })
  const [dateDraft, setDateDraft] = useState(state.wedding.dateLabel)

  const demands = state.wedding.demands || []

  const budgets = useMemo(() => weddingMonthBudgets(state), [state])
  const avgBudget =
    budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0
  const monthCount = budgets.length

  const { schedule, unpaid, totalRemaining, deferred } = useMemo(
    () => buildWeddingSchedule(budgets, state.wedding),
    [budgets, state.wedding],
  )

  const { pending: schedulePending } = useMemo(
    () => scheduleTotals(schedule, state.wedding.checked),
    [schedule, state.wedding.checked],
  )

  const pendingByItem = useMemo(
    () => schedulePendingByItem(schedule, state.wedding.checked),
    [schedule, state.wedding.checked],
  )

  const demandPreview = useMemo(
    () => previewDemand(demandForm, state.wedding.dateLabel),
    [demandForm, state.wedding.dateLabel],
  )

  const totalSavings = budgets.reduce((s, b) => s + Math.max(0, b), 0)
  const m = schedule[activeMonth] || schedule[0]
  const monthTotal = m?.payments.reduce((s, p) => s + p.amount, 0) || 0
  const paidTotal =
    m?.payments.reduce(
      (s, p) => (isWeddingChecked(m.short, p.name) ? s + p.amount : s),
      0,
    ) || 0
  const stillToPay = monthTotal - paidTotal
  const needMoreForPending = Math.max(0, stillToPay - (m?.budget ?? 0))
  const accumulated = schedule.map((_, i) =>
    budgets.slice(0, i + 1).reduce((s, b) => s + Math.max(0, b), 0),
  )

  const visiblePayments =
    m?.payments.filter((p) => showPaid || !isWeddingChecked(m.short, p.name)) || []
  const hiddenPaidCount = (m?.payments.length || 0) - visiblePayments.length

  const stillNeedAcrossMonths = schedule.reduce((sum, month) => {
    const pending = month.payments
      .filter((p) => !isWeddingChecked(month.short, p.name))
      .reduce((s, p) => s + p.amount, 0)
    return sum + Math.max(0, pending - month.budget)
  }, 0)

  const alreadyPaidTotal = state.wedding.alreadyPaid.reduce((s, i) => s + i.amount, 0)
  const activeDemands = demands.filter((d) => d.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const inactiveDemands = demands.filter((d) => !d.active).sort((a, b) => a.sortOrder - b.sortOrder)

  const persistDemands = (next: WeddingDemand[]) => {
    const normalized = next.map((d, i) => ({ ...d, sortOrder: i }))
    updateWedding({
      demands: normalized,
      flexItems: demandsToFlexItems(normalized),
    })
  }

  const saveDemand = () => {
    if (!demandForm.name.trim() || !(demandForm.amount > 0)) return
    if (demandForm.duration === 'range' && !demandForm.endMonth) {
      demandForm.endMonth = demandForm.startMonth
    }
    const exists = demands.some((x) => x.id === demandForm.id)
    const next = exists
      ? demands.map((x) => (x.id === demandForm.id ? demandForm : x))
      : [...demands, { ...demandForm, sortOrder: demands.length }]
    persistDemands(next)
    setDemandOpen(false)
  }

  const removeDemand = (id: string) => {
    if (!confirm('Excluir esta demanda do casamento?')) return
    persistDemands(demands.filter((x) => x.id !== id))
  }

  const moveDemand = (id: string, dir: -1 | 1) => {
    const sorted = [...activeDemands]
    const i = sorted.findIndex((d) => d.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= sorted.length) return
    ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
    persistDemands([...sorted, ...inactiveDemands])
  }

  const saveDate = () => {
    const t = dateDraft.trim()
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) return
    updateWedding({ dateLabel: t })
  }

  const savePaid = () => {
    if (!paidForm.name.trim() || !(paidForm.amount > 0)) return
    const list = [...state.wedding.alreadyPaid]
    if (paidForm.index >= 0) list[paidForm.index] = { name: paidForm.name, amount: paidForm.amount }
    else list.push({ name: paidForm.name, amount: paidForm.amount })
    updateWedding({ alreadyPaid: list })
    setPaidOpen(false)
  }

  const removePaid = (index: number) => {
    if (!confirm('Remover este item do histórico?')) return
    updateWedding({
      alreadyPaid: state.wedding.alreadyPaid.filter((_, i) => i !== index),
    })
  }

  return (
    <PageEnter className="mx-auto max-w-lg space-y-4">
      <header data-enter="header" className="text-center">
        <h1 className="font-display text-2xl font-extrabold text-[var(--ink)]">
          Casamento {state.wedding.dateLabel}
        </h1>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Marque o que pagou · gerencie demandas · tudo recalcula sozinho
        </p>
      </header>

      <div data-enter="hero" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
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
        <div data-enter="chip" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-xs text-[var(--ink-muted)]">Budget/mês</p>
          <p className="text-base font-bold text-[var(--positive)]">{fmt(avgBudget, true)}</p>
        </div>
        <div data-enter="chip" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-xs text-[var(--ink-muted)]">Total plano</p>
          <p className="text-base font-bold text-[var(--positive)]">{fmt(totalSavings, true)}</p>
        </div>
        <button
          type="button"
          data-enter="chip"
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
        <div data-enter="block" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="font-bold text-amber-200">Quanto falta ganhar a mais</p>
          <p className="mt-1 text-sm text-amber-100/80">
            Soma dos meses em que o que ainda falta pagar (sem check) passa do orçamento.
          </p>
          <div className="mt-3 space-y-1 rounded-xl border border-amber-500/20 bg-[var(--surface-2)] p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Itens no plano</span>
              <span className="font-bold">{fmt(totalRemaining, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Orçamento acumulado</span>
              <span className="font-bold text-[var(--positive)]">{fmt(totalSavings, true)}</span>
            </div>
            <div className="flex justify-between border-t border-amber-500/20 pt-1 font-bold">
              <span>Ainda precisa ganhar a mais</span>
              <span className={stillNeedAcrossMonths === 0 ? 'text-emerald-300' : 'text-amber-300'}>
                {fmt(stillNeedAcrossMonths, true)}
              </span>
            </div>
          </div>
          {unpaid.length === 0 && (
            <p className="mt-3 text-xs font-semibold text-emerald-300">
              Todas as demandas ativas estão no cronograma.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {(
          [
            ['cronograma', 'Cronograma'],
            ['gerenciar', 'Gerenciar'],
            ['resumo', 'Resumo'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-enter="chip"
            onClick={() => {
              setTab(id)
              if (id === 'gerenciar') setDateDraft(state.wedding.dateLabel)
            }}
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
                  data-enter="chip"
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

          <div data-enter="block" className="mb-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
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
                className="shrink-0 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink-muted)]"
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
                      data-enter="item"
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

          <div data-enter="block" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
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
                      ? Math.min(((accumulated[activeMonth] || 0) / totalSavings) * 100, 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'gerenciar' && (
        <div className="space-y-3">
          <div data-enter="block" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-2 font-bold text-[var(--ink)]">Data do casamento</p>
            <p className="mb-3 text-xs text-[var(--ink-muted)]">
              Usada em demandas “até a data do casamento” (DD/MM/AAAA).
            </p>
            <div className="flex gap-2">
              <Input
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                placeholder="12/12/2026"
              />
              <Button onClick={saveDate}>Salvar</Button>
            </div>
          </div>

          <div data-enter="block" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-[var(--ink)]">Demandas</p>
                <p className="text-xs text-[var(--ink-muted)]">
                  Crie, edite, reordene e defina período e valor. O cronograma atualiza na hora.
                </p>
              </div>
              <Button
                className="shrink-0"
                onClick={() => {
                  setDemandForm(blankDemand())
                  setDemandOpen(true)
                }}
              >
                <Plus size={14} /> Nova
              </Button>
            </div>

            {activeDemands.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Nenhuma demanda ativa.</p>
            ) : (
              <ul className="space-y-2">
                {activeDemands.map((item, idx) => {
                  const prev = previewDemand(item, state.wedding.dateLabel)
                  return (
                    <li
                      key={item.id}
                      data-enter="item"
                      className="rounded-xl bg-[var(--surface-2)] px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
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
                          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                            {DURATION_LABEL[item.duration]} · {durationHint(item)}
                          </p>
                          <p className="text-xs text-[var(--ink-muted)]">
                            {AMOUNT_MODE_LABEL[item.amountMode]} · {prev.months.length} mês(es) ·
                            total {fmt(prev.total, true)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              disabled={idx === 0}
                              onClick={() => moveDemand(item.id, -1)}
                            >
                              <ChevronUp size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={idx === activeDemands.length - 1}
                              onClick={() => moveDemand(item.id, 1)}
                            >
                              <ChevronDown size={14} />
                            </Button>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setDemandForm({ ...item })
                                setDemandOpen(true)
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button variant="danger" onClick={() => removeDemand(item.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {inactiveDemands.length > 0 && (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <button
                  type="button"
                  className="mb-2 text-xs font-semibold text-[var(--ink-muted)]"
                  onClick={() => setShowInactive((v) => !v)}
                >
                  {showInactive ? 'Ocultar' : 'Mostrar'} inativas ({inactiveDemands.length})
                </button>
                {showInactive &&
                  inactiveDemands.map((item) => (
                    <div
                      key={item.id}
                      className="mb-2 flex items-center justify-between rounded-xl border border-dashed border-[var(--line)] px-3 py-2 text-sm"
                    >
                      <span className="text-[var(--ink-muted)]">{item.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            persistDemands(
                              demands.map((d) =>
                                d.id === item.id ? { ...d, active: true } : d,
                              ),
                            )
                          }}
                        >
                          Ativar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setDemandForm({ ...item })
                            setDemandOpen(true)
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div data-enter="block" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-[var(--ink)]">Já pago (histórico)</p>
                <p className="text-xs text-[var(--ink-muted)]">Fora do cronograma mensal.</p>
              </div>
              <Button
                onClick={() => {
                  setPaidForm({ name: '', amount: 0, index: -1 })
                  setPaidOpen(true)
                }}
              >
                <Plus size={14} /> Item
              </Button>
            </div>
            {state.wedding.alreadyPaid.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between gap-2 border-b border-[var(--surface-2)] py-2 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[var(--ink-muted)]">{item.name}</p>
                  <span className="font-semibold text-[var(--positive)]">
                    {fmt(item.amount, true)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPaidForm({ ...item, index })
                      setPaidOpen(true)
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" onClick={() => removePaid(index)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'resumo' && (
        <div className="space-y-3">
          <div data-enter="block" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-3 font-bold text-[var(--ink)]">Já pago (histórico)</p>
            {state.wedding.alreadyPaid.map((item) => (
              <div key={item.name} data-enter="item" className="flex justify-between py-1 text-sm">
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

          <div data-enter="block" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-3 font-bold text-[var(--ink)]">Cronograma ainda a pagar</p>
            {pendingByItem.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Tudo marcado como pago no cronograma.</p>
            ) : (
              pendingByItem.map((item) => (
                <div
                  key={item.name}
                  data-enter="item"
                  className="flex justify-between border-b border-[var(--surface-2)] py-1 text-sm last:border-0"
                >
                  <span className="text-[var(--ink-muted)]">{item.name}</span>
                  <span className="font-semibold">{fmt(item.amount, true)}</span>
                </div>
              ))
            )}
            <div className="mt-2 flex justify-between border-t border-[var(--line)] pt-2 text-sm font-bold">
              <span>Total do cronograma (pendente)</span>
              <span>{fmt(schedulePending, true)}</span>
            </div>
          </div>

          {deferred.length > 0 && (
            <div data-enter="block" className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="mb-2 font-bold text-[var(--ink)]">Inativas / para depois</p>
              {deferred.map((item) => (
                <div key={item.id} data-enter="item" className="flex justify-between py-1 text-sm">
                  <span className="text-[var(--ink-muted)]">{item.name}</span>
                  <span className="font-semibold">{fmt(item.amount, true)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={demandOpen}
        title={demands.some((x) => x.id === demandForm.id) ? 'Editar demanda' : 'Nova demanda'}
        onClose={() => setDemandOpen(false)}
        footer={
          <Button className="w-full" onClick={saveDemand}>
            Salvar demanda
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Nome">
            <Input
              value={demandForm.name}
              onChange={(e) => setDemandForm({ ...demandForm, name: e.target.value })}
              placeholder="Alianças de Ouro"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={demandForm.amount || ''}
                onChange={(e) =>
                  setDemandForm({ ...demandForm, amount: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Categoria">
              <Select
                value={demandForm.tag}
                onChange={(e) => setDemandForm({ ...demandForm, tag: e.target.value })}
              >
                {TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>
                    {TAG_LABEL[tag]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Período">
            <Select
              value={demandForm.duration}
              onChange={(e) =>
                setDemandForm({
                  ...demandForm,
                  duration: e.target.value as DemandDuration,
                  naming:
                    e.target.value === 'month'
                      ? 'plain'
                      : demandForm.naming === 'plain'
                        ? 'parts'
                        : demandForm.naming,
                })
              }
            >
              {(Object.keys(DURATION_LABEL) as DemandDuration[]).map((k) => (
                <option key={k} value={k}>
                  {DURATION_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={demandForm.duration === 'month' ? 'Mês' : 'Início'}>
              <Select
                value={demandForm.startMonth}
                onChange={(e) => setDemandForm({ ...demandForm, startMonth: e.target.value })}
              >
                {MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            {demandForm.duration === 'range' && (
              <Field label="Fim">
                <Select
                  value={demandForm.endMonth || demandForm.startMonth}
                  onChange={(e) => setDemandForm({ ...demandForm, endMonth: e.target.value })}
                >
                  {MONTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          {demandForm.duration !== 'month' && (
            <Field label="Como aplicar o valor">
              <Select
                value={demandForm.amountMode}
                onChange={(e) =>
                  setDemandForm({
                    ...demandForm,
                    amountMode: e.target.value as DemandAmountMode,
                  })
                }
              >
                {(Object.keys(AMOUNT_MODE_LABEL) as DemandAmountMode[]).map((k) => (
                  <option key={k} value={k}>
                    {AMOUNT_MODE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {demandForm.duration !== 'month' && (
            <Field label="Nome nas parcelas">
              <Select
                value={demandForm.naming || 'parts'}
                onChange={(e) =>
                  setDemandForm({
                    ...demandForm,
                    naming: e.target.value as DemandNaming,
                  })
                }
              >
                <option value="parts">Nome (1/N) …</option>
                <option value="simple_last">Nome · última no fim</option>
                <option value="plain">Sempre o mesmo nome</option>
              </Select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={demandForm.active}
              onChange={(e) => setDemandForm({ ...demandForm, active: e.target.checked })}
            />
            Ativa no cronograma
          </label>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-[var(--ink-muted)]">
            <p className="font-semibold text-[var(--ink)]">Preview</p>
            <p className="mt-1">
              {demandPreview.months.length} mês(es) · total {fmt(demandPreview.total, true)}
              {demandPreview.months.length > 0 && (
                <>
                  {' '}
                  · ~{fmt(demandPreview.amounts[0] || 0, true)}
                  {demandForm.amountMode === 'per_month' || demandPreview.months.length === 1
                    ? '/mês'
                    : ' no 1º mês'}
                </>
              )}
            </p>
            {demandPreview.labels.slice(0, 4).map((l, i) => (
              <p key={l + i}>
                {demandPreview.months[i]}: {l} — {fmt(demandPreview.amounts[i] || 0, true)}
              </p>
            ))}
            {demandPreview.labels.length > 4 && (
              <p>… +{demandPreview.labels.length - 4} meses</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={paidOpen}
        title={paidForm.index >= 0 ? 'Editar histórico' : 'Novo no histórico'}
        onClose={() => setPaidOpen(false)}
        footer={
          <Button className="w-full" onClick={savePaid}>
            Salvar
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Nome">
            <Input
              value={paidForm.name}
              onChange={(e) => setPaidForm({ ...paidForm, name: e.target.value })}
            />
          </Field>
          <Field label="Valor">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={paidForm.amount || ''}
              onChange={(e) =>
                setPaidForm({ ...paidForm, amount: Number(e.target.value) || 0 })
              }
            />
          </Field>
        </div>
      </Modal>
    </PageEnter>
  )
}
