import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { Expense, ExpenseKind, ExpensePurpose } from '../types/finance'
import { uid } from '../lib/format'
import { Button, EmptyState, Field, Input, Modal, Money, Select, Textarea } from './ui'

const KIND_LABEL: Record<ExpenseKind, string> = {
  unique: 'Único',
  installment: 'Parcelado',
  recurring: 'Recorrente',
}

function blankExpense(categoryId: string): Expense {
  return {
    id: uid(),
    name: '',
    categoryId,
    amount: 0,
    kind: 'unique',
    purpose: 'life',
    date: new Date().toISOString().slice(0, 10),
    installmentCount: 2,
    endDate: null,
    notes: '',
  }
}

export function ExpensesPage() {
  const { state, upsertExpense, removeExpense, upsertCategory } = useFinance()
  const [open, setOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [form, setForm] = useState<Expense>(() =>
    blankExpense(state.categories[0]?.id || 'outros'),
  )
  const [newCat, setNewCat] = useState({ name: '', color: '#2F6B5A' })

  const create = () => {
    setForm(blankExpense(state.categories[0]?.id || 'outros'))
    setOpen(true)
  }

  const edit = (e: Expense) => {
    setForm({ ...e })
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim() || form.amount <= 0) return
    upsertExpense(form)
    setOpen(false)
  }

  const saveCategory = () => {
    if (!newCat.name.trim()) return
    upsertCategory({
      id: uid(),
      name: newCat.name.trim(),
      color: newCat.color,
    })
    setNewCat({ name: '', color: '#2F6B5A' })
    setCatOpen(false)
  }

  const catName = (id: string) => state.categories.find((c) => c.id === id)?.name || id

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Vida e Cartão</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Gastos do dia a dia e cartão — pagos com o que sobra depois do casamento do mês.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setCatOpen(true)}>
            Nova categoria
          </Button>
          <Button onClick={create}>
            <Plus size={16} /> Novo gasto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {state.categories.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-medium"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
      </div>

      {state.expenses.length === 0 ? (
        <EmptyState
          title="Nenhuma despesa"
          desc="Cadastre moradia, alimentação, cartão e o restante do seu orçamento."
          action={
            <Button onClick={create}>
              <Plus size={16} /> Cadastrar gasto
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {state.expenses.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[var(--ink)]">{e.name}</h3>
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--ink-muted)]">
                    {catName(e.categoryId)}
                  </span>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold">
                    {KIND_LABEL[e.kind]}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[var(--ink-muted)] border border-[var(--line)]">
                    {(e.purpose || 'life') === 'life' ? 'Vida/cartão' : 'Casamento'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {e.date}
                  {e.kind === 'installment' && e.installmentCount
                    ? ` · ${e.installmentCount}x`
                    : ''}
                  {e.kind === 'recurring' && e.endDate ? ` · até ${e.endDate}` : ''}
                  {e.notes ? ` · ${e.notes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Money value={-e.amount} className="text-lg" />
                <Button variant="ghost" className="px-2" onClick={() => edit(e)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="danger" className="px-2" onClick={() => removeExpense(e.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} title="Despesa" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Aluguel"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo">
              <Select
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as ExpenseKind })
                }
              >
                <option value="unique">Único</option>
                <option value="installment">Parcelado</option>
                <option value="recurring">Recorrente</option>
              </Select>
            </Field>
          </div>
          <Field
            label="Impacto"
            hint="Vida/cartão sai da sobra livre. Extra de casamento fica fora do cronograma automático da aba Casamento."
          >
            <Select
              value={form.purpose || 'life'}
              onChange={(e) =>
                setForm({ ...form, purpose: e.target.value as ExpensePurpose })
              }
            >
              <option value="life">Vida geral / cartão (reduz sobra)</option>
              <option value="wedding">Extra do casamento</option>
            </Select>
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
            <Field label={form.kind === 'recurring' ? 'Início' : 'Data'}>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>
          {form.kind === 'installment' && (
            <Field label="Número de parcelas" hint="Valor total dividido igualmente a partir da data">
              <Input
                type="number"
                min={2}
                max={48}
                value={form.installmentCount || 2}
                onChange={(e) =>
                  setForm({ ...form, installmentCount: Number(e.target.value) })
                }
              />
            </Field>
          )}
          {form.kind === 'recurring' && (
            <Field label="Encerramento" hint="Deixe vazio para continuar indefinidamente">
              <Input
                type="date"
                value={form.endDate || ''}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value || null })
                }
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={catOpen} title="Nova categoria" onClose={() => setCatOpen(false)}>
        <div className="space-y-3">
          <Field label="Nome">
            <Input
              value={newCat.name}
              onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              placeholder="Pets"
            />
          </Field>
          <Field label="Cor">
            <Input
              type="color"
              value={newCat.color}
              onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
              className="h-11"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCatOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCategory}>Criar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
