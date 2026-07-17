import { useMemo, useState } from 'react'
import { Bot, Check, Gauge, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { AgentAction } from '../lib/agentActions'
import { Button, Textarea } from './ui'

interface RateLimitInfo {
  model: string
  plan: string
  published: { rpm: number; rpd: number; tpm: number; tpd: number }
  requests: { limit: number; remaining: number | null; reset: string | null }
  tokens: { limit: number; remaining: number | null; reset: string | null }
  lastCallTokens: number | null
  updatedAt: string
}

interface AgentResponse {
  reply: string
  actions?: AgentAction[]
  rateLimit?: RateLimitInfo
  error?: string
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

const DEFAULT_LIMITS: RateLimitInfo = {
  model: 'llama-3.3-70b-versatile',
  plan: 'free',
  published: { rpm: 30, rpd: 1000, tpm: 12000, tpd: 100000 },
  requests: { limit: 1000, remaining: null, reset: null },
  tokens: { limit: 12000, remaining: null, reset: null },
  lastCallTokens: null,
  updatedAt: '',
}

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

function meterTone(pctUsed: number) {
  if (pctUsed >= 90) return { bar: 'bg-[var(--negative)]', text: 'text-[var(--negative)]' }
  if (pctUsed >= 70) return { bar: 'bg-amber-400', text: 'text-amber-300' }
  return { bar: 'bg-[var(--positive)]', text: 'text-[var(--positive)]' }
}

function UsageMeter({
  label,
  used,
  limit,
  hint,
}: {
  label: string
  used: number
  limit: number
  hint: string
}) {
  const pct = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0
  const tone = meterTone(pct)
  return (
    <div>
      <div className="mb-1 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">
            {label}
          </p>
          <p className={`text-sm font-bold tabular-nums ${tone.text}`}>
            {used.toLocaleString('pt-BR')} / {limit.toLocaleString('pt-BR')}
          </p>
        </div>
        <p className="text-[10px] text-[var(--ink-faint)]">{Math.round(pct)}% usado</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-[var(--ink-faint)]">{hint}</p>
    </div>
  )
}

function LimitCard({ limits }: { limits: RateLimitInfo }) {
  const dayLimit = limits.requests.limit || limits.published.rpd
  const dayRemaining = limits.requests.remaining
  const dayUsed =
    dayRemaining === null ? 0 : Math.max(0, dayLimit - dayRemaining)

  const minuteLimit = limits.tokens.limit || limits.published.tpm
  const minuteRemaining = limits.tokens.remaining
  const minuteUsed =
    minuteRemaining === null ? 0 : Math.max(0, minuteLimit - minuteRemaining)

  const hasLive = dayRemaining !== null || minuteRemaining !== null

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--rose)]">
          <Gauge size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--ink)]">Limite gratuito Groq</p>
          <p className="text-xs text-[var(--ink-muted)]">
            Modelo {limits.model} · plano free
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <UsageMeter
          label="Mensagens do dia"
          used={hasLive ? dayUsed : 0}
          limit={dayLimit}
          hint={
            hasLive
              ? `${dayRemaining?.toLocaleString('pt-BR') ?? '—'} restantes · reseta ${limits.requests.reset || 'à meia-noite UTC'}`
              : `Até ${dayLimit.toLocaleString('pt-BR')} pedidos/dia · atualiza após a 1ª mensagem`
          }
        />
        <UsageMeter
          label="Tokens do minuto"
          used={hasLive ? minuteUsed : 0}
          limit={minuteLimit}
          hint={
            hasLive
              ? `${minuteRemaining?.toLocaleString('pt-BR') ?? '—'} restantes · reseta em ${limits.tokens.reset || '1 min'}`
              : `Até ${minuteLimit.toLocaleString('pt-BR')} tokens/min · conversas longas gastam mais`
          }
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[var(--ink-faint)] sm:grid-cols-4">
        <div className="rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
          <p>RPM</p>
          <p className="font-bold text-[var(--ink-muted)]">{limits.published.rpm}/min</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
          <p>RPD</p>
          <p className="font-bold text-[var(--ink-muted)]">{limits.published.rpd}/dia</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
          <p>TPM</p>
          <p className="font-bold text-[var(--ink-muted)]">
            {(limits.published.tpm / 1000).toFixed(0)}k/min
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
          <p>Última msg</p>
          <p className="font-bold text-[var(--ink-muted)]">
            {limits.lastCallTokens != null
              ? `${limits.lastCallTokens.toLocaleString('pt-BR')} tok`
              : '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-muted)]">
        Na prática: ~{limits.published.rpm} mensagens/minuto e até{' '}
        {limits.published.rpd.toLocaleString('pt-BR')} no dia. Se bater o limite, a barra fica
        laranja/vermelha e o agente pede para esperar.
      </p>
    </section>
  )
}

export function AgentPage() {
  const { state, projections, runAgentActions } = useFinance()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [limits, setLimits] = useState<RateLimitInfo>(DEFAULT_LIMITS)
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

      const data = (await res.json().catch(() => ({}))) as AgentResponse
      if (data.rateLimit) setLimits(data.rateLimit)

      if (!res.ok) {
        throw new Error(data.error || 'Não consegui falar com o agente agora.')
      }

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

      <LimitCard limits={limits} />

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
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-[var(--ink-faint)]">
            {limits.requests.remaining != null
              ? `${limits.requests.remaining} msgs restantes hoje`
              : 'Limite atualiza após enviar'}
          </p>
          <Button disabled={loading || !input.trim()} type="submit">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
            Enviar
          </Button>
        </div>
      </form>
    </div>
  )
}
