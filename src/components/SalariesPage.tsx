import { useState } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { SalarySource } from '../types/finance'
import { uid } from '../lib/format'
import { Button, EmptyState, Field, Input, Modal, Money } from './ui'
import { PageEnter } from './PageEnter'

function blankSalary(): SalarySource {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: uid(),
    name: '',
    amount: 0,
    payDay: 5,
    startDate: today,
    endDate: null,
    active: true,
  }
}

export function SalariesPage() {
  const { state, upsertSalary, removeSalary } = useFinance()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SalarySource>(blankSalary())

  const edit = (s: SalarySource) => {
    setForm({ ...s })
    setOpen(true)
  }

  const create = () => {
    setForm(blankSalary())
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim() || form.amount <= 0) return
    upsertSalary({
      ...form,
      endDate: form.endDate || null,
      payDay: Math.min(31, Math.max(1, form.payDay || 1)),
    })
    setOpen(false)
  }

  return (
    <PageEnter className="space-y-5">
      <div data-enter="header" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Salários</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Entram em “Recebemos” do mês (Meu mês) no dia de recebimento.
          </p>
        </div>
        <Button onClick={create}>
          <Plus size={16} /> Nova fonte
        </Button>
      </div>

      {state.salaries.length === 0 ? (
        <div data-enter="block">
          <EmptyState
            title="Nenhuma fonte de salário"
            desc="Cadastre seu salário para projetar a receita fixa mês a mês."
            action={
              <Button onClick={create}>
                <Plus size={16} /> Cadastrar
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {state.salaries.map((s) => (
            <div
              key={s.id}
              data-enter="item"
              className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 ${
                !s.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-bold">{s.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.active
                          ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                          : 'bg-[var(--surface-2)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {s.active ? 'Ativa' : 'Encerrada'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Recebimento dia {s.payDay} · Desde {s.startDate}
                    {s.endDate ? ` · Até ${s.endDate}` : ''}
                  </p>
                </div>
                <Money value={s.amount} className="text-xl" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => edit(s)}>
                  <Pencil size={14} /> Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    upsertSalary({
                      ...s,
                      active: !s.active,
                      endDate: s.active
                        ? new Date().toISOString().slice(0, 10)
                        : null,
                    })
                  }
                >
                  <Power size={14} /> {s.active ? 'Encerrar' : 'Reativar'}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Excluir o salário “${s.name}”?`)) removeSalary(s.id)
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title="Fonte de salário"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={save}>
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Nome da fonte">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Gênesis"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor mensal">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Dia do recebimento">
              <Input
                type="number"
                min={1}
                max={31}
                value={form.payDay}
                onChange={(e) => setForm({ ...form, payDay: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de início">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Data de encerramento" hint="Opcional">
              <Input
                type="date"
                value={form.endDate || ''}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value || null })
                }
              />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Fonte ativa
          </label>
        </div>
      </Modal>
    </PageEnter>
  )
}
