'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
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
import { updateUserCurrencies, updateDisplayCurrency } from '@/app/actions/currencies'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { fetchRateWithCache } from '@/lib/fx/frankfurter'
import type { Transaction, Debt, CurrencyGroup, Presupuesto, SavingsGoal, SavingsGoalStatus } from '@/types'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { writeOp } from '@/lib/db/write-adapter'
import { SyncStatusBadge } from '@/components/SyncStatusBadge'
import { OfflineBanner } from '@/components/OfflineBanner'
import {
  getTransactions as getTransactionsDexie,
  getDebts as getDebtsDexie,
  getPresupuestos as getPresupuestosDexie,
  getSavingsGoals as getSavingsGoalsDexie,
  getUserCurrencies as getUserCurrenciesDexie,
  getDisplayCurrency as getDisplayCurrencyDexie,
} from '@/lib/db/dal-offline'

const OFFLINE_ENABLED = process.env.NEXT_PUBLIC_OFFLINE === '1'

interface Props {
  userId: string
  /** null means offline mode — data will come from Dexie via useLiveQuery */
  transactions: Transaction[] | null
  debts: Debt[] | null
  presupuestos: Presupuesto[] | null
  savingsGoals: SavingsGoal[] | null
  currencies: string[] | null
  displayCurrency: string | null
}

type Tab = 'transactions' | 'debts' | 'presupuestos' | 'savings' | 'charts'

export function DashboardShell({ userId, transactions: serverTransactions, debts: serverDebts, presupuestos: serverPresupuestos, savingsGoals: serverSavingsGoals, currencies: serverCurrencies, displayCurrency: initialDisplayCurrency }: Props) {
  const [tab, setTab] = useState<Tab>('transactions')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [initialType, setInitialType] = useState<'income' | 'expense'>('expense')
  const [isPending, startTransition] = useTransition()
  const [pickerOpen, setPickerOpen] = useState(false)
  const { online } = useNetworkStatus()

  // ── Dexie live queries ───────────────────────────────────────────────
  // All useLiveQuery calls are unconditional (hooks rules) — OFFLINE_ENABLED
  // guards the actual query so it resolves to undefined when flag is off.

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieTransactions = useLiveQuery(
    () => (OFFLINE_ENABLED ? getTransactionsDexie(userId) : Promise.resolve(undefined)),
    [userId]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieDebts = useLiveQuery(
    () => (OFFLINE_ENABLED ? getDebtsDexie(userId) : Promise.resolve(undefined)),
    [userId]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexiePresupuestos = useLiveQuery(
    () => (OFFLINE_ENABLED ? getPresupuestosDexie(userId) : Promise.resolve(undefined)),
    [userId]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieSavingsGoals = useLiveQuery(
    () => (OFFLINE_ENABLED ? getSavingsGoalsDexie(userId) : Promise.resolve(undefined)),
    [userId]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieCurrencies = useLiveQuery(
    () => (OFFLINE_ENABLED ? getUserCurrenciesDexie(userId) : Promise.resolve(undefined)),
    [userId]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieDisplayCurrency = useLiveQuery(
    () => (OFFLINE_ENABLED ? getDisplayCurrencyDexie(userId) : Promise.resolve(undefined)),
    [userId]
  )

  // ── Resolved data sources ────────────────────────────────────────────
  const transactions: Transaction[] = OFFLINE_ENABLED
    ? (dexieTransactions ?? [])
    : (serverTransactions ?? [])

  const debts: Debt[] = OFFLINE_ENABLED
    ? (dexieDebts ?? [])
    : (serverDebts ?? [])

  const presupuestos: Presupuesto[] = OFFLINE_ENABLED
    ? (dexiePresupuestos ?? [])
    : (serverPresupuestos ?? [])

  const savingsGoals: SavingsGoal[] = OFFLINE_ENABLED
    ? (dexieSavingsGoals ?? [])
    : (serverSavingsGoals ?? [])

  const resolvedCurrencies: string[] = OFFLINE_ENABLED
    ? (dexieCurrencies ?? [])
    : (serverCurrencies ?? [])

  // Show skeleton while any Dexie query hasn't returned yet in offline mode
  const isHydrating = OFFLINE_ENABLED && (
    dexieTransactions === undefined ||
    dexieDebts === undefined ||
    dexiePresupuestos === undefined ||
    dexieSavingsGoals === undefined ||
    dexieCurrencies === undefined ||
    dexieDisplayCurrency === undefined
  )

  // displayCurrency: Dexie value when offline, server value when online
  // State is initialized from server; Dexie value takes over when OFFLINE_ENABLED
  const [activeDisplayCurrency, setActiveDisplayCurrency] = useState<string | null>(initialDisplayCurrency)

  // Sync Dexie-provided display currency into local state
  useEffect(() => {
    if (OFFLINE_ENABLED && dexieDisplayCurrency !== undefined) {
      setActiveDisplayCurrency(dexieDisplayCurrency ?? null)
    }
  }, [dexieDisplayCurrency])

  const [rates, setRates] = useState<Map<string, number>>(new Map())
  const [staleRates, setStaleRates] = useState<Set<string>>(new Set())
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState(false)
  const fetchIdRef = useRef(0)

  useEffect(() => {
    function handleOpenSettings() { setPickerOpen(true) }
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [])

  const effectiveCurrencies = resolvedCurrencies.length > 0 ? resolvedCurrencies : ['COP', 'USD']

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

  useEffect(() => {
    if (!activeDisplayCurrency) {
      setRatesLoading(false)
      setRatesError(false)
      return
    }

    const uniqueSources = [...new Set(currencyGroups.map(g => g.currency))]
    const missing = uniqueSources.filter(src => {
      const key = `${src}_${activeDisplayCurrency}`
      return src !== activeDisplayCurrency && !rates.has(key)
    })

    if (missing.length === 0) return

    const currentFetchId = ++fetchIdRef.current
    setRatesLoading(true)
    setRatesError(false)

    Promise.all(
      missing.map(src =>
        fetchRateWithCache(src, activeDisplayCurrency).then(r => ({
          pair: `${src}_${activeDisplayCurrency}`,
          rate: r.rate,
          stale: r.stale,
        }))
      )
    ).then(results => {
      if (fetchIdRef.current !== currentFetchId) return
      const newRates = new Map(rates)
      const newStale = new Set(staleRates)
      results.forEach(r => {
        newRates.set(r.pair, r.rate)
        if (r.stale) {
          newStale.add(r.pair)
        } else {
          newStale.delete(r.pair)
        }
      })
      setRates(newRates)
      setStaleRates(newStale)
      setRatesLoading(false)
    }).catch(() => {
      if (fetchIdRef.current !== currentFetchId) return
      setRatesError(true)
      setRatesLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDisplayCurrency, currencyGroups])

  function handleEdit(t: Transaction) {
    setEditing(t)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditing(null)
  }

  function handleTransactionSave(t: Omit<Transaction, 'id'>) {
    setEditing(null)
    setShowForm(false)

    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const type = t.income !== null ? 'income' : 'expense'
        if (editing) {
          const result = await writeOp('transaction.update', {
            id: editing.id,
            description: t.description,
            date: t.date,
            type,
            amount: String(t.income ?? t.expense ?? 0),
            currency: t.currency ?? 'COP',
            category: t.category ?? '',
          })
          if (!result.ok) toast.error(result.error)
          else toast.success('Registro actualizado')
        } else {
          const result = await writeOp('transaction.create', {
            user_id: userId,
            description: t.description.toUpperCase(),
            date: t.date,
            income: type === 'income' ? (t.income ?? 0) : null,
            expense: type === 'expense' ? (t.expense ?? 0) : null,
            currency: t.currency ?? 'COP',
            category: t.category ?? null,
          })
          if (!result.ok) toast.error(result.error)
          else toast.success('Registro agregado')
        }
      })
      return
    }

    const fd = new FormData()
    fd.set('description', t.description)
    fd.set('date', t.date)
    fd.set('type', t.income !== null ? 'income' : 'expense')
    fd.set('amount', String(t.income ?? t.expense ?? 0))
    fd.set('currency', t.currency ?? 'COP')
    fd.set('category', t.category ?? '')

    startTransition(async () => {
      const result = editing
        ? await updateTransaction(editing.id, fd)
        : await createTransaction(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Registro agregado')
    })
  }

  function handleDeleteTransaction(id: string) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('transaction.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Registro eliminado')
      })
      return
    }
    startTransition(async () => {
      const result = await deleteTransaction(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Registro eliminado')
    })
  }

  // ── Debt handlers ────────────────────────────────────────────────────

  function handleDebtAdd(d: Omit<Debt, 'id'>) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('debt.create', {
          id: crypto.randomUUID(),
          user_id: userId,
          description: d.description.toUpperCase(),
          amount: d.amount,
          currency: d.currency,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Deuda agregada')
      })
      return
    }

    const fd = new FormData()
    fd.set('description', d.description)
    fd.set('amount', String(d.amount))
    fd.set('currency', d.currency)

    startTransition(async () => {
      const result = await createDebt(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Deuda agregada')
    })
  }

  function handleDebtUpdate(d: Debt) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('debt.update', {
          id: d.id,
          description: d.description,
          amount: d.amount,
          currency: d.currency,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('description', d.description)
    fd.set('amount', String(d.amount))
    fd.set('currency', d.currency)

    startTransition(async () => {
      const result = await updateDebt(d.id, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  function handleDeleteDebt(id: string) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('debt.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Deuda eliminada')
      })
      return
    }
    startTransition(async () => {
      const result = await deleteDebt(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Deuda eliminada')
    })
  }

  function handleDebtPayment(debtId: string, fd: FormData) {
    if (OFFLINE_ENABLED) {
      const amountRaw = fd.get('amount') as string | null
      const note = fd.get('note') as string | null
      startTransition(async () => {
        const result = await writeOp('debt_payment.create', {
          id: crypto.randomUUID(),
          debt_id: debtId,
          amount: amountRaw ? parseFloat(amountRaw) : 0,
          note: note || null,
          paid_at: new Date().toISOString().split('T')[0],
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Pago registrado')
      })
      return
    }
    startTransition(async () => {
      const result = await createDebtPayment(debtId, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Pago registrado')
    })
  }

  // ── Presupuesto handlers ─────────────────────────────────────────────

  function handlePresupuestoCreate(p: { nombre: string; total: number; currency: string }) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto.create', {
          id: crypto.randomUUID(),
          user_id: userId,
          nombre: p.nombre.toUpperCase(),
          total: p.total,
          currency: p.currency,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Presupuesto creado')
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', p.nombre)
    fd.set('total', String(p.total))
    fd.set('currency', p.currency)
    startTransition(async () => {
      const result = await createPresupuesto(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Presupuesto creado')
    })
  }

  function handlePresupuestoUpdate(id: string, p: { nombre: string; total: number; currency: string }) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto.update', {
          id,
          nombre: p.nombre,
          total: p.total,
          currency: p.currency,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', p.nombre)
    fd.set('total', String(p.total))
    fd.set('currency', p.currency)
    startTransition(async () => {
      const result = await updatePresupuesto(id, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  function handlePresupuestoDelete(id: string) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Presupuesto eliminado')
      })
      return
    }
    startTransition(async () => {
      const result = await deletePresupuesto(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Presupuesto eliminado')
    })
  }

  function handlePresupuestoItemCreate(presupuestoId: string, item: { nombre: string; monto: number }) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto_item.create', {
          id: crypto.randomUUID(),
          presupuesto_id: presupuestoId,
          nombre: item.nombre.toUpperCase(),
          monto: item.monto,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Ítem agregado')
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', item.nombre)
    fd.set('monto', String(item.monto))
    startTransition(async () => {
      const result = await createPresupuestoItem(presupuestoId, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Ítem agregado')
    })
  }

  function handlePresupuestoItemUpdate(itemId: string, item: { nombre: string; monto: number }) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto_item.update', {
          id: itemId,
          nombre: item.nombre,
          monto: item.monto,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', item.nombre)
    fd.set('monto', String(item.monto))
    startTransition(async () => {
      const result = await updatePresupuestoItem(itemId, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  function handlePresupuestoItemDelete(itemId: string) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto_item.delete', { id: itemId })
        if (!result.ok) toast.error(result.error)
      })
      return
    }
    startTransition(async () => {
      const result = await deletePresupuestoItem(itemId)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  // ── Savings Goal handlers ────────────────────────────────────────────

  function handleGoalAdd(g: Omit<SavingsGoal, 'id'>) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('savings_goal.create', {
          id: crypto.randomUUID(),
          user_id: userId,
          nombre: g.nombre,
          monto_objetivo: g.monto_objetivo,
          currency: g.currency,
          status: 'active',
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Meta creada')
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', g.nombre)
    fd.set('monto_objetivo', String(g.monto_objetivo))
    fd.set('currency', g.currency)
    startTransition(async () => {
      const result = await createSavingsGoal(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Meta creada')
    })
  }

  function handleGoalUpdate(g: SavingsGoal) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('savings_goal.update', {
          id: g.id,
          nombre: g.nombre,
          monto_objetivo: g.monto_objetivo,
          currency: g.currency,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', g.nombre)
    fd.set('monto_objetivo', String(g.monto_objetivo))
    fd.set('currency', g.currency)
    startTransition(async () => {
      const result = await updateSavingsGoal(g.id, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  function handleGoalDelete(id: string) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('savings_goal.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Meta eliminada')
      })
      return
    }
    startTransition(async () => {
      const result = await deleteSavingsGoal(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Meta eliminada')
    })
  }

  function handleGoalStatus(id: string, status: SavingsGoalStatus) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('savings_goal.status', { goal_id: id, status })
        if (!result.ok) toast.error(result.error)
      })
      return
    }
    startTransition(async () => {
      const result = await updateGoalStatus(id, status)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  function handleContributionAdd(goalId: string, fd: FormData) {
    if (OFFLINE_ENABLED) {
      const montoRaw = fd.get('monto') as string | null
      const fecha = (fd.get('fecha') as string | null) || new Date().toISOString().split('T')[0]
      const nota = (fd.get('nota') as string | null) || null
      startTransition(async () => {
        const result = await writeOp('savings_contribution.create', {
          id: crypto.randomUUID(),
          goal_id: goalId,
          monto: montoRaw ? parseFloat(montoRaw) : 0,
          fecha,
          nota,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Contribución registrada')
      })
      return
    }
    startTransition(async () => {
      const result = await addContribution(goalId, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Contribución registrada')
    })
  }

  function handleContributionDelete(id: string) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('savings_contribution.delete', { id })
        if (!result.ok) toast.error(result.error)
      })
      return
    }
    startTransition(async () => {
      const result = await deleteContribution(id)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  // ── Currency handlers ────────────────────────────────────────────────

  function handleCurrenciesChange(codes: string[]) {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('user.currencies', { codes })
        if (!result.ok) toast.error(result.error)
      })
      return
    }
    startTransition(async () => {
      const result = await updateUserCurrencies(codes)
      if (result && 'error' in result) toast.error(result.error)
    })
  }

  function handleDisplayCurrencyChange(code: string | null) {
    setActiveDisplayCurrency(code)
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('user.display_currency', { code })
        if (!result.ok) toast.error(result.error)
        else toast.success('Moneda actualizada')
      })
      return
    }
    startTransition(async () => {
      const result = await updateDisplayCurrency(code)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Moneda actualizada')
    })
  }

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-zinc-400 dark:text-zinc-500 text-sm animate-pulse">Cargando datos...</div>
      </div>
    )
  }

  const showOfflineFirstBoot = OFFLINE_ENABLED && !online && transactions.length === 0

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      {/* Offline status banner */}
      {OFFLINE_ENABLED && <OfflineBanner />}
      {/* Header */}
      <header className="border-b border-zinc-200/60 bg-white/80 backdrop-blur sticky top-0 z-10 dark:border-zinc-800/60 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white">Finanzas</span>
            {OFFLINE_ENABLED && <SyncStatusBadge />}
            <button
              onClick={() => { setEditing(null); setInitialType('income'); setShowForm(true) }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
            >
              + Ingreso
            </button>
            <button
              onClick={() => { setEditing(null); setInitialType('expense'); setShowForm(true) }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/30"
            >
              + Egreso
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Summary cards */}
        <SummaryCards
          groups={currencyGroups}
          displayCurrency={activeDisplayCurrency}
          rates={rates}
          staleRates={staleRates}
          ratesLoading={ratesLoading}
          ratesError={ratesError}
        />

        {/* Tabs */}
        <div>
          <div className="mb-4 overflow-x-auto -mx-4 px-4 pb-1">
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/50 p-1 w-max dark:border-zinc-800 dark:bg-zinc-900/50">
            <button
              onClick={() => setTab('transactions')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                tab === 'transactions'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Registros
            </button>
            <button
              onClick={() => setTab('debts')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
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
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
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
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
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
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
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
            <>
              {showOfflineFirstBoot ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30 px-5 py-6 text-center text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-semibold mb-1">Sin datos locales</p>
                  <p>Conectate una vez para cargar tus datos. Despues podras usarlos sin conexion.</p>
                </div>
              ) : (
                <TransactionTable
                  transactions={transactions}
                  onEdit={handleEdit}
                  onDelete={handleDeleteTransaction}
                  isPending={isPending}
                />
              )}
            </>
          )}
          {tab === 'debts' && (
            <DebtSection
              debts={debts}
              onAdd={handleDebtAdd}
              onUpdate={handleDebtUpdate}
              onDelete={handleDeleteDebt}
              onPayment={handleDebtPayment}
              isPending={isPending}
              currencies={effectiveCurrencies}
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
              currencies={effectiveCurrencies}
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
              currencies={effectiveCurrencies}
            />
          )}
          {tab === 'charts' && <ChartsSection transactions={transactions} />}
        </div>
      </main>

      {/* Transaction form modal */}
      {showForm && (
        <TransactionForm
          onSave={handleTransactionSave}
          onClose={handleCloseForm}
          editing={editing}
          initialType={initialType}
          currencies={effectiveCurrencies}
        />
      )}

      {/* Settings modal */}
      {pickerOpen && (
        <CurrencyPicker
          selected={effectiveCurrencies}
          displayCurrency={activeDisplayCurrency}
          onClose={() => setPickerOpen(false)}
          onDisplayCurrencyChange={handleDisplayCurrencyChange}
          onCurrenciesChange={handleCurrenciesChange}
        />
      )}
    </div>
  )
}
