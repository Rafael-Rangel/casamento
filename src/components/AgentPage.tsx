import { useMemo, useState } from 'react'
import { Bot, Check, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { AgentAction } from '../lib/agentActions'
import { Button, Textarea } from './ui'

interface AgentResponse {
  reply: string
  actions?: AgentAction[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: AgentAction[]
  applied?: string[]
}

const SUGGESTIONS = [
  'Crie um salário de R$ 3.500 todo dia 5',
  'Adicione um projeto fechado em 50% agora e 50% mês que vem',
  'Quanto sobra se eu pagar tudo do casamento deste mês?',
  'Adicione uma despesa de vida parcelada no cartão',
]

function actionLabel(action: AgentAction) {
  switch (action.type) {
    case 'upsertSalary':
      return `Salvar salário: ${action.salary.name}`
    case 'removeSalary':
      return `Remover salário: ${action.idOrName}`
    case 'upsertProject':
      return `Salvar projeto: ${action.project.name}`
    case 'removeProject':
      return `Remover projeto: ${action.idOrName}`
    case 'upsertExpense':
      return `Salvar despesa: ${action.expense.name}`
    case 'removeExpense':
      return `Remover despesa: ${action.idOrName}`
    case 'upsertOtherIncome':
      return `Salvar receita: ${action.income.name}`
    case 'removeOtherIncome':
      return `Remover receita: ${action.idOrName}`
    case 'upsertCategory':
      return `Salvar categoria: ${action.category.name}`
    case 'removeCategory':
      return `Remover categoria: ${action.idOrName}`
    case 'updateCashBalance':
      return `Atualizar saldo: R$ ${action.cash.amount}`
    case 'upsertWeddingFlexItem':
      return `Salvar item do casamento: ${action.item.name}`
    case 'removeWeddingFlexItem':
      return `Remover item do casamento: ${action.idOrName}`
    case 'setWeddingCheck':
      return `${action.checked ? 'Marcar pago' : 'Marcar pendente'}: ${action.itemName}`
    case 'setProjectionMonths':
      return `Horizonte: ${action.months} meses`
  }
}

export function AgentPage() {
  const { state, projections, runAgentActions } = useFinance()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'hello',
      role: 'assistant',
      text:
        'Sou o agente do casamento. Posso tirar dúvidas, criar projetos, salários, despesas, receitas, itens do casamento e ajustar o saldo. Quando eu sugerir alterações, você confirma antes de salvar.',
    },
  ])

  const context = useMemo(
    () => ({
      state,
      projections: projections.slice(0, 12).map((p) => ({
        key: p.key,
        label: p.label,
        totalIncome: p.totalIncome,
        lifeExpense: p.lifeExpense,
        weddingBudget: p.weddingBudget,
        balance: p.balance,
      })),
    }),
    [state, projections],
  )

  async function send(text = input.trim()) {
    if (!text || loading) return
    setInput('')
    setLoading(true)
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text }
    setMessages((prev) => [...prev, userMessage])

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Não consegui falar com o agente agora.')
      }

      const data = (await res.json()) as AgentResponse
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: data.reply || 'Pronto.',
          actions: data.actions?.length ? data.actions : undefined,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text:
            err instanceof Error
              ? err.message
              : 'Não consegui responder agora. Verifique a configuração do Groq.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function apply(messageId: string, actions: AgentAction[]) {
    const applied = runAgentActions(actions)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, actions: undefined, applied: applied.length ? applied : ['Alterações aplicadas'] }
          : m,
      ),
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Assistente
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[var(--ink)]">
          Agente do casamento
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Peça em português: “cria”, “edita”, “calcula”, “organiza” ou “personaliza”.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => send(text)}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left text-xs font-semibold text-[var(--ink-muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
          >
            <Sparkles size={14} className="mb-2 text-[var(--rose)]" />
            {text}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border p-4 ${
              m.role === 'assistant'
                ? 'border-[var(--line)] bg-[var(--surface)]'
                : 'ml-8 border-[var(--accent-soft)] bg-[var(--accent-soft)]/60'
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">
              {m.role === 'assistant' ? <Bot size={14} /> : <Wand2 size={14} />}
              {m.role === 'assistant' ? 'Agente' : 'Você'}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">{m.text}</p>

            {m.actions && (
              <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--bg0)]/40 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                  Mudanças sugeridas
                </p>
                <ul className="space-y-1.5 text-xs text-[var(--ink-muted)]">
                  {m.actions.map((action, i) => (
                    <li key={`${action.type}-${i}`}>• {actionLabel(action)}</li>
                  ))}
                </ul>
                <Button className="mt-3 w-full text-xs" onClick={() => apply(m.id, m.actions!)}>
                  <Check size={14} /> Aplicar mudanças
                </Button>
              </div>
            )}

            {m.applied && (
              <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {m.applied.join(' · ')}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-muted)]">
            <Loader2 size={16} className="animate-spin" /> Pensando...
          </div>
        )}
      </section>

      <form
        className="sticky bottom-[calc(var(--nav-h)+var(--safe-bottom)+0.5rem)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-2xl lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <Textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: cria um projeto de R$ 4.000, 50% hoje e 50% em agosto..."
        />
        <div className="mt-2 flex justify-end">
          <Button disabled={loading || !input.trim()} type="submit">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
            Enviar
          </Button>
        </div>
      </form>
    </div>
  )
}
