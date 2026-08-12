import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Gift, Pencil, Plus } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { OtherIncome } from '../types/finance'
import { uid } from '../lib/format'
import { deviceTodayKey } from '../lib/referenceDate'
import {
  isOtherIncomeDisplayReceived,
  setOtherIncomeReceivedFlag,
} from '../lib/incomePayment'
import { Button, EmptyState, Field, Input, Modal, Money, MoneyInput, Select, Textarea } from './ui'
import { PageEnter } from './PageEnter'

function blankIncome(date: string): OtherIncome {
  return {
    id: uid(),
    name: '',
    amount: 0,
    date,
    recurring: false,
    endDate: null,
    notes: '',
    /** Padrão: já entrou na conta — sobe o valor na conta + Já entrou */
    received: true,
  }
}

function incomeSortDate(income: OtherIncome) {
  return income.date || '0000-00-00'
}

export function OtherIncomesPage() {
  const { state, upsertOtherIncome, removeOtherIncome } = useFinance()
  const today = deviceTodayKey()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<OtherIncome>(() => blankIncome(today))

  const grouped = useMemo(() => {
    const sorted = [...state.otherIncomes].sort((a, b) =>
      incomeSortDate(b).localeCompare(incomeSortDate(a)),
    )
    const groups: { key: string; title: string; items: OtherIncome[] }[] = []
    for (const income of sorted) {
      const key = incomeSortDate(income).slice(0, 7)
      const title = format(new Date(incomeSortDate(income) + 'T12:00:00'), 'MMMM yyyy', {
        locale: ptBR,
      })
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.items.push(income)
      else groups.push({ key, title, items: [income] })
    }
    return groups
  }, [state.otherIncomes])

  const create = () => {
    setForm(blankIncome(deviceTodayKey()))
    setOpen(true)
  }

  const edit = (income: OtherIncome) => {
    const ref = deviceTodayKey()
    setForm({
      ...income,
      received: isOtherIncomeDisplayReceived(income, ref),
    })
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim() || !(form.amount > 0) || !form.date) return
    const withStatus = setOtherIncomeReceivedFlag(form, !!form.received, deviceTodayKey())
    upsertOtherIncome(withStatus)
    setOpen(false)
  }

  const toggleReceived = (income: OtherIncome) => {
    const ref = deviceTodayKey()
    const next = !isOtherIncomeDisplayReceived(income, ref)
    upsertOtherIncome(setOtherIncomeReceivedFlag(income, next, ref))
  }

  return (
    <PageEnter className="space-y-5">
      <div data-enter="header" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Receitas extras</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Presentes, PIX, ajuda de alguém — o que entra fora de salário e projetos. Recebido sobe
            a conta; pendente entra em “Falta entrar” e na sobra.
          </p>
        </div>
        <Button onClick={create}>
          <Plus size={16} /> Nova receita
        </Button>
      </div>

      <div
        data-enter="block"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-muted)]"
      >
        <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--ink)]">
          <Gift size={16} className="text-[var(--accent)]" />
          Como funciona
        </div>
        Igual à Vida/Cartão, mas ao contrário: marca como recebida e o valor sobe no caixa e nos
        dashboards (Meu mês, Agenda, Linha do tempo).
      </div>

      {state.otherIncomes.length === 0 ? (
        <div data-enter="block">
          <EmptyState
            title="Nenhuma receita extra"
            desc="Cadastre presentes em dinheiro, ajuda familiar ou qualquer entrada fora do trabalho."
            action={
              <Button onClick={create}>
                <Plus size={16} /> Cadastrar receita
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                  {group.title}
                </p>
                <div className="h-px flex-1 bg-[var(--line)]" />
              </div>
              {group.items.map((income) => {
                const received = isOtherIncomeDisplayReceived(income, today)
                const [y, m, d] = incomeSortDate(income).split('-')
                return (
                  <div
                    key={income.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[var(--ink)]">{income.name}</h3>
                        <span className="rounded-lg bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                          {d}
                          <span className="mx-0.5 text-[var(--ink-faint)]">/</span>
                          {m}
                          <span className="mx-0.5 text-[var(--ink-faint)]">/</span>
                          {y}
                        </span>
                        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold">
                          {income.recurring ? 'Recorrente' : 'Única'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleReceived(income)}
                          className={`rounded-full px-3 py-2 text-xs font-bold ${
                            received
                              ? 'bg-emerald-500/15 text-emerald-700'
                              : 'bg-amber-500/15 text-amber-800'
                          }`}
                        >
                          {received ? 'Recebida' : 'A receber'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {income.recurring && income.endDate ? `até ${income.endDate}` : ''}
                        {income.notes ? `${income.recurring && income.endDate ? ' · ' : ''}${income.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Money value={income.amount} className="text-lg" />
                      <Button variant="ghost" onClick={() => edit(income)}>
                        <Pencil size={14} /> Editar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Excluir a receita “${income.name}”?`))
                            removeOtherIncome(income.id)
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
        title="Receita extra"
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
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Presente da tia, PIX, ajuda..."
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={form.recurring ? 'recurring' : 'unique'}
              onChange={(e) =>
                setForm({ ...form, recurring: e.target.value === 'recurring' })
              }
            >
              <option value="unique">Única</option>
              <option value="recurring">Recorrente (todo mês)</option>
            </Select>
          </Field>
          <Field
            label="Status"
            hint="Recebida = já entrou (sobe o valor na conta). A receber = ainda não entrou (aparece em Falta entrar)."
          >
            <Select
              value={form.received ? 'received' : 'pending'}
              onChange={(e) => setForm({ ...form, received: e.target.value === 'received' })}
            >
              <option value="received">Recebida (já entrou na conta)</option>
              <option value="pending">A receber (ainda não entrou)</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor" hint="Centavos com vírgula: 10,50 · ou 1.545,75">
              <MoneyInput
                value={form.amount}
                onValueChange={(amount) => setForm({ ...form, amount })}
              />
            </Field>
            <Field label={form.recurring ? 'Início' : 'Data'}>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>
          {form.recurring && (
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
              placeholder="Quem deu, motivo..."
            />
          </Field>
        </div>
      </Modal>
    </PageEnter>
  )
}
