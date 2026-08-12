import { useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { Project, ProjectInstallment } from '../types/finance'
import { uid } from '../lib/format'
import { monthlyYourShare } from '../lib/projectShare'
import { deviceTodayKey } from '../lib/referenceDate'
import { Button, EmptyState, Field, Input, Modal, Money, Textarea } from './ui'
import { PageEnter } from './PageEnter'

type SplitMode = 'full' | 'half' | 'custom' | 'equal'

function blankProject(): Project {
  const today = deviceTodayKey()
  return {
    id: uid(),
    name: '',
    client: '',
    closeDate: today,
    totalValue: 0,
    installments: [{ id: uid(), amount: 0, date: today }],
    hasMonthly: false,
    monthlyAmount: 0,
    monthlyStart: null,
    monthlyEnd: null,
    notes: '',
  }
}

function formatDayParts(iso: string) {
  const [y, m, d] = (iso || '0000-00-00').split('-')
  return { d, m, y }
}

function applySplit(total: number, closeDate: string, mode: SplitMode, count: number): ProjectInstallment[] {
  if (mode === 'full') {
    return [{ id: uid(), amount: total, date: closeDate }]
  }
  if (mode === 'half') {
    const first = Math.round((total / 2) * 100) / 100
    const second = Math.round((total - first) * 100) / 100
    return [
      { id: uid(), amount: first, date: closeDate },
      {
        id: uid(),
        amount: second,
        date: format(addMonths(parseISO(closeDate), 1), 'yyyy-MM-dd'),
      },
    ]
  }
  const n = Math.max(2, count)
  const base = Math.floor((total / n) * 100) / 100
  let allocated = 0
  const start = parseISO(closeDate)
  return Array.from({ length: n }, (_, i) => {
    const amount = i === n - 1 ? Math.round((total - allocated) * 100) / 100 : base
    allocated += amount
    return {
      id: uid(),
      amount,
      date: format(addMonths(start, i), 'yyyy-MM-dd'),
    }
  })
}

export function ProjectsPage() {
  const { state, upsertProject, removeProject } = useFinance()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Project>(blankProject)
  const [splitMode, setSplitMode] = useState<SplitMode>('custom')
  const [equalCount, setEqualCount] = useState(3)

  const totalInstallments = useMemo(
    () => form.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [form.installments],
  )

  const grouped = useMemo(() => {
    const sorted = [...state.projects].sort((a, b) =>
      (b.closeDate || '').localeCompare(a.closeDate || ''),
    )
    const groups: { key: string; title: string; items: Project[] }[] = []
    for (const p of sorted) {
      const key = (p.closeDate || '0000-00').slice(0, 7)
      const title = format(new Date((p.closeDate || '2000-01-01') + 'T12:00:00'), 'MMMM yyyy', {
        locale: ptBR,
      })
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.items.push(p)
      else groups.push({ key, title, items: [p] })
    }
    return groups
  }, [state.projects])

  const create = () => {
    setForm(blankProject())
    setSplitMode('custom')
    setOpen(true)
  }

  const edit = (p: Project) => {
    setForm({ ...p, installments: p.installments.map((i) => ({ ...i })) })
    setSplitMode('custom')
    setOpen(true)
  }

  const applyPreset = (mode: SplitMode) => {
    setSplitMode(mode)
    if (mode === 'custom') return
    setForm((f) => ({
      ...f,
      installments: applySplit(f.totalValue, f.closeDate, mode, equalCount),
    }))
  }

  const save = () => {
    if (!form.name.trim()) return
    upsertProject({
      ...form,
      monthlyStart: form.hasMonthly ? form.monthlyStart : null,
      monthlyEnd: form.hasMonthly ? form.monthlyEnd : null,
      monthlyAmount: form.hasMonthly ? form.monthlyAmount : 0,
    })
    setOpen(false)
  }

  return (
    <PageEnter className="space-y-5">
      <div data-enter="header" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            KoruVision
          </p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Projetos</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Implementação 100% sua · mensalidade 2/3 (você + esposa). Tudo entra em
            “Recebemos” nas datas das parcelas.
          </p>
        </div>
        <Button onClick={create}>
          <Plus size={16} /> Novo projeto
        </Button>
      </div>

      {state.projects.length === 0 ? (
        <div data-enter="block">
          <EmptyState
            title="Nenhum projeto cadastrado"
            desc="Cadastre um projeto KoruVision com parcelas e mensalidade sob medida."
            action={
              <Button onClick={create}>
                <Plus size={16} /> Criar projeto
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                  {group.title}
                </p>
                <div className="h-px flex-1 bg-[var(--line)]" />
              </div>
              {group.items.map((p) => {
                const close = formatDayParts(p.closeDate)
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl font-bold">{p.name}</h3>
                          <span className="rounded-lg bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                            {close.d}
                            <span className="mx-0.5 text-[var(--ink-faint)]">/</span>
                            {close.m}
                            <span className="mx-0.5 text-[var(--ink-faint)]">/</span>
                            {close.y}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--ink-muted)]">
                          {p.client || 'Sem cliente'} · Fechamento
                        </p>
                      </div>
                      <Money value={p.totalValue} className="text-xl" />
                    </div>
                    <p className="mt-1 text-xs text-[var(--positive)]">Implementação · 100% seu</p>

                    <div className="mt-3 space-y-1">
                      {p.installments.map((inst, idx) => {
                        const parts = formatDayParts(inst.date)
                        return (
                          <div
                            key={inst.id}
                            className="flex justify-between text-sm text-[var(--ink-muted)]"
                          >
                            <span>
                              Parcela {idx + 1} · {parts.d}/{parts.m}/{parts.y}
                            </span>
                            <Money value={inst.amount} />
                          </div>
                        )
                      })}
                      {p.hasMonthly && (
                        <div className="space-y-1 border-t border-[var(--line)] pt-2 text-sm">
                          <div className="flex justify-between text-[var(--ink-muted)]">
                            <span>
                              Mensalidade bruta
                              {p.monthlyStart
                                ? ` desde ${formatDayParts(p.monthlyStart).d}/${formatDayParts(p.monthlyStart).m}/${formatDayParts(p.monthlyStart).y}`
                                : ''}
                              {p.monthlyEnd
                                ? ` até ${formatDayParts(p.monthlyEnd).d}/${formatDayParts(p.monthlyEnd).m}/${formatDayParts(p.monthlyEnd).y}`
                                : ''}
                            </span>
                            <Money value={p.monthlyAmount} />
                          </div>
                          <div className="flex justify-between font-semibold text-[var(--ink)]">
                            <span>Sua parte (2/3)</span>
                            <Money value={monthlyYourShare(p.monthlyAmount)} />
                          </div>
                        </div>
                      )}
                    </div>

                    {p.notes && (
                      <p className="mt-2 text-xs text-[var(--ink-faint)]">{p.notes}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => edit(p)}>
                        <Pencil size={14} /> Editar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Excluir o projeto “${p.name}”?`)) removeProject(p.id)
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title="Projeto KoruVision"
        onClose={() => setOpen(false)}
        wide
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={save}>
              Salvar projeto
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do projeto">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Landing Page XPTO"
              />
            </Field>
            <Field label="Cliente">
              <Input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Data de fechamento">
              <Input
                type="date"
                value={form.closeDate}
                onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
              />
            </Field>
            <Field label="Valor total do projeto">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.totalValue || ''}
                onChange={(e) => setForm({ ...form, totalValue: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Pagamento da implementação (100% seu)
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  ['full', '100% agora'],
                  ['half', '50% / 50%'],
                  ['equal', 'Parcelas iguais'],
                  ['custom', 'Manual'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => applyPreset(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    splitMode === mode
                      ? 'bg-[var(--rose)] text-white'
                      : 'bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--line)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {splitMode === 'equal' && (
              <Field label="Número de parcelas">
                <Input
                  type="number"
                  min={2}
                  max={24}
                  value={equalCount}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    setEqualCount(n)
                    setForm((f) => ({
                      ...f,
                      installments: applySplit(f.totalValue, f.closeDate, 'equal', n),
                    }))
                  }}
                />
              </Field>
            )}

            <div className="mt-3 space-y-2">
              {form.installments.map((inst, idx) => (
                <div key={inst.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    type="date"
                    value={inst.date}
                    onChange={(e) => {
                      const installments = [...form.installments]
                      installments[idx] = { ...inst, date: e.target.value }
                      setForm({ ...form, installments })
                      setSplitMode('custom')
                    }}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={inst.amount || ''}
                    onChange={(e) => {
                      const installments = [...form.installments]
                      installments[idx] = { ...inst, amount: Number(e.target.value) }
                      setForm({ ...form, installments })
                      setSplitMode('custom')
                    }}
                  />
                  <Button
                    variant="ghost"
                    className="min-w-11"
                    onClick={() => {
                      setForm({
                        ...form,
                        installments: form.installments.filter((x) => x.id !== inst.id),
                      })
                      setSplitMode('custom')
                    }}
                    disabled={form.installments.length <= 1}
                  >
                    <Trash2 size={14} /> Remover
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                onClick={() => {
                  setForm({
                    ...form,
                    installments: [
                      ...form.installments,
                      {
                        id: uid(),
                        amount: 0,
                        date: form.closeDate,
                      },
                    ],
                  })
                  setSplitMode('custom')
                }}
              >
                <Plus size={14} /> Parcela
              </Button>
              <p className="text-xs text-[var(--ink-muted)]">
                Soma das parcelas: <Money value={totalInstallments} />
                {form.totalValue > 0 && totalInstallments !== form.totalValue && (
                  <span className="text-[var(--negative)]">
                    {' '}
                    (diferença de {Math.abs(form.totalValue - totalInstallments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em relação ao total)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.hasMonthly}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hasMonthly: e.target.checked,
                    monthlyStart:
                      e.target.checked && !form.monthlyStart
                        ? format(addMonths(parseISO(form.closeDate), 1), 'yyyy-MM-dd')
                        : form.monthlyStart,
                  })
                }
              />
              Possui mensalidade
            </label>
            {form.hasMonthly && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Mensalidade bruta"
                    hint="Valor cobrado do cliente"
                  >
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.monthlyAmount || ''}
                      onChange={(e) =>
                        setForm({ ...form, monthlyAmount: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Início">
                    <Input
                      type="date"
                      value={form.monthlyStart || ''}
                      onChange={(e) =>
                        setForm({ ...form, monthlyStart: e.target.value || null })
                      }
                    />
                  </Field>
                  <Field label="Encerramento" hint="Opcional">
                    <Input
                      type="date"
                      value={form.monthlyEnd || ''}
                      onChange={(e) =>
                        setForm({ ...form, monthlyEnd: e.target.value || null })
                      }
                    />
                  </Field>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
                  <div className="flex justify-between text-[var(--ink-muted)]">
                    <span>Dividido em 3 pessoas</span>
                    <Money value={form.monthlyAmount / 3} />
                  </div>
                  <div className="mt-1 flex justify-between font-bold text-[var(--ink)]">
                    <span>Vocês ficam com 2/3</span>
                    <Money value={monthlyYourShare(form.monthlyAmount || 0)} />
                  </div>
                </div>
              </>
            )}
          </div>

          <Field label="Observações">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </PageEnter>
  )
}
