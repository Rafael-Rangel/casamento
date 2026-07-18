import { useEffect, useRef, useState } from 'react'
import {
  CalendarRange,
  Briefcase,
  Receipt,
  Wallet,
  Heart,
  CalendarDays,
  Home,
  RotateCcw,
  Download,
  Bot,
  Cloud,
  CloudOff,
  Loader2,
  LockKeyhole,
  LayoutGrid,
  X,
} from 'lucide-react'
import { FinanceProvider, useFinance } from './context/FinanceContext'
import { WeddingPage } from './components/WeddingPage'
import { AgendaPage } from './components/AgendaPage'
import { MeuMesPage } from './components/MeuMesPage'
import { SalariesPage } from './components/SalariesPage'
import { ProjectsPage } from './components/ProjectsPage'
import { ExpensesPage } from './components/ExpensesPage'
import { TimelinePage } from './components/TimelinePage'
import { AgentPage } from './components/AgentPage'
import { Button } from './components/ui'
import { gsap, registerGsap, useGSAP } from './lib/gsapSetup'

registerGsap()

type Tab =
  | 'meumes'
  | 'agenda'
  | 'wedding'
  | 'projects'
  | 'salaries'
  | 'expenses'
  | 'timeline'
  | 'agent'

type NavItem = { id: Tab; label: string; short: string; hint: string; icon: typeof Home }

const NAV: NavItem[] = [
  { id: 'meumes', label: 'Meu mês', short: 'Mês', hint: 'Sobra e pendências', icon: Home },
  { id: 'agenda', label: 'Agenda', short: 'Agenda', hint: 'Dia a dia', icon: CalendarDays },
  { id: 'wedding', label: 'Casamento', short: 'Casório', hint: 'Cronograma', icon: Heart },
  { id: 'agent', label: 'Agente', short: 'Agente', hint: 'Assistente IA', icon: Bot },
  { id: 'projects', label: 'Projetos', short: 'Projetos', hint: 'Receitas de clientes', icon: Briefcase },
  { id: 'salaries', label: 'Salários', short: 'Salários', hint: 'Fontes fixas', icon: Wallet },
  { id: 'expenses', label: 'Vida e Cartão', short: 'Vida', hint: 'Gastos do dia a dia', icon: Receipt },
  { id: 'timeline', label: 'Linha do tempo', short: 'Tempo', hint: 'Projeção mensal', icon: CalendarRange },
]

const NAV_GROUPS: { title: string; ids: Tab[] }[] = [
  { title: 'Visão', ids: ['meumes', 'agenda', 'timeline'] },
  { title: 'Casamento', ids: ['wedding', 'agent'] },
  { title: 'Dinheiro', ids: ['projects', 'salaries', 'expenses'] },
]

/** Atalhos fixos no dock mobile */
const DOCK: Tab[] = ['meumes', 'agenda', 'wedding', 'expenses']

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1')
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone))
    setIsStandalone(standalone)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (isStandalone || hidden || !deferred) return null

  return (
    <div className="mb-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--rose)]">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--ink)]">Instalar no celular</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Abre como app, funciona offline e fica na tela inicial.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              className="!py-2 text-xs"
              onClick={async () => {
                await deferred.prompt()
                await deferred.userChoice
                setDeferred(null)
              }}
            >
              Instalar
            </Button>
            <Button
              variant="ghost"
              className="!py-2 text-xs"
              onClick={() => {
                localStorage.setItem('pwa-install-dismissed', '1')
                setHidden(true)
              }}
            >
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CloudAccess() {
  const { cloudStatus, cloudError, loginCloud } = useFinance()
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)

  if (cloudStatus === 'checking' || cloudStatus === 'loading') {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[var(--rose)]" size={28} />
          <p className="mt-3 text-sm text-[var(--ink-muted)]">Conectando à nuvem...</p>
        </div>
      </div>
    )
  }

  if (cloudStatus !== 'locked') return null

  return (
    <div className="flex min-h-[85dvh] items-center justify-center px-3">
      <form
        className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!code.trim()) return
          setSending(true)
          await loginCloud(code.trim())
          setSending(false)
        }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--rose)]">
          <LockKeyhole size={24} />
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-bold">Dados do casamento</h1>
        <p className="mt-2 text-center text-sm text-[var(--ink-muted)]">
          Digite o código da família uma vez neste aparelho para acessar os dados sincronizados.
        </p>
        <input
          autoFocus
          inputMode="numeric"
          type="number"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código de acesso"
          className="mt-5 w-full rounded-xl border border-[var(--line)] bg-[var(--bg0)] px-4 py-3 text-center text-lg font-bold tracking-[0.25em] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
        {cloudError && <p className="mt-2 text-center text-xs text-[var(--negative)]">{cloudError}</p>}
        <Button type="submit" className="mt-4 w-full" disabled={sending || !code.trim()}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
          Acessar dados
        </Button>
      </form>
    </div>
  )
}

function CloudBadge() {
  const { cloudStatus, cloudError, cloudUpdatedAt, syncNow } = useFinance()
  const ok = cloudStatus === 'synced'
  const saving = cloudStatus === 'saving'
  const label = ok
    ? 'Salvo na nuvem'
    : saving
      ? 'Salvando...'
      : cloudStatus === 'offline'
        ? 'Offline'
        : 'Erro na nuvem'

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      title={cloudError || (cloudUpdatedAt ? `Atualizado ${cloudUpdatedAt}` : label)}
      className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold lg:mb-0 lg:justify-start ${
        ok
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : saving
            ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
            : 'border-orange-500/20 bg-orange-500/10 text-orange-300'
      }`}
    >
      {saving ? (
        <Loader2 size={14} className="animate-spin" />
      ) : ok ? (
        <Cloud size={14} />
      ) : (
        <CloudOff size={14} />
      )}
      {label}
    </button>
  )
}

function MobileMenu({
  open,
  tab,
  onClose,
  onSelect,
  onReset,
}: {
  open: boolean
  tab: Tab
  onClose: () => void
  onSelect: (id: Tab) => void
  onReset: () => void
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
      if (!open) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      const q = gsap.utils.selector(root)
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(q('[data-menu="backdrop"]'), { autoAlpha: 0, duration: 0.28 })
        .from(
          q('[data-menu="panel"]'),
          { yPercent: 14, autoAlpha: 0, duration: 0.42 },
          '-=0.12',
        )
        .from(
          q('[data-menu="tile"]'),
          {
            y: 18,
            autoAlpha: 0,
            duration: 0.36,
            stagger: { each: 0.035, from: 'start' },
          },
          '-=0.22',
        )
    },
    { scope: root, dependencies: [open], revertOnUpdate: true },
  )

  if (!open) return null

  const byId = Object.fromEntries(NAV.map((item) => [item.id, item])) as Record<Tab, NavItem>

  return (
    <div
      ref={root}
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <button
        type="button"
        data-menu="backdrop"
        className="absolute inset-0 bg-[#070b10]/72 backdrop-blur-md"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <div
        data-menu="panel"
        className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] border border-[var(--line)] border-b-0 bg-[var(--surface)]/95 shadow-2xl backdrop-blur-2xl"
      >
        <div className="app-menu-grid pointer-events-none absolute inset-0 opacity-[0.14]" />
        <div className="relative px-4 pb-[max(1.25rem,var(--safe-bottom))] pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                Navegação
              </p>
              <h2 className="font-display text-2xl font-extrabold text-[var(--ink)]">Todas as seções</h2>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Escolha um módulo — tudo sincronizado entre aparelhos.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-muted)] transition active:scale-95"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            {NAV_GROUPS.map((group) => (
              <section key={group.title}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  {group.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.ids.map((id) => {
                    const item = byId[id]
                    const active = tab === id
                    return (
                      <button
                        key={id}
                        type="button"
                        data-menu="tile"
                        onClick={() => onSelect(id)}
                        className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                          active
                            ? 'border-[var(--rose)]/50 bg-gradient-to-br from-[var(--rose)]/25 to-[var(--accent)]/10'
                            : 'border-[var(--line)] bg-[var(--bg0)]/70 hover:border-[var(--accent)]/35'
                        }`}
                      >
                        <div
                          className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                            active
                              ? 'bg-[var(--rose)] text-white'
                              : 'bg-[var(--surface-2)] text-[var(--accent)]'
                          }`}
                        >
                          <item.icon size={18} strokeWidth={active ? 2.4 : 2} />
                        </div>
                        <p className="font-display text-sm font-bold text-[var(--ink)]">{item.label}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-muted)]">
                          {item.hint}
                        </p>
                        {active && (
                          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--rose)]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-xs font-semibold text-[var(--ink-muted)] transition active:scale-[0.99]"
            onClick={onReset}
          >
            <RotateCcw size={14} /> Resetar dados
          </button>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('meumes')
  const [menuOpen, setMenuOpen] = useState(false)
  const { resetAll } = useFinance()
  const dockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
        if (!dockRef.current) return
        gsap.from(dockRef.current, {
          y: 28,
          autoAlpha: 0,
          duration: 0.55,
          delay: 0.12,
          ease: 'power3.out',
          clearProps: 'transform',
        })
      })
      return () => mm.revert()
    },
    { dependencies: [] },
  )

  const go = (id: Tab) => {
    setTab(id)
    setMenuOpen(false)
  }

  const dockItems = DOCK.map((id) => NAV.find((n) => n.id === id)!).filter(Boolean)
  const menuIsActive = !DOCK.includes(tab)

  return (
    <div className="app-shell mx-auto flex max-w-6xl flex-col gap-4 px-3 pt-3 sm:px-4 sm:pt-5 lg:flex-row lg:gap-6 lg:pb-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-5 space-y-6">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight text-[var(--ink)]">
              Casamento
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Recebe · casamento · sobra pra viver
            </p>
            <p className="mt-2 rounded-lg bg-[var(--surface-2)] px-2 py-1.5 text-[10px] font-medium leading-snug text-[var(--ink-muted)]">
              ✓ Sincronizado entre seus aparelhos
            </p>
          </div>
          <CloudBadge />
          <nav className="space-y-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  tab === item.id
                    ? 'bg-[var(--rose)] text-white'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
          <Button
            variant="ghost"
            className="w-full text-xs"
            onClick={() => {
              if (confirm('Resetar todos os dados para o estado inicial do casamento?'))
                resetAll()
            }}
          >
            <RotateCcw size={14} /> Resetar dados
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="lg:hidden">
          <CloudBadge />
          <InstallBanner />
        </div>
        {tab === 'meumes' && <MeuMesPage />}
        {tab === 'wedding' && <WeddingPage />}
        {tab === 'agenda' && <AgendaPage />}
        {tab === 'agent' && <AgentPage />}
        {tab === 'timeline' && <TimelinePage />}
        {tab === 'salaries' && <SalariesPage />}
        {tab === 'projects' && <ProjectsPage />}
        {tab === 'expenses' && <ExpensesPage />}
      </main>

      <nav
        className="app-nav-mobile fixed inset-x-0 bottom-0 z-40 lg:hidden"
        aria-label="Navegação principal"
      >
        <div ref={dockRef} className="app-dock mx-auto max-w-lg px-3">
          <div className="flex items-stretch gap-1 rounded-2xl border border-white/10 bg-[var(--surface)]/90 p-1.5 shadow-[0_-8px_40px_#00000066] backdrop-blur-2xl">
            {dockItems.map((item) => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition active:scale-95 ${
                    active
                      ? 'bg-gradient-to-b from-[var(--rose)]/30 to-[var(--accent)]/10 text-[var(--ink)]'
                      : 'text-[var(--ink-muted)]'
                  }`}
                >
                  <item.icon size={18} strokeWidth={active ? 2.4 : 2} />
                  <span className="truncate leading-tight">{item.short}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-label="Abrir menu de seções"
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition active:scale-95 ${
                menuIsActive || menuOpen
                  ? 'bg-gradient-to-b from-[var(--accent)]/25 to-transparent text-[var(--ink)]'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md border border-current/30">
                <LayoutGrid size={12} strokeWidth={2.4} />
              </span>
              <span className="truncate leading-tight">Menu</span>
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu
        open={menuOpen}
        tab={tab}
        onClose={() => setMenuOpen(false)}
        onSelect={go}
        onReset={() => {
          if (confirm('Resetar todos os dados para o estado inicial do casamento?')) {
            resetAll()
            setMenuOpen(false)
          }
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <FinanceProvider>
      <CloudAccess />
      <CloudApp />
    </FinanceProvider>
  )
}

function CloudApp() {
  const { cloudStatus } = useFinance()
  if (cloudStatus === 'checking' || cloudStatus === 'loading' || cloudStatus === 'locked') {
    return null
  }
  return <Shell />
}
