'use client'

import { useState, useTransition, useMemo } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { TransactionTable } from '@/components/TransactionTable'
import { TransactionForm } from '@/components/TransactionForm'
import { DebtSection } from '@/components/DebtSection'
import { ChartsSection } from '@/components/ChartsSection'
import { PresupuestosSection } from '@/components/PresupuestosSection'
import { SavingsSection } from '@/components/SavingsSection'
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/app/actions/transactions'
import { createDebt, updateDebt, deleteDebt, createDebtPayment } from '@/app/actions/debts'
import {
  createPresupuesto,
  updatePresupuesto,
  deletePresupuesto,
  createPresupuestoItem,
  updatePresupuestoItem,
  deletePresupuestoItem,
} from '@/app/actions/presupuestos'
import {
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addContribution,
  deleteContribution,
  updateGoalStatus,
} from '@/app/actions/savings'
import type { Transaction, Debt, CurrencyGroup, Presupuesto, SavingsGoal, SavingsGoalStatus } from '@/types'

interface Props {
  transactions: Transaction[]
  debts: Debt[]
  presupuestos: Presupuesto[]
  savingsGoals: SavingsGoal[]
}

type Tab = 'transactions' | 'debts' | 'presupuestos' | 'savings' | 'charts'

export function DashboardShell({ transactions, debts, presupuestos, savingsGoals }: Props) {
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

  function handlePresupuestoCreate(p: { nombre: string; total: number; currency: string }) {
    const fd = new FormData()
    fd.set('nombre', p.nombre)
    fd.set('total', String(p.total))
    fd.set('currency', p.currency)
    startTransition(async () => {
      const result = await createPresupuesto(fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handlePresupuestoUpdate(id: string, p: { nombre: string; total: number; currency: string }) {
    const fd = new FormData()
    fd.set('nombre', p.nombre)
    fd.set('total', String(p.total))
    fd.set('currency', p.currency)
    startTransition(async () => {
      const result = await updatePresupuesto(id, fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handlePresupuestoDelete(id: string) {
    startTransition(async () => {
      const result = await deletePresupuesto(id)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handlePresupuestoItemCreate(presupuestoId: string, item: { nombre: string; monto: number }) {
    const fd = new FormData()
    fd.set('nombre', item.nombre)
    fd.set('monto', String(item.monto))
    startTransition(async () => {
      const result = await createPresupuestoItem(presupuestoId, fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handlePresupuestoItemUpdate(itemId: string, item: { nombre: string; monto: number }) {
    const fd = new FormData()
    fd.set('nombre', item.nombre)
    fd.set('monto', String(item.monto))
    startTransition(async () => {
      const result = await updatePresupuestoItem(itemId, fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handlePresupuestoItemDelete(itemId: string) {
    startTransition(async () => {
      const result = await deletePresupuestoItem(itemId)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleGoalAdd(g: Omit<SavingsGoal, 'id'>) {
    const fd = new FormData()
    fd.set('nombre', g.nombre)
    fd.set('monto_objetivo', String(g.monto_objetivo))
    fd.set('currency', g.currency)
    startTransition(async () => {
      const result = await createSavingsGoal(fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleGoalUpdate(g: SavingsGoal) {
    const fd = new FormData()
    fd.set('nombre', g.nombre)
    fd.set('monto_objetivo', String(g.monto_objetivo))
    fd.set('currency', g.currency)
    startTransition(async () => {
      const result = await updateSavingsGoal(g.id, fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleGoalDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSavingsGoal(id)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleGoalStatus(id: string, status: SavingsGoalStatus) {
    startTransition(async () => {
      const result = await updateGoalStatus(id, status)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleContributionAdd(goalId: string, fd: FormData) {
    startTransition(async () => {
      const result = await addContribution(goalId, fd)
      if (result && 'error' in result) setActionError(result.error)
    })
  }

  function handleContributionDelete(id: string) {
    startTransition(async () => {
      const result = await deleteContribution(id)
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
          <div className="mb-4 overflow-x-auto -mx-4 px-4 pb-1">
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/50 p-1 w-max dark:border-zinc-800 dark:bg-zinc-900/50">
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
              onClick={() => setTab('presupuestos')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'presupuestos'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Presupuestos
              {presupuestos.length > 0 && (
                <span className="ml-2 rounded-full bg-sky-600 px-1.5 py-0.5 text-xs font-bold">
                  {presupuestos.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('savings')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                tab === 'savings'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Metas
              {savingsGoals.length > 0 && (
                <span className="ml-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {savingsGoals.length}
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
          {tab === 'presupuestos' && (
            <PresupuestosSection
              presupuestos={presupuestos}
              onCreate={handlePresupuestoCreate}
              onUpdate={handlePresupuestoUpdate}
              onDelete={handlePresupuestoDelete}
              onCreateItem={handlePresupuestoItemCreate}
              onUpdateItem={handlePresupuestoItemUpdate}
              onDeleteItem={handlePresupuestoItemDelete}
              isPending={isPending}
            />
          )}
          {tab === 'savings' && (
            <SavingsSection
              goals={savingsGoals}
              onAdd={handleGoalAdd}
              onUpdate={handleGoalUpdate}
              onDelete={handleGoalDelete}
              onAddContribution={handleContributionAdd}
              onDeleteContribution={handleContributionDelete}
              onUpdateStatus={handleGoalStatus}
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
