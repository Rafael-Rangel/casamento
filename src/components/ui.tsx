import {
  useEffect,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[min(92dvh,92vh)] w-full flex-col rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-5 pb-3 pt-5">
          <h2 className="font-display text-xl font-bold text-[var(--ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
          >
            Fechar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[var(--line)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        ) : (
          <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4" />
        )}
      </div>
    </div>
  )
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 px-6 py-10 text-center">
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
