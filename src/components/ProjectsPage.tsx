import { useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { Project, ProjectInstallment } from '../types/finance'
import { uid } from '../lib/format'
import { monthlyYourShare } from '../lib/projectShare'
import { Button, EmptyState, Field, Input, Modal, Money, Textarea } from './ui'

type SplitMode = 'full' | 'half' | 'custom' | 'equal'

function blankProject(): Project {
  const today = new Date().toISOString().slice(0, 10)
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
  const [form, setForm] = useState<Project>(blankProject())
  const [splitMode, setSplitMode] = useState<SplitMode>('custom')
  const [equalCount, setEqualCount] = useState(3)

  const totalInstallments = useMemo(
    () => form.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [form.installments],
  )

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
        <EmptyState
          title="Nenhum projeto cadastrado"
          desc="Cadastre um projeto KoruVision com parcelas e mensalidade sob medida."
          action={
            <Button onClick={create}>
              <Plus size={16} /> Criar projeto
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {state.projects.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {p.client || 'Sem cliente'} · Fechamento {p.closeDate}
                  </p>
                </div>
                <Money value={p.totalValue} className="text-xl" />
              </div>
              <p className="mt-1 text-xs text-[var(--positive)]">Implementação · 100% seu</p>

              <div className="mt-3 space-y-1">
                {p.installments.map((inst, idx) => (
                  <div
                    key={inst.id}
                    className="flex justify-between text-sm text-[var(--ink-muted)]"
                  >
                    <span>
                      Parcela {idx + 1} · {inst.date}
                    </span>
                    <Money value={inst.amount} />
                  </div>
                ))}
                {p.hasMonthly && (
                  <div className="space-y-1 border-t border-[var(--line)] pt-2 text-sm">
                    <div className="flex justify-between text-[var(--ink-muted)]">
                      <span>
                        Mensalidade bruta desde {p.monthlyStart}
                        {p.monthlyEnd ? ` até ${p.monthlyEnd}` : ''}
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
                <Button variant="danger" onClick={() => removeProject(p.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} title="Projeto KoruVision" onClose={() => setOpen(false)} wide>
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
                <div key={inst.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
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
                    className="px-2"
                    onClick={() => {
                      setForm({
                        ...form,
                        installments: form.installments.filter((x) => x.id !== inst.id),
                      })
                      setSplitMode('custom')
                    }}
                    disabled={form.installments.length <= 1}
                  >
                    <Trash2 size={14} />
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

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar projeto</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
