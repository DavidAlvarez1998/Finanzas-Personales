'use client'

import { useState, useTransition, useMemo } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { TransactionTable } from '@/components/TransactionTable'
import { TransactionForm } from '@/components/TransactionForm'
import { DebtSection } from '@/components/DebtSection'
import { ChartsSection } from '@/components/ChartsSection'
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/app/actions/transactions'
import { createDebt, updateDebt, deleteDebt, createDebtPayment } from '@/app/actions/debts'
import type { Transaction, Debt, CurrencyGroup } from '@/types'

interface Props {
  transactions: Transaction[]
  debts: Debt[]
}

type Tab = 'transactions' | 'debts' | 'charts'

export function DashboardShell({ transactions, debts }: Props) {
  const [tab, setTab] = useState<Tab>('transactions')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [initialType, setInitialType] = useState<'income' | 'expense'>('expense')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currencyGroups = useMemo<CurrencyGroup[]>(() => Object.values(
    transactions.reduce<Record<string, CurrencyGroup>>((acc, t) => {
      const cur = t.currency ?? 'COP'
      if (!acc[cur]) acc[cur] = { currency: cur, income: 0, expense: 0, balance: 0 }
      acc[cur].income += t.income ?? 0
      acc[cur].expense += t.expense ?? 0
      acc[cur].balance = acc[cur].income - acc[cur].expense
      return acc
    }, {})
  ), [transactions])

  function handleEdit(t: Transaction) {
    setEditing(t)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditing(null)
  }

  /**
   * TransactionForm calls onSave with the parsed fields.
   * We reconstruct a FormData so the Server Action receives the standard shape.
   */
  function handleTransactionSave(t: Omit<Transaction, 'id'>) {
    const fd = new FormData()
    fd.set('description', t.description)
    fd.set('date', t.date)
    fd.set('type', t.income !== null ? 'income' : 'expense')
    fd.set('amount', String(t.income ?? t.expense ?? 0))
    fd.set('currency', t.currency ?? 'COP')
    fd.set('category', t.category ?? '')

    setEditing(null)
    setShowForm(false)
    startTransition(async () => {
      const result = editing
        ? await updateTransaction(editing.id, fd)
        : await createTransaction(fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleDeleteTransaction(id: string) {
    startTransition(async () => {
      const result = await deleteTransaction(id)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleDebtAdd(d: Omit<Debt, 'id'>) {
    const fd = new FormData()
    fd.set('description', d.description)
    fd.set('amount', String(d.amount))
    fd.set('currency', d.currency)

    startTransition(async () => {
      const result = await createDebt(fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleDebtUpdate(d: Debt) {
    const fd = new FormData()
    fd.set('description', d.description)
    fd.set('amount', String(d.amount))
    fd.set('currency', d.currency)

    startTransition(async () => {
      const result = await updateDebt(d.id, fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleDeleteDebt(id: string) {
    startTransition(async () => {
      const result = await deleteDebt(id)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleDebtPayment(debtId: string, fd: FormData) {
    startTransition(async () => {
      const result = await createDebtPayment(debtId, fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      {/* Header */}
      <header className="border-b border-zinc-200/60 bg-white/80 backdrop-blur sticky top-0 z-10 dark:border-zinc-800/60 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
              Control de Finanzas
            </h1>
            <p className="text-xs text-zinc-500">Gestión personal de ingresos y egresos</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              onClick={() => { setEditing(null); setInitialType('income'); setShowForm(true) }}
              className="flex-1 sm:flex-none rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
            >
              + Ingreso
            </button>
            <button
              onClick={() => { setEditing(null); setInitialType('expense'); setShowForm(true) }}
              className="flex-1 sm:flex-none rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/30"
            >
              + Egreso
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Summary cards */}
        <SummaryCards groups={currencyGroups} />

        {/* Tabs */}
        <div>
          <div className="mb-4 flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/50 p-1 w-fit dark:border-zinc-800 dark:bg-zinc-900/50">
            <button
              onClick={() => setTab('transactions')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'transactions'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Registros
            </button>
            <button
              onClick={() => setTab('debts')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'debts'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Deudas
              {debts.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-600 px-1.5 py-0.5 text-xs font-bold">
                  {debts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('charts')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'charts'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Graficos
            </button>
          </div>

          {tab === 'transactions' && (
            <TransactionTable
              transactions={transactions}
              onEdit={handleEdit}
              onDelete={handleDeleteTransaction}
              isPending={isPending}
            />
          )}
          {tab === 'debts' && (
            <DebtSection
              debts={debts}
              onAdd={handleDebtAdd}
              onUpdate={handleDebtUpdate}
              onDelete={handleDeleteDebt}
              onPayment={handleDebtPayment}
              isPending={isPending}
            />
          )}
          {tab === 'charts' && <ChartsSection transactions={transactions} />}
        </div>
      </main>

      {/* Error toast */}
      {actionError && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-rose-300 bg-rose-50 px-5 py-3 text-sm text-rose-700 shadow-xl dark:border-rose-700/50 dark:bg-rose-950 dark:text-rose-300">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-4 text-rose-400 hover:text-rose-700 dark:text-rose-500 dark:hover:text-rose-300">✕</button>
        </div>
      )}

      {/* Transaction form modal */}
      {showForm && (
        <TransactionForm
          onSave={handleTransactionSave}
          onClose={handleCloseForm}
          editing={editing}
          initialType={initialType}
        />
      )}
    </div>
  )
}
