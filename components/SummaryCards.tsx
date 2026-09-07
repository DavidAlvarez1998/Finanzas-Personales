'use client'

interface SummaryCardsProps {
  totalIncome: number
  totalExpense: number
  balance: number
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

export function SummaryCards({ totalIncome, totalExpense, balance }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700/70 mb-1 dark:text-emerald-400/70">
          Total Ingresos
        </p>
        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalIncome)}</p>
      </div>

      <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 dark:border-rose-800/40 dark:bg-rose-950/30">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-700/70 mb-1 dark:text-rose-400/70">
          Total Egresos
        </p>
        <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{fmt(totalExpense)}</p>
      </div>

      <div className={`rounded-xl border p-5 ${
        balance >= 0
          ? 'border-sky-300 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-950/30'
          : 'border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30'
      }`}>
        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
          balance >= 0 ? 'text-sky-700/70 dark:text-sky-400/70' : 'text-amber-700/70 dark:text-amber-400/70'
        }`}>
          Saldo Disponible
        </p>
        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-sky-700 dark:text-sky-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {fmt(balance)}
        </p>
      </div>
    </div>
  )
}
