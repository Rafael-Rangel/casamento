import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { OtherIncome } from '../types/finance'
import { uid } from '../lib/format'
import { Button, EmptyState, Field, Input, Modal, Money, Textarea } from './ui'

function blank(): OtherIncome {
  return {
    id: uid(),
    name: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    recurring: false,
    endDate: null,
    notes: '',
  }
}

export function OtherIncomePage() {
  const { state, upsertOtherIncome, removeOtherIncome } = useFinance()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<OtherIncome>(blank())

  const create = () => {
    setForm(blank())
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim() || form.amount <= 0) return
    upsertOtherIncome(form)
    setOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Outras receitas</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Freelas pontuais, reembolsos e qualquer entrada fora de salário ou projetos.
          </p>
        </div>
        <Button onClick={create}>
          <Plus size={16} /> Nova receita
        </Button>
      </div>

      {state.otherIncomes.length === 0 ? (
        <EmptyState
          title="Sem outras receitas"
          desc="Adicione entradas extras para completar a projeção."
          action={
            <Button onClick={create}>
              <Plus size={16} /> Adicionar
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {state.otherIncomes.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <div>
                <h3 className="font-semibold">{o.name}</h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  {o.recurring ? `Recorrente desde ${o.date}` : o.date}
                  {o.endDate ? ` até ${o.endDate}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Money value={o.amount} />
                <Button
                  variant="ghost"
                  className="px-2"
                  onClick={() => {
                    setForm({ ...o })
                    setOpen(true)
                  }}
                >
                  <Pencil size={14} />
                </Button>
                <Button variant="danger" onClick={() => removeOtherIncome(o.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} title="Outra receita" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Data / início">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
            />
            Receita recorrente mensal
          </label>
          {form.recurring && (
            <Field label="Encerramento" hint="Opcional">
              <Input
                type="date"
                value={form.endDate || ''}
                onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
              />
            </Field>
          )}
          <Field label="Observações">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
