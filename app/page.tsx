'use client'

import { useState } from 'react'
import { useFinanzas } from '@/hooks/useFinanzas'
import { SummaryCards } from '@/components/SummaryCards'
import { TransactionTable } from '@/components/TransactionTable'
import { TransactionForm } from '@/components/TransactionForm'
import { DebtSection } from '@/components/DebtSection'
import type { Transaction } from '@/types'

type Tab = 'transactions' | 'debts'

export default function Home() {
  const {
    transactions, debts, loaded,
    totalIncome, totalExpense, balance,
    addTransaction, updateTransaction, deleteTransaction,
    addDebt, updateDebt, deleteDebt,
  } = useFinanzas()

  const [tab, setTab] = useState<Tab>('transactions')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  function handleEdit(t: Transaction) {
    setEditing(t)
    setShowForm(true)
  }

  function handleSave(t: Omit<Transaction, 'id'>) {
    if (editing) {
      updateTransaction({ ...editing, ...t })
      setEditing(null)
    } else {
      addTransaction(t)
    }
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditing(null)
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Control de Finanzas
            </h1>
            <p className="text-xs text-zinc-500">Gestión personal de ingresos y egresos</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/30"
          >
            + Nuevo Registro
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Summary cards */}
        <SummaryCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
        />

        {/* Tabs */}
        <div>
          <div className="mb-4 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1 w-fit">
            <button
              onClick={() => setTab('transactions')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'transactions'
                  ? 'bg-zinc-700 text-white shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Registros
            </button>
            <button
              onClick={() => setTab('debts')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'debts'
                  ? 'bg-zinc-700 text-white shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Deudas
              {debts.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-600 px-1.5 py-0.5 text-xs font-bold">
                  {debts.length}
                </span>
              )}
            </button>
          </div>

          {tab === 'transactions' ? (
            <TransactionTable
              transactions={transactions}
              onEdit={handleEdit}
              onDelete={deleteTransaction}
            />
          ) : (
            <DebtSection
              debts={debts}
              onAdd={addDebt}
              onUpdate={updateDebt}
              onDelete={deleteDebt}
            />
          )}
        </div>
      </main>

      {/* Transaction form modal */}
      {showForm && (
        <TransactionForm
          onSave={handleSave}
          onClose={handleCloseForm}
          editing={editing}
        />
      )}
    </div>
  )
}
