import { useState, useMemo, useEffect } from "react";

const fmt = (n) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.abs(n));

const MONTHS_META = [
  { label: "Junho 2026",    short: "Jun", emoji: "💍" },
  { label: "Julho 2026",    short: "Jul", emoji: "🎊" },
  { label: "Agosto 2026",   short: "Ago", emoji: "🌺" },
  { label: "Setembro 2026", short: "Set", emoji: "🌙" },
  { label: "Outubro 2026",  short: "Out", emoji: "🍂" },
  { label: "Novembro 2026", short: "Nov", emoji: "💫" },
  { label: "Dezembro 2026", short: "Dez", emoji: "💒" },
];

const TOTAL_REMAINING = 50947;
const SALAO_PM = 1557, SALAO_LAST = 1558;
const VESTIDO_PM = 300, VESTIDO_LAST = 200;
const DIA_PM = 368, DIA_LAST = 370;

const FLEX_ITEMS = [
  { name: "Materiais / Obra banheiro", amount: 6556, tag: "obra" },
  { name: "Alianças de Ouro",          amount: 2500, tag: "casamento" },
  { name: "Banda",                     amount: 600,  tag: "casamento" },
  { name: "Love – Decoração",          amount: 150,  tag: "casamento" },
  { name: "Open Bar",                  amount: 1200, tag: "casamento" },
  { name: "Terno do Noivo",            amount: 1000, tag: "casamento" },
  { name: "Buquê da Noiva",            amount: 250,  tag: "noiva"     },
  { name: "Lua de Mel",                amount: 6000, tag: "luademel"  },
  { name: "Mobília da Casa",           amount: 12000,tag: "casa"      },
];

function buildSchedule(monthly) {
  const sched = MONTHS_META.map((m, i) => {
    const last = i === 6, june = i === 0, july = i === 1;
    const payments = [];
    let rem = monthly;
    const add = (name, amount, tag) => { payments.push({ name, amount, tag }); rem -= amount; };

    add(last ? "Salão ✓ quitado" : "Salão de Festas", last ? SALAO_LAST : SALAO_PM, "salão");
    add(last ? "Vestido ✓ quitado (7/7)" : `Vestido (${i + 1}/7)`, last ? VESTIDO_LAST : VESTIDO_PM, "noiva");
    if (!june) add(last ? "Dia da Noiva ✓ quitado" : "Dia da Noiva", last ? DIA_LAST : DIA_PM, "noiva");
    if (june) { add("Obra banheiro (1ª parcela)", 200, "obra"); add("Fotógrafo – 1ª parcela", 1700, "foto"); add("Presentes Padrinhos", 440, "convites"); add("Presentes Damonsellies", 111, "convites"); }
    if (july) { add("Obra banheiro ✓ quitado", 600, "obra"); add("Fotógrafo ✓ quitado (2ª/2)", 1700, "foto"); }
    if (last) { add("Pré-Wedding", 830, "foto"); }

    return { ...m, payments, remainingBudget: Math.max(0, rem) };
  });

  const flex = FLEX_ITEMS.map(f => ({ ...f, paid: 0 }));
  for (let i = 0; i < sched.length; i++) {
    let budget = sched[i].remainingBudget;
    for (const item of flex) {
      if (budget <= 0) break;
      if (item.paid >= item.amount) continue;
      const needed = item.amount - item.paid;
      const pay = Math.min(budget, needed);
      const done = pay >= needed;
      const hasPartial = item.paid > 0;
      sched[i].payments.push({
        name: done ? (hasPartial ? `${item.name} ✓ quitado` : item.name) : `${item.name} (parcial)`,
        amount: pay,
        tag: item.tag,
      });
      item.paid += pay;
      budget -= pay;
    }
  }

  const unpaid = flex.filter(f => f.paid < f.amount).map(f => ({ ...f, remaining: f.amount - f.paid }));
  const deficit = unpaid.reduce((s, f) => s + f.remaining, 0);
  return { schedule: sched, deficit, unpaid };
}

const TAG_COLORS = {
  salão: "bg-purple-100 text-purple-700", noiva: "bg-pink-100 text-pink-700",
  foto: "bg-blue-100 text-blue-700",      casamento: "bg-rose-100 text-rose-700",
  casa: "bg-amber-100 text-amber-700",    luademel: "bg-cyan-100 text-cyan-700",
  convites: "bg-green-100 text-green-700",obra: "bg-orange-100 text-orange-700",
};
const TAG_LABEL = {
  salão: "Salão", noiva: "Noiva", foto: "Foto", obra: "Obra",
  casamento: "Festa", casa: "Casa", luademel: "Lua de Mel", convites: "Convites",
};

export default function App() {
  const [salaryInput,   setSalaryInput]   = useState("8800");
  const [expensesInput, setExpensesInput] = useState("2320");
  const [applied, setApplied] = useState({ salary: 8800, expenses: 2320 });
  const [tab, setTab]           = useState("cronograma");
  const [activeMonth, setActiveMonth] = useState(0);
  const [showDeficit, setShowDeficit] = useState(false);
  const [checked, setChecked] = useState({});   // { "Jun::Salão de Festas": true, ... }
  const [storageReady, setStorageReady] = useState(false);

  // Load checked state from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("wedding-checked");
        if (result?.value) setChecked(JSON.parse(result.value));
      } catch {}
      setStorageReady(true);
    })();
  }, []);

  // Save checked state whenever it changes
  useEffect(() => {
    if (!storageReady) return;
    (async () => {
      try { await window.storage.set("wedding-checked", JSON.stringify(checked)); } catch {}
    })();
  }, [checked, storageReady]);

  const toggleCheck = (monthShort, itemName) => {
    const key = `${monthShort}::${itemName}`;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isChecked = (monthShort, itemName) => !!checked[`${monthShort}::${itemName}`];

  const monthly      = applied.salary - applied.expenses;
  const totalSavings = monthly * 7;
  const { schedule, deficit, unpaid } = useMemo(() => buildSchedule(monthly), [monthly]);

  const m          = schedule[activeMonth] || schedule[0];
  const monthTotal = m?.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const paidTotal  = m?.payments?.reduce((s, p) => isChecked(m.short, p.name) ? s + p.amount : s, 0) || 0;
  const accumulated = schedule.map((_, i) => (i + 1) * monthly);
  const previewMonthly = (Number(salaryInput) || 0) - (Number(expensesInput) || 0);

  const handleRecalculate = () => {
    setApplied({ salary: Number(salaryInput) || 0, expenses: Number(expensesInput) || 0 });
    setActiveMonth(0);
    setShowDeficit(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 p-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-1">💒</div>
          <h1 className="text-xl font-bold text-rose-800">Casamento 12/12/2026</h1>
          <p className="text-rose-400 text-xs mt-0.5">Junho → Dezembro · 7 meses</p>
        </div>

        {/* CALCULADORA */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100 mb-4">
          <p className="font-bold text-gray-700 mb-3">💰 Calculadora de Poupança</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Salário bruto <span className="text-gray-300">(tudo que você recebe)</span></label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-rose-400 transition-colors">
                <span className="text-sm text-gray-400 mr-2 font-medium">R$</span>
                <input type="number" value={salaryInput} onChange={e => setSalaryInput(e.target.value)}
                  className="flex-1 text-sm font-bold text-gray-800 focus:outline-none bg-transparent" placeholder="10000" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Gastos pessoais <span className="text-gray-300">(o que você usa pra viver)</span></label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-rose-400 transition-colors">
                <span className="text-sm text-gray-400 mr-2 font-medium">R$</span>
                <input type="number" value={expensesInput} onChange={e => setExpensesInput(e.target.value)}
                  className="flex-1 text-sm font-bold text-gray-800 focus:outline-none bg-transparent" placeholder="2500" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex justify-between text-sm text-gray-500 mb-0.5">
                <span>Salário bruto</span><span>{fmt(Number(salaryInput) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Gastos pessoais</span><span>− {fmt(Number(expensesInput) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <span>💚 Sobra por mês</span>
                <span className={previewMonthly >= 0 ? "text-green-600" : "text-red-500"}>{fmt(previewMonthly)}</span>
              </div>
              {previewMonthly !== monthly && (
                <p className="text-xs text-rose-400 mt-1 text-center">↓ Clique em recalcular para aplicar</p>
              )}
            </div>
            <button onClick={handleRecalculate}
              className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold text-sm shadow active:scale-95 transition-transform">
              🔄 Recalcular Plano Completo
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-rose-100">
            <p className="text-xs text-gray-400 mb-0.5">Sobra/mês</p>
            <p className="text-base font-bold text-green-600">{fmt(monthly)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-rose-100">
            <p className="text-xs text-gray-400 mb-0.5">Total 7 meses</p>
            <p className="text-base font-bold text-green-600">{fmt(totalSavings)}</p>
          </div>
          <div onClick={() => setShowDeficit(!showDeficit)}
            className={`rounded-2xl p-3 text-center shadow-sm border cursor-pointer active:scale-95 transition-transform ${deficit === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <p className={`text-xs mb-0.5 ${deficit === 0 ? "text-green-500" : "text-amber-500"}`}>
              {deficit === 0 ? "✅ Coberto!" : "Déficit ❓"}
            </p>
            <p className={`text-base font-bold ${deficit === 0 ? "text-green-600" : "text-amber-600"}`}>
              {deficit === 0 ? "R$0" : fmt(deficit)}
            </p>
            {deficit > 0 && <p className="text-xs text-amber-400">toque</p>}
          </div>
        </div>

        {/* DEFICIT PANEL */}
        {showDeficit && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="font-bold text-amber-700 mb-1">📖 Déficit = o buraco</p>
            <p className="text-sm text-amber-700 mb-3">É a diferença entre o que você precisa pagar e o que vai conseguir juntar nos 7 meses.</p>
            <div className="bg-white rounded-xl p-3 text-sm border border-amber-100 space-y-1 mb-3">
              <div className="flex justify-between"><span className="text-gray-500">Falta pagar</span><span className="font-bold">{fmt(TOTAL_REMAINING)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vai juntar (7 meses)</span><span className="font-bold text-green-600">− {fmt(totalSavings)}</span></div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>= Déficit</span>
                <span className={deficit === 0 ? "text-green-600" : "text-amber-600"}>{fmt(deficit)}</span>
              </div>
            </div>
            {unpaid.length > 0 ? (
              <div>
                <p className="text-xs font-bold text-amber-700 mb-1">Itens que sobram pra depois:</p>
                {unpaid.map((u, i) => (
                  <div key={i} className="flex justify-between text-xs text-amber-700 py-0.5">
                    <span>{u.name}</span><span className="font-bold">falta {fmt(u.remaining)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-green-600 font-semibold">🎉 Tudo coberto com essa poupança!</p>
            )}
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2 mb-4">
          {[{ id: "cronograma", label: "📅 Cronograma" }, { id: "resumo", label: "📊 Resumo" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-rose-500 text-white shadow" : "bg-white text-gray-500 border border-rose-100"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CRONOGRAMA */}
        {tab === "cronograma" && m && (
          <div>
            {/* Month pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
              {schedule.map((s, i) => {
                const monthPaidCount = s.payments.filter(p => isChecked(s.short, p.name)).length;
                const allDone = monthPaidCount === s.payments.length && s.payments.length > 0;
                return (
                  <button key={i} onClick={() => setActiveMonth(i)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all relative ${
                      activeMonth === i ? "bg-rose-500 text-white shadow" : "bg-white text-gray-500 border border-rose-100"
                    }`}>
                    {allDone && <span className="absolute -top-1 -right-1 text-xs">✅</span>}
                    {s.emoji} {s.short}
                  </button>
                );
              })}
            </div>

            {/* Month card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100 mb-3">
              <div className="flex justify-between items-center mb-1">
                <h2 className="font-bold text-gray-800">{m.emoji} {m.label}</h2>
                <span className="text-sm font-bold text-rose-600">{fmt(monthTotal)}</span>
              </div>

              {/* Progress bar for month */}
              {paidTotal > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pago este mês</span>
                    <span className="text-green-600 font-semibold">{fmt(paidTotal)} / {fmt(monthTotal)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((paidTotal / monthTotal) * 100, 100)}%` }} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {m.payments.map((p, i) => {
                  const done = isChecked(m.short, p.name);
                  return (
                    <div key={i}
                      onClick={() => toggleCheck(m.short, p.name)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all active:scale-98 ${
                        done ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-transparent hover:border-gray-200"
                      }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Checkbox */}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          done ? "bg-green-500 border-green-500" : "border-gray-300"
                        }`}>
                          {done && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${TAG_COLORS[p.tag]}`}>
                          {TAG_LABEL[p.tag]}
                        </span>
                        <span className={`text-sm truncate ${done ? "line-through text-gray-400" : "text-gray-700"}`}>
                          {p.name}
                        </span>
                      </div>
                      <span className={`text-sm font-semibold ml-2 flex-shrink-0 ${done ? "text-green-500" : "text-gray-800"}`}>
                        {fmt(p.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* All paid message */}
              {paidTotal === monthTotal && monthTotal > 0 && (
                <div className="mt-3 text-center py-2 bg-green-50 rounded-xl border border-green-200">
                  <span className="text-green-600 text-sm font-bold">🎉 Mês {m.short} totalmente pago!</span>
                </div>
              )}
            </div>

            {/* Accumulated progress */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>💰 Acumulado até {m.short}</span>
                <span className="font-semibold text-green-600">{fmt(accumulated[activeMonth])}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-gradient-to-r from-rose-400 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${totalSavings > 0 ? Math.min((accumulated[activeMonth] / totalSavings) * 100, 100) : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Jun</span>
                <span>{totalSavings > 0 ? Math.round((accumulated[activeMonth] / totalSavings) * 100) : 0}%</span>
                <span>Dez — {fmt(totalSavings)}</span>
              </div>
            </div>
          </div>
        )}

        {/* RESUMO */}
        {tab === "resumo" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
              <p className="font-bold text-gray-800 mb-3">✅ Já Pago</p>
              {[["Entrada Salão", 2800], ["Obra – banheiro (parcial)", 400], ["Dia da Noiva (junho)", 400], ["Brownies / Lembranças", 550], ["Materiais obra", 2244]].map(([n, v]) => (
                <div key={n} className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">{n}</span>
                  <span className="text-green-600 font-semibold">{fmt(v)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1">
                <span>Total pago</span><span className="text-green-600">R$6.394</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
              <p className="font-bold text-gray-800 mb-3">📋 Total a Pagar</p>
              {[
                ["Salão de Festas", 10900], ["Fotógrafo Casamento", 3400],
                ["Pré-Wedding (dez)", 830], ["Vestido da Noiva", 2000],
                ["Dia da Noiva (restante)", 2210], ["Alianças de Ouro", 2500],
                ["Lua de Mel", 6000], ["Mobília da Casa", 12000],
                ["Open Bar", 1200], ["Banda", 600],
                ["Terno do Noivo", 1000], ["Love – Decoração", 150],
                ["Presentes Padrinhos", 440], ["Presentes Damonsellies", 111],
                ["Materiais / Obra banheiro (restante)", 6556],
                ["Obra banheiro – mão de obra (restante)", 800],
              ].map(([n, v]) => (
                <div key={n} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray