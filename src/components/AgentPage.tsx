import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  Check,
  ChevronDown,
  Gauge,
  Loader2,
  Mic,
  MicOff,
  Send,
  Square,
  Wand2,
} from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import type { AgentAction } from '../lib/agentActions'
import { Button, Textarea } from './ui'
import { PageEnter } from './PageEnter'

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
      return `Salvar receita extra: ${action.income.name}`
    case 'removeOtherIncome':
      return `Remover receita extra: ${action.idOrName}`
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

function TypingIndicator() {
  return (
    <div className="mr-auto flex max-w-[92%] items-center gap-3 rounded-2xl rounded-bl-md border border-[#3a5a6e]/70 bg-[#1a2d38] px-4 py-3 sm:max-w-[85%]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#243844] text-[#7eb3c9]">
        <Bot size={14} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#7eb3c9]">
          Agente
        </p>
        <div className="flex items-center gap-1.5" aria-label="Digitando">
          <span className="agent-typing-dot" />
          <span className="agent-typing-dot" style={{ animationDelay: '0.15s' }} />
          <span className="agent-typing-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  )
}

function LimitsMenu({ limits }: { limits: RateLimitInfo }) {
  const [open, setOpen] = useState(false)
  const dayLimit = limits.requests.limit || limits.published.rpd
  const dayRemaining = limits.requests.remaining
  const dayUsed = dayRemaining === null ? 0 : Math.max(0, dayLimit - dayRemaining)
  const minuteLimit = limits.tokens.limit || limits.published.tpm
  const minuteRemaining = limits.tokens.remaining
  const minuteUsed =
    minuteRemaining === null ? 0 : Math.max(0, minuteLimit - minuteRemaining)
  const hasLive = dayRemaining !== null || minuteRemaining !== null
  const dayPct = dayLimit > 0 ? (dayUsed / dayLimit) * 100 : 0
  const tone =
    dayPct >= 90 ? 'text-[var(--negative)]' : dayPct >= 70 ? 'text-amber-300' : 'text-[var(--ink-faint)]'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition hover:bg-[var(--surface-2)] ${tone}`}
        aria-expanded={open}
        title="Uso da API"
      >
        <Gauge size={12} className="opacity-60" />
        <span className="tabular-nums opacity-70">
          {hasLive && dayRemaining != null
            ? `${dayRemaining}`
            : '···'}
        </span>
        <ChevronDown
          size={11}
          className={`opacity-50 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-2xl">
            <p className="mb-2 text-xs font-bold text-[var(--ink)]">Limite Groq</p>
            <p className="mb-3 text-[10px] text-[var(--ink-muted)]">
              {limits.model} · plano {limits.plan}
            </p>
            <div className="space-y-3">
              <UsageMeter
                label="Mensagens do dia"
                used={hasLive ? dayUsed : 0}
                limit={dayLimit}
                hint={
                  hasLive
                    ? `${dayRemaining?.toLocaleString('pt-BR') ?? '—'} restantes`
                    : `Até ${dayLimit.toLocaleString('pt-BR')}/dia`
                }
              />
              <UsageMeter
                label="Tokens do minuto"
                used={hasLive ? minuteUsed : 0}
                limit={minuteLimit}
                hint={
                  hasLive
                    ? `${minuteRemaining?.toLocaleString('pt-BR') ?? '—'} restantes`
                    : `Até ${minuteLimit.toLocaleString('pt-BR')}/min`
                }
              />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--ink-faint)]">
              ~{limits.published.rpm} msgs/min ·{' '}
              {limits.published.rpd.toLocaleString('pt-BR')}/dia
              {limits.lastCallTokens != null
                ? ` · última: ${limits.lastCallTokens.toLocaleString('pt-BR')} tok`
                : ''}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Falha ao ler o áudio.'))
    reader.readAsDataURL(blob)
  })
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

export function AgentPage() {
  const { state, projections, runAgentActions } = useFinance()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [limits, setLimits] = useState<RateLimitInfo>(DEFAULT_LIMITS)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'hello',
      role: 'assistant',
      text:
        'Sou o agente do casamento. Posso tirar dúvidas, criar projetos, salários, despesas, receitas, itens do casamento e ajustar o saldo. Quando eu sugerir alterações, você confirma antes de salvar.',
    },
  ])

  const listRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function send(text = input.trim()) {
    if (!text || loading || recording || transcribing) return
    setInput('')
    setVoiceError(null)
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
          ? {
              ...m,
              actions: undefined,
              applied: applied.length ? applied : ['Alterações aplicadas'],
            }
          : m,
      ),
    )
  }

  async function startRecording() {
    setVoiceError(null)
    if (loading || transcribing) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Seu navegador não permite gravar áudio.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        void finishRecording(recorder.mimeType || mimeType || 'audio/webm')
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setVoiceError('Permissão de microfone negada ou indisponível.')
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      setRecording(false)
      return
    }
    recorder.stop()
    setRecording(false)
  }

  async function finishRecording(mimeType: string) {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null

    const blob = new Blob(chunksRef.current, { type: mimeType })
    chunksRef.current = []
    if (blob.size < 200) {
      setVoiceError('Áudio muito curto. Segure um pouco mais.')
      return
    }

    setTranscribing(true)
    setVoiceError(null)
    try {
      const audioBase64 = await blobToBase64(blob)
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      })
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Falha na transcrição.')
      const text = String(data.text || '').trim()
      if (!text) throw new Error('Não entendi o áudio.')
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Não consegui transcrever.')
    } finally {
      setTranscribing(false)
    }
  }

  function toggleMic() {
    if (recording) stopRecording()
    else void startRecording()
  }

  const busy = loading || recording || transcribing

  return (
    <PageEnter className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-2">
      <header data-enter="header" className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Assistente
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[var(--ink)] sm:text-3xl">
            Agente
          </h1>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)] sm:text-sm">
            Digite ou grave — o áudio vira texto no campo antes de enviar.
          </p>
        </div>
        <LimitsMenu limits={limits} />
      </header>

      <section
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth px-0.5 pr-1 [-webkit-overflow-scrolling:touch]"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            data-enter="item"
            className={`max-w-[92%] rounded-2xl border p-3.5 sm:max-w-[85%] ${
              m.role === 'assistant'
                ? 'mr-auto rounded-bl-md border-[#3a5a6e]/70 bg-[#1a2d38] text-[var(--ink)]'
                : 'ml-auto rounded-br-md border-[#c46a52]/45 bg-[#3a241f] text-[#f3e6e1]'
            }`}
          >
            <div
              className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${
                m.role === 'assistant' ? 'text-[#7eb3c9]' : 'text-[#ef9d86]'
              }`}
            >
              {m.role === 'assistant' ? <Bot size={14} /> : <Wand2 size={14} />}
              {m.role === 'assistant' ? 'Agente' : 'Você'}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>

            {m.actions && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#9aa8b3]">
                  Mudanças sugeridas
                </p>
                <ul className="space-y-1.5 text-xs text-[#c5d0d8]">
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
        {loading && <TypingIndicator />}
      </section>

      <form
        data-enter="block"
        className="shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-[0_-8px_28px_#00000055]"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        {(recording || transcribing || voiceError) && (
          <div className="mb-2 flex items-center gap-2 text-xs">
            {recording && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--negative)]">
                <span className="agent-rec-pulse h-2 w-2 rounded-full bg-[var(--negative)]" />
                Gravando… toque de novo para parar
              </span>
            )}
            {transcribing && (
              <span className="inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
                <Loader2 size={12} className="animate-spin" />
                Transcrevendo com Whisper…
              </span>
            )}
            {voiceError && !recording && !transcribing && (
              <span className="text-[var(--negative)]">{voiceError}</span>
            )}
          </div>
        )}

        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite ou grave sua mensagem…"
          className="max-h-28 min-h-[2.75rem] resize-none text-base"
          disabled={recording || transcribing}
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={loading || transcribing}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 disabled:opacity-50 ${
              recording
                ? 'border-[var(--negative)] bg-[var(--negative)]/15 text-[var(--negative)]'
                : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] hover:border-[var(--accent)]'
            }`}
            title={recording ? 'Parar gravação' : 'Gravar áudio (Whisper)'}
            aria-label={recording ? 'Parar gravação' : 'Gravar áudio'}
          >
            {transcribing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : recording ? (
              <Square size={16} fill="currentColor" />
            ) : typeof MediaRecorder !== 'undefined' ? (
              <Mic size={18} />
            ) : (
              <MicOff size={18} />
            )}
          </button>

          <Button
            disabled={busy || !input.trim()}
            type="submit"
            className="min-h-11"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Enviar
          </Button>
        </div>
      </form>
    </PageEnter>
  )
}
