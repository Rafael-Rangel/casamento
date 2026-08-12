import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { formatBrMoney, parseBrMoney, sanitizeBrMoneyInput } from '../lib/format'
import { gsap, prefersReducedMotion, registerGsap, useGSAP } from '../lib/gsapSetup'

registerGsap()

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-[var(--ink-faint)]">{hint}</span>}
    </label>
  )
}

const controlClass =
  'w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className || ''}`} />
}

/** Input de dinheiro no padrão BR — vírgula = centavos (10,50 / 1.545,75). */
export function MoneyInput({
  value,
  onValueChange,
  className = '',
  placeholder = '0,00',
  disabled,
  id,
  name,
  autoFocus,
}: {
  value: number
  onValueChange: (n: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
  autoFocus?: boolean
}) {
  const [text, setText] = useState(() => formatBrMoney(value))
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return
    setText(formatBrMoney(value))
  }, [value])

  return (
    <input
      id={id}
      name={name}
      autoFocus={autoFocus}
      disabled={disabled}
      type="text"
      inputMode="decimal"
      lang="pt-BR"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      className={`${controlClass} tabular-nums ${className}`}
      onFocus={(e) => {
        focused.current = true
        // Seleciona tudo pra facilitar digitar de novo
        requestAnimationFrame(() => e.target.select())
      }}
      onChange={(e) => {
        const next = sanitizeBrMoneyInput(e.target.value)
        setText(next)
        // "10," ainda incompleto → trata como 10, sem apagar a vírgula na tela
        const toParse = next.endsWith(',') ? next.slice(0, -1) : next
        const parsed = parseBrMoney(toParse)
        if (Number.isFinite(parsed)) onValueChange(parsed)
        else if (!next || next === ',' || next === '0,') onValueChange(0)
      }}
      onBlur={() => {
        focused.current = false
        const parsed = parseBrMoney(text)
        if (Number.isFinite(parsed) && parsed !== 0) {
          setText(formatBrMoney(parsed))
          onValueChange(Math.round(parsed * 100) / 100)
        } else {
          setText('')
          onValueChange(0)
        }
      }}
    />
  )
}


export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className || ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClass} ${props.className || ''}`} />
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'soft'
}) {
  const styles = {
    primary: 'bg-[var(--rose)] text-white hover:bg-[var(--rose-strong)] shadow-sm',
    soft: 'bg-[var(--accent)] text-[#10151b] hover:brightness-110 font-semibold',
    ghost: 'bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)] border border-[var(--line)]',
    danger: 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30',
  }
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useGSAP(
    () => {
      if (!open || !root.current) return
      const q = gsap.utils.selector(root)
      const backdrop = q('[data-modal="backdrop"]')
      const panel = q('[data-modal="panel"]')

      if (prefersReducedMotion()) {
        gsap.set([backdrop, panel], { clearProps: 'all' })
        return
      }

      gsap.set(backdrop, { opacity: 0 })
      gsap.set(panel, { opacity: 0 })
      gsap
        .timeline({
          onComplete: () => gsap.set([backdrop, panel], { clearProps: 'opacity' }),
        })
        .to(backdrop, { opacity: 1, duration: 0.15 })
        .to(panel, { opacity: 1, duration: 0.18 }, '-=0.05')
    },
    { scope: root, dependencies: [open], revertOnUpdate: true },
  )

  if (!open || typeof document === 'undefined') return null

  // Portal no body: evita corte por perspective/transform do PageEnter (fixed vira relativo ao ancestral)
  return createPortal(
    <div
      ref={root}
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        data-modal="backdrop"
        aria-label="Fechar"
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          data-modal="panel"
          className={`relative w-full rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl ${
            wide ? 'max-w-2xl' : 'max-w-lg'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
            >
              Fechar
            </button>
          </div>

          <div className="px-5 py-4">{children}</div>

          {footer ? (
            <div className="border-t border-[var(--line)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {footer}
            </div>
          ) : (
            <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div
      data-enter="block"
      className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 px-6 py-10 text-center"
    >
      <p className="font-display text-lg font-bold text-[var(--ink)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{desc}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  const color =
    value > 0 ? 'text-[var(--positive)]' : value < 0 ? 'text-[var(--negative)]' : 'text-[var(--ink)]'
  return (
    <span className={`tabular-nums font-semibold ${color} ${className}`}>
      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
    </span>
  )
}
