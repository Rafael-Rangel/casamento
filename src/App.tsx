import { useState } from 'react'
import {
  CalendarRange,
  LayoutDashboard,
  Briefcase,
  Receipt,
  Wallet,
  CircleDollarSign,
  Heart,
  CalendarDays,
  Home,
  RotateCcw,
} from 'lucide-react'
import { FinanceProvider, useFinance } from './context/FinanceContext'
import { Dashboard } from './components/Dashboard'
import { WeddingPage } from './components/WeddingPage'
import { AgendaPage } from './components/AgendaPage'
import { MeuMesPage } from './components/MeuMesPage'
import { SalariesPage } from './components/SalariesPage'
import { ProjectsPage } from './components/ProjectsPage'
import { ExpensesPage } from './components/ExpensesPage'
import { OtherIncomePage } from './components/OtherIncomePage'
import { TimelinePage } from './components/TimelinePage'
import { Button } from './components/ui'

type Tab =
  | 'meumes'
  | 'wedding'
  | 'agenda'
  | 'dashboard'
  | 'timeline'
  | 'salaries'
  | 'projects'
  | 'expenses'
  | 'other'

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'meumes', label: 'Meu mês', icon: Home },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'wedding', label: 'Casamento', icon: Heart },
  { id: 'projects', label: 'Projetos', icon: Briefcase },
  { id: 'salaries', label: 'Salários', icon: Wallet },
  { id: 'expenses', label: 'Vida & cartão', icon: Receipt },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'timeline', label: 'Linha do tempo', icon: CalendarRange },
  { id: 'other', label: 'Outras receitas', icon: CircleDollarSign },
]

function Shell() {
  const [tab, setTab] = useState<Tab>('meumes')
  const { resetAll } = useFinance()

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-5 pb-28 lg:flex-row lg:pb-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-5 space-y-6">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight text-[var(--ink)]">
              Casamento
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Entra · paga · sobra pra você
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
                    ? 'bg-[var(--ink)] text-white'
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
        {tab === 'meumes' && <MeuMesPage />}
        {tab === 'wedding' && <WeddingPage />}
        {tab === 'agenda' && <AgendaPage />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'timeline' && <TimelinePage />}
        {tab === 'salaries' && <SalariesPage />}
        {tab === 'projects' && <ProjectsPage />}
        {tab === 'expenses' && <ExpensesPage />}
        {tab === 'other' && <OtherIncomePage />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg justify-between gap-0.5 overflow-x-auto px-1 py-2">
          {NAV.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex min-w-[3.6rem] flex-1 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[9px] font-semibold ${
                tab === item.id
                  ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              <item.icon size={15} />
              <span className="truncate">{item.label.split(' ')[0]}</span>
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
