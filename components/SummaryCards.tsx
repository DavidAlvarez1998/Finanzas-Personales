'use client'

interface SummaryCardsProps {
  totalIncome: number
  totalExpense: number
  balance: number
}

function fmt(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export function SummaryCards({ totalIncome, totalExpense, balance }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/70 mb-1">
          Total Ingresos
        </p>
        <p className="text-2xl font-bold text-emerald-400">{fmt(totalIncome)}</p>
      </div>

      <div className="rounded-xl border border-rose-800/40 bg-rose-950/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-400/70 mb-1">
          Total Egresos
        </p>
        <p className="text-2xl font-bold text-rose-400">{fmt(totalExpense)}</p>
      </div>

      <div className={`rounded-xl border p-5 ${
        balance >= 0
          ? 'border-sky-800/40 bg-sky-950/30'
          : 'border-amber-800/40 bg-amber-950/30'
      }`}>
        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
          balance >= 0 ? 'text-sky-400/70' : 'text-amber-400/70'
        }`}>
          Saldo Disponible
        </p>
        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-sky-400' : 'text-amber-400'}`}>
          {fmt(balance)}
        </p>
      </div>
    </div>
  )
}
