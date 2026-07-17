import { useEffect, useState } from 'react'
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

type Tab =
  | 'meumes'
  | 'agenda'
  | 'wedding'
  | 'projects'
  | 'salaries'
  | 'expenses'
  | 'timeline'
  | 'agent'

const NAV: { id: Tab; label: string; short: string; icon: typeof Home }[] = [
  { id: 'meumes', label: 'Meu mês', short: 'Mês', icon: Home },
  { id: 'agenda', label: 'Agenda', short: 'Agenda', icon: CalendarDays },
  { id: 'wedding', label: 'Casamento', short: 'Casório', icon: Heart },
  { id: 'agent', label: 'Agente', short: 'Agente', icon: Bot },
  { id: 'projects', label: 'Projetos', short: 'Projetos', icon: Briefcase },
  { id: 'salaries', label: 'Salários', short: 'Salários', icon: Wallet },
  { id: 'expenses', label: 'Vida e Cartão', short: 'Vida', icon: Receipt },
  { id: 'timeline', label: 'Linha do tempo', short: 'Tempo', icon: CalendarRange },
]

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

function Shell() {
  const [tab, setTab] = useState<Tab>('meumes')
  const { resetAll } = useFinance()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

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
              ✓ Salvo automaticamente neste aparelho
            </p>
          </div>
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
        className="app-nav-mobile fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-xl lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex max-w-lg gap-0.5 overflow-x-auto overscroll-x-contain px-1 pt-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`flex min-w-[3.35rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[9px] font-semibold transition active:scale-95 ${
                tab === item.id
                  ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              <item.icon size={18} strokeWidth={tab === item.id ? 2.4 : 2} />
              <span className="truncate leading-tight">{item.short}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <FinanceProvider>
      <Shell />
    </FinanceProvider>
  )
}
