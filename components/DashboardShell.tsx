'use client'

import React, { useState, useTransition, useMemo, useEffect, useRef, useCallback } from 'react'
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { SummaryCards } from '@/components/SummaryCards'
import { TransactionTable } from '@/components/TransactionTable'
import dynamic from 'next/dynamic'
import { DebtSection } from '@/components/DebtSection'
import { PresupuestosSection } from '@/components/PresupuestosSection'
import { SavingsSection } from '@/components/SavingsSection'
import { AhorrosSection } from '@/components/AhorrosSection'
import { InversionesSection } from '@/components/InversionesSection'
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
import {
  createAhorroAccount,
  updateAhorroAccount,
  deleteAhorroAccount,
  updateAhorroAccountStatus,
  addMovimiento,
  deleteMovimiento,
} from '@/app/actions/ahorros'
import {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  updateInvestmentStatus,
  addReturn,
  deleteReturn,
} from '@/app/actions/investments'
import { updateUserCurrencies, updateDisplayCurrency } from '@/app/actions/currencies'
import { fetchRateWithCache } from '@/lib/fx/frankfurter'
import type { Transaction, Debt, CurrencyGroup, Presupuesto, SavingsGoal, SavingsGoalStatus, Investment, InvestmentStatus, AhorroAccount, AhorroAccountStatus, SummaryPeriod } from '@/types'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { db } from '@/lib/db/index'
import { writeOp } from '@/lib/db/write-adapter'
import { SyncStatusBadge } from '@/components/SyncStatusBadge'
import { OfflineBanner } from '@/components/OfflineBanner'
import { drainQueue } from '@/lib/db/sync'
import type { PendingOp } from '@/lib/db/schema'
import {
  getTransactions as getTransactionsDexie,
  getDebts as getDebtsDexie,
  getPresupuestos as getPresupuestosDexie,
  getSavingsGoals as getSavingsGoalsDexie,
  getInvestments as getInvestmentsDexie,
  getAhorroAccounts as getAhorroAccountsDexie,
  getUserCurrencies as getUserCurrenciesDexie,
  getDisplayCurrency as getDisplayCurrencyDexie,
} from '@/lib/db/dal-offline'
import { isHydrated } from '@/lib/db/hydration-flag'
import { ReceiptText, Landmark, LayoutList, Target, PiggyBank, TrendingUp, UserCircle } from 'lucide-react'

const OFFLINE_ENABLED = process.env.NEXT_PUBLIC_OFFLINE === '1'

// ── Mobile nav constants (exported for MobileBottomNav) ──────────────────────

export type TabKey = 'transactions' | 'debts' | 'presupuestos' | 'savings' | 'ahorros' | 'inversiones'

export interface BadgeCounts {
  debts: number
  presupuestos: number
  savings: number
  ahorros: number
  inversiones: number
}

export interface TabDef {
  key: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  getBadge: (counts: BadgeCounts) => number
}

export const TABS: TabDef[] = [
  { key: 'transactions', label: 'Registros',    icon: ReceiptText, getBadge: () => 0 },
  { key: 'debts',        label: 'Deudas',       icon: Landmark,    getBadge: c => c.debts },
  { key: 'presupuestos', label: 'Presupuestos', icon: LayoutList,  getBadge: c => c.presupuestos },
  { key: 'savings',      label: 'Metas',        icon: Target,      getBadge: c => c.savings },
  { key: 'ahorros',      label: 'Ahorros',      icon: PiggyBank,   getBadge: c => c.ahorros },
  { key: 'inversiones',  label: 'Inversiones',  icon: TrendingUp,  getBadge: c => c.inversiones },
]

export const PRIMARY_TAB_KEYS: TabKey[] = ['transactions', 'debts', 'presupuestos', 'savings', 'ahorros', 'inversiones']
export const MAS_TAB_KEYS: TabKey[]     = []

function filterTxByPeriod(t: Transaction, period: SummaryPeriod, now: Date): boolean {
  if (period === 'all') return true
  const txDate = t.date.includes('T') ? new Date(t.date) : new Date(t.date + 'T00:00:00')
  if (period === 'month') {
    return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth()
  }
  // '3months': tx date >= start of the month that is 2 months before `now`
  const startYear = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear()
  const startMonth = (now.getMonth() - 2 + 12) % 12
  const start = new Date(startYear, startMonth, 1)
  return txDate >= start
}

const ChartsSection = dynamic(
  () => import('@/components/ChartsSection').then(m => m.ChartsSection),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800"
          />
        ))}
      </div>
    ),
  }
)

const TransactionForm = dynamic(
  () => import('@/components/TransactionForm').then(m => m.TransactionForm),
  { ssr: false, loading: () => null }
)

const CurrencyPicker = dynamic(
  () => import('@/components/CurrencyPicker').then(m => m.CurrencyPicker),
  { ssr: false, loading: () => null }
)

const DeadLetterDrawer = dynamic(
  () => import('@/components/DeadLetterDrawer').then(m => m.DeadLetterDrawer),
  { ssr: false, loading: () => null }
)

const MobileBottomNav = dynamic(
  () => import('@/components/MobileBottomNav').then(m => m.MobileBottomNav),
  { ssr: false, loading: () => null }
)

interface Props {
  userId: string
  /** null means offline mode — data will come from Dexie via useLiveQuery */
  transactions: Transaction[] | null
  debts: Debt[] | null
  presupuestos: Presupuesto[] | null
  savingsGoals: SavingsGoal[] | null
  investments: Investment[] | null
  ahorroAccounts: AhorroAccount[] | null
  currencies: string[] | null
  displayCurrency: string | null
  userEmail?: string | null
  isSuperadmin?: boolean
}

type Tab = TabKey

export function DashboardShell({ userId, transactions: serverTransactions, debts: serverDebts, presupuestos: serverPresupuestos, savingsGoals: serverSavingsGoals, investments: serverInvestments, ahorroAccounts: serverAhorroAccounts, currencies: serverCurrencies, displayCurrency: initialDisplayCurrency, userEmail, isSuperadmin = false }: Props) {
  const [tab, setTab] = useState<Tab>('transactions')
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('all')
  const tabSwitched = useRef(false)
  const [viewMode, setViewMode] = useState<'list' | 'charts'>('list')
  const everHydrated = useState(() => isHydrated())[0]
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [initialType, setInitialType] = useState<'income' | 'expense'>('expense')
  const [isPending, startTransition] = useTransition()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { online } = useNetworkStatus()
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false)
  const shouldRenderForm = useDelayedUnmount(showForm, 120)
  const shouldRenderPicker = useDelayedUnmount(pickerOpen, 120)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const failedOps = useLiveQuery<PendingOp[], PendingOp[]>(
    () => (OFFLINE_ENABLED ? db.pending_ops.where('status').equals('failed').toArray() : Promise.resolve([])),
    [],
    []
  )

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
    () => (OFFLINE_ENABLED && tab === 'debts' ? getDebtsDexie(userId) : Promise.resolve(undefined)),
    [userId, tab]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexiePresupuestos = useLiveQuery(
    () => (OFFLINE_ENABLED && tab === 'presupuestos' ? getPresupuestosDexie(userId) : Promise.resolve(undefined)),
    [userId, tab]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieSavingsGoals = useLiveQuery(
    () => (OFFLINE_ENABLED && tab === 'savings' ? getSavingsGoalsDexie(userId) : Promise.resolve(undefined)),
    [userId, tab]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieInvestments = useLiveQuery(
    () => (OFFLINE_ENABLED && tab === 'inversiones' ? getInvestmentsDexie(userId) : Promise.resolve(undefined)),
    [userId, tab]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dexieAhorroAccounts = useLiveQuery(
    () => (OFFLINE_ENABLED && tab === 'ahorros' ? getAhorroAccountsDexie(userId) : Promise.resolve(undefined)),
    [userId, tab]
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

  const investments: Investment[] = OFFLINE_ENABLED
    ? (dexieInvestments ?? [])
    : (serverInvestments ?? [])

  const ahorroAccounts: AhorroAccount[] = OFFLINE_ENABLED
    ? (dexieAhorroAccounts ?? [])
    : (serverAhorroAccounts ?? [])

  const resolvedCurrencies: string[] = OFFLINE_ENABLED
    ? (dexieCurrencies ?? [])
    : (serverCurrencies ?? [])

  // Show skeleton only on true cold start — if we've ever hydrated, trust Dexie
  // to resolve to [] in a frame or two and let components render empty states.
  // Only check always-on hooks: gated hooks return undefined by design when their tab is inactive,
  // so including them would cause a permanent "Cargando..." state on non-default tabs.
  const isHydrating = OFFLINE_ENABLED && !everHydrated && (
    dexieTransactions === undefined ||
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

  // Hydration watchdog — if still loading after 5s, show error/retry UI
  useEffect(() => {
    if (!isHydrating) return
    const timer = setTimeout(() => setHydrationTimedOut(true), 5000)
    return () => clearTimeout(timer)
  }, [isHydrating])

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

  const currencyGroupsForPeriod = useMemo<CurrencyGroup[]>(() => {
    const now = new Date()
    return Object.values(
      transactions
        .filter(t => filterTxByPeriod(t, summaryPeriod, now))
        .reduce<Record<string, CurrencyGroup>>((acc, t) => {
          const cur = t.currency ?? 'COP'
          if (!acc[cur]) acc[cur] = { currency: cur, income: 0, expense: 0, balance: 0 }
          acc[cur].income += t.income ?? 0
          acc[cur].expense += t.expense ?? 0
          acc[cur].balance = acc[cur].income - acc[cur].expense
          return acc
        }, {})
    )
  }, [transactions, summaryPeriod])

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

  const handleEdit = useCallback((t: Transaction) => {
    setEditing(t)
    setShowForm(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditing(null)
  }, [])

  const handleRetry = useCallback(async (id: string) => {
    await db.pending_ops.update(id, {
      status: 'queued',
      attempts: 0,
      error: null,
      error_class: undefined,
      updated_at: Date.now(),
    })
    const ran = await drainQueue()
    if (!ran) {
      toast.info('Sincronizando…')
    }
  }, [])

  const handleDismiss = useCallback(async (id: string) => {
    await db.pending_ops.delete(id)
  }, [])

  const handleTransactionSave = useCallback((t: Omit<Transaction, 'id'>) => {
    setEditing(null)
    setShowForm(false)

    const type = t.income !== null ? 'income' : 'expense'
    const amount = type === 'income' ? t.income : t.expense
    if (amount == null || !Number.isFinite(amount) || amount <= 0) {
      console.error('[transaction] invalid amount in payload', { type, t })
      toast.error('Error interno: monto inválido. Por favor reintentá.')
      return
    }

    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        if (editing) {
          const result = await writeOp('transaction.update', {
            id: editing.id,
            description: t.description,
            date: t.date,
            type,
            amount: String(amount),
            currency: t.currency ?? 'COP',
            category: t.category ?? '',
            notes: t.notes ?? null,
          })
          if (!result.ok) toast.error(result.error)
          else toast.success('Registro actualizado')
        } else {
          const result = await writeOp('transaction.create', {
            user_id: userId,
            description: t.description.toUpperCase(),
            date: t.date,
            income: type === 'income' ? amount : null,
            expense: type === 'expense' ? amount : null,
            currency: t.currency ?? 'COP',
            category: t.category ?? null,
            notes: t.notes ?? null,
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
    fd.set('type', type)
    fd.set('amount', String(amount))
    fd.set('currency', t.currency ?? 'COP')
    fd.set('category', t.category ?? '')
    if (t.notes) fd.set('notes', t.notes)

    startTransition(async () => {
      const result = editing
        ? await updateTransaction(editing.id, fd)
        : await createTransaction(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Registro agregado')
    })
  }, [editing, userId])

  const handleDeleteTransaction = useCallback((id: string) => {
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
  }, [])

  // ── Debt handlers ────────────────────────────────────────────────────

  const handleDebtAdd = useCallback((d: Omit<Debt, 'id'>) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('debt.create', {
          id: crypto.randomUUID(),
          user_id: userId,
          description: d.description.toUpperCase(),
          amount: d.amount,
          currency: d.currency,
          due_date: d.due_date ?? null,
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
    fd.set('due_date', d.due_date ?? '')

    startTransition(async () => {
      const result = await createDebt(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Deuda agregada')
    })
  }, [userId])

  const handleDebtUpdate = useCallback((d: Debt) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('debt.update', {
          id: d.id,
          description: d.description,
          amount: d.amount,
          currency: d.currency,
          due_date: d.due_date ?? null,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('description', d.description)
    fd.set('amount', String(d.amount))
    fd.set('currency', d.currency)
    fd.set('due_date', d.due_date ?? '')

    startTransition(async () => {
      const result = await updateDebt(d.id, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }, [])

  const handleDeleteDebt = useCallback((id: string) => {
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
  }, [])

  const handleDebtPayment = useCallback((debtId: string, fd: FormData) => {
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
  }, [])

  // ── Presupuesto handlers ─────────────────────────────────────────────

  const handlePresupuestoCreate = useCallback((p: { nombre: string; total: number; currency: string; mes: number; anio: number }) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto.create', {
          id: crypto.randomUUID(),
          user_id: userId,
          nombre: p.nombre.toUpperCase(),
          total: p.total,
          currency: p.currency,
          mes: p.mes,
          anio: p.anio,
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
    fd.set('mes', String(p.mes))
    fd.set('anio', String(p.anio))
    startTransition(async () => {
      const result = await createPresupuesto(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Presupuesto creado')
    })
  }, [userId])

  const handlePresupuestoUpdate = useCallback((id: string, p: { nombre: string; total: number; currency: string; mes: number; anio: number }) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto.update', {
          id,
          nombre: p.nombre,
          total: p.total,
          currency: p.currency,
          mes: p.mes,
          anio: p.anio,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', p.nombre)
    fd.set('total', String(p.total))
    fd.set('currency', p.currency)
    fd.set('mes', String(p.mes))
    fd.set('anio', String(p.anio))
    startTransition(async () => {
      const result = await updatePresupuesto(id, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }, [])

  const handlePresupuestoDelete = useCallback((id: string) => {
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
  }, [])

  const handlePresupuestoItemCreate = useCallback((presupuestoId: string, item: { nombre: string; monto: number; category?: string | null }) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto_item.create', {
          id: crypto.randomUUID(),
          presupuesto_id: presupuestoId,
          nombre: item.nombre.toUpperCase(),
          monto: item.monto,
          category: item.category ?? null,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Ítem agregado')
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', item.nombre)
    fd.set('monto', String(item.monto))
    fd.set('category', item.category ?? '')
    startTransition(async () => {
      const result = await createPresupuestoItem(presupuestoId, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Ítem agregado')
    })
  }, [])

  const handlePresupuestoItemUpdate = useCallback((itemId: string, item: { nombre: string; monto: number; category?: string | null }) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('presupuesto_item.update', {
          id: itemId,
          nombre: item.nombre,
          monto: item.monto,
          category: item.category ?? null,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', item.nombre)
    fd.set('monto', String(item.monto))
    fd.set('category', item.category ?? '')
    startTransition(async () => {
      const result = await updatePresupuestoItem(itemId, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }, [])

  const handlePresupuestoItemDelete = useCallback((itemId: string) => {
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
  }, [])

  // ── Savings Goal handlers ────────────────────────────────────────────

  const handleGoalAdd = useCallback((g: Omit<SavingsGoal, 'id'>) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('savings_goal.create', {
          id: crypto.randomUUID(),
          user_id: userId,
          nombre: g.nombre,
          monto_objetivo: g.monto_objetivo,
          currency: g.currency,
          status: 'active',
          fecha_objetivo: g.fecha_objetivo ?? null,
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
    fd.set('fecha_objetivo', g.fecha_objetivo ?? '')
    startTransition(async () => {
      const result = await createSavingsGoal(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Meta creada')
    })
  }, [userId])

  const handleGoalUpdate = useCallback((g: SavingsGoal) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('savings_goal.update', {
          id: g.id,
          nombre: g.nombre,
          monto_objetivo: g.monto_objetivo,
          currency: g.currency,
          fecha_objetivo: g.fecha_objetivo ?? null,
        })
        if (!result.ok) toast.error(result.error)
      })
      return
    }

    const fd = new FormData()
    fd.set('nombre', g.nombre)
    fd.set('monto_objetivo', String(g.monto_objetivo))
    fd.set('currency', g.currency)
    fd.set('fecha_objetivo', g.fecha_objetivo ?? '')
    startTransition(async () => {
      const result = await updateSavingsGoal(g.id, fd)
      if (result && 'error' in result) toast.error(result.error)
    })
  }, [])

  const handleGoalDelete = useCallback((id: string) => {
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
  }, [])

  const handleGoalStatus = useCallback((id: string, status: SavingsGoalStatus) => {
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
  }, [])

  const handleContributionAdd = useCallback((goalId: string, fd: FormData) => {
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
  }, [])

  const handleContributionDelete = useCallback((id: string) => {
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
  }, [])

  // ── Investment handlers ──────────────────────────────────────────────

  const handleCreateInvestment = useCallback((payload: Record<string, unknown>) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('investment.create', {
          user_id: userId,
          ...payload,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Inversión creada')
      })
      return
    }
    const fd = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (v != null) fd.set(k, String(v))
    })
    startTransition(async () => {
      const result = await createInvestment(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Inversión creada')
    })
  }, [userId])

  const handleUpdateInvestment = useCallback((id: string, payload: Record<string, unknown>) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('investment.update', { id, ...payload })
        if (!result.ok) toast.error(result.error)
        else toast.success('Inversión actualizada')
      })
      return
    }
    const fd = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (v != null) fd.set(k, String(v))
    })
    startTransition(async () => {
      const result = await updateInvestment(id, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Inversión actualizada')
    })
  }, [])

  const handleDeleteInvestment = useCallback((id: string) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('investment.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Inversión eliminada')
      })
      return
    }
    startTransition(async () => {
      const result = await deleteInvestment(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Inversión eliminada')
    })
  }, [])

  const handleUpdateInvestmentStatus = useCallback((id: string, status: InvestmentStatus) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('investment.status', { investment_id: id, status })
        if (!result.ok) toast.error(result.error)
        else toast.success('Estado actualizado')
      })
      return
    }
    startTransition(async () => {
      const result = await updateInvestmentStatus(id, status)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Estado actualizado')
    })
  }, [])

  const handleAddReturn = useCallback((investmentId: string, payload: Record<string, unknown>) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('investment_return.create', {
          investment_id: investmentId,
          ...payload,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Retorno registrado')
      })
      return
    }
    const fd = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (v != null) fd.set(k, String(v))
    })
    startTransition(async () => {
      const result = await addReturn(investmentId, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Retorno registrado')
    })
  }, [])

  const handleDeleteReturn = useCallback((id: string) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('investment_return.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Retorno eliminado')
      })
      return
    }
    startTransition(async () => {
      const result = await deleteReturn(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Retorno eliminado')
    })
  }, [])

  // ── Ahorro handlers ──────────────────────────────────────────────────

  const handleAhorroAdd = useCallback((fd: FormData) => {
    if (OFFLINE_ENABLED) {
      const nombreRaw = (fd.get('nombre') as string | null)?.trim() ?? ''
      const currency = (fd.get('currency') as string | null) ?? 'COP'
      startTransition(async () => {
        const result = await writeOp('ahorro_account.create', {
          id: crypto.randomUUID(),
          user_id: userId,
          nombre: nombreRaw.toUpperCase(),
          currency,
          status: 'active',
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Cuenta creada')
      })
      return
    }
    startTransition(async () => {
      const result = await createAhorroAccount(fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Cuenta creada')
    })
  }, [userId])

  const handleAhorroUpdate = useCallback((id: string, fd: FormData) => {
    if (OFFLINE_ENABLED) {
      const nombreRaw = (fd.get('nombre') as string | null)?.trim() ?? ''
      const currency = (fd.get('currency') as string | null) ?? 'COP'
      startTransition(async () => {
        const result = await writeOp('ahorro_account.update', {
          id,
          nombre: nombreRaw.toUpperCase(),
          currency,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Cuenta actualizada')
      })
      return
    }
    startTransition(async () => {
      const result = await updateAhorroAccount(id, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Cuenta actualizada')
    })
  }, [])

  const handleAhorroDelete = useCallback((id: string) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('ahorro_account.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Cuenta eliminada')
      })
      return
    }
    startTransition(async () => {
      const result = await deleteAhorroAccount(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Cuenta eliminada')
    })
  }, [])

  const handleAhorroStatus = useCallback((id: string, status: AhorroAccountStatus) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('ahorro_account.status', { account_id: id, status })
        if (!result.ok) toast.error(result.error)
        else toast.success(status === 'archived' ? 'Cuenta archivada' : 'Cuenta reactivada')
      })
      return
    }
    startTransition(async () => {
      const result = await updateAhorroAccountStatus(id, status)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success(status === 'archived' ? 'Cuenta archivada' : 'Cuenta reactivada')
    })
  }, [])

  const handleMovimientoAdd = useCallback((accountId: string, fd: FormData) => {
    if (OFFLINE_ENABLED) {
      const montoRaw = fd.get('monto') as string | null // already signed by UI
      const fecha = (fd.get('fecha') as string | null) || new Date().toISOString().split('T')[0]
      const nota = (fd.get('nota') as string | null) || null
      startTransition(async () => {
        const result = await writeOp('ahorro_movimiento.create', {
          id: crypto.randomUUID(),
          account_id: accountId,
          monto: montoRaw ? parseFloat(montoRaw) : 0, // sign preserved
          fecha,
          nota,
        })
        if (!result.ok) toast.error(result.error)
        else toast.success('Movimiento registrado')
      })
      return
    }
    startTransition(async () => {
      const result = await addMovimiento(accountId, fd)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Movimiento registrado')
    })
  }, [])

  const handleMovimientoDelete = useCallback((id: string) => {
    if (OFFLINE_ENABLED) {
      startTransition(async () => {
        const result = await writeOp('ahorro_movimiento.delete', { id })
        if (!result.ok) toast.error(result.error)
        else toast.success('Movimiento eliminado')
      })
      return
    }
    startTransition(async () => {
      const result = await deleteMovimiento(id)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Movimiento eliminado')
    })
  }, [])

  // ── Currency handlers ────────────────────────────────────────────────

  const handleCurrenciesChange = useCallback((codes: string[]) => {
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
  }, [])

  const handleDisplayCurrencyChange = useCallback((code: string | null) => {
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
  }, [])

  if (isHydrating) {
    if (hydrationTimedOut) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">Algo salió mal al cargar los datos.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-zinc-400 dark:text-zinc-500 text-sm animate-pulse">Cargando datos...</div>
      </div>
    )
  }

  const showOfflineFirstBoot = OFFLINE_ENABLED && !online && transactions.length === 0

  const badgeCounts: BadgeCounts = {
    debts: debts.length,
    presupuestos: presupuestos.length,
    savings: savingsGoals.length,
    ahorros: ahorroAccounts.length,
    inversiones: investments.length,
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-white" style={{ paddingTop: 'var(--banner-h, 0px)' }}>
      {/* Offline status banner */}
      {OFFLINE_ENABLED && <OfflineBanner />}
      {/* Header */}
      <header className="border-b border-zinc-200/60 bg-white/80 backdrop-blur sticky top-0 z-10 dark:border-zinc-800/60 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white">Finanzas</span>
            <button
              onClick={() => window.dispatchEvent(new Event('open-account-sheet'))}
              className="md:hidden p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              aria-label="Cuenta"
            >
              <UserCircle className="w-5 h-5" />
            </button>
            {OFFLINE_ENABLED && (
              <SyncStatusBadge
                drawerOpen={drawerOpen}
                onToggleDrawer={() => setDrawerOpen(v => !v)}
              />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6" style={{ paddingBottom: 'calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))' }}>
        {/* Summary cards — only relevant for the transactions tab */}
        {tab === 'transactions' && (
          <SummaryCards
            groups={currencyGroupsForPeriod}
            displayCurrency={activeDisplayCurrency}
            rates={rates}
            staleRates={staleRates}
            ratesLoading={ratesLoading}
            ratesError={ratesError}
            period={summaryPeriod}
            onPeriodChange={setSummaryPeriod}
          />
        )}

        {/* Tabs */}
        <div>
          <div className="mb-4 overflow-x-auto -mx-4 px-4 pb-1 hidden md:flex">
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/50 p-1 w-max dark:border-zinc-800 dark:bg-zinc-900/50">
            <button
              onClick={() => { tabSwitched.current = true; setTab('transactions') }}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                tab === 'transactions'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Registros
            </button>
            <button
              onClick={() => { tabSwitched.current = true; setTab('debts') }}
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
              onClick={() => { tabSwitched.current = true; setTab('presupuestos') }}
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
              onClick={() => { tabSwitched.current = true; setTab('savings') }}
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
              onClick={() => { tabSwitched.current = true; setTab('ahorros') }}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                tab === 'ahorros'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Ahorros
              {ahorroAccounts.length > 0 && (
                <span className="ml-2 rounded-full bg-sky-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {ahorroAccounts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { tabSwitched.current = true; setTab('inversiones') }}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                tab === 'inversiones'
                  ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Inversiones
              {investments.length > 0 && (
                <span className="ml-2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {investments.length}
                </span>
              )}
            </button>
          </div>
          </div>

          <div key={tab} className={tabSwitched.current ? 'animate-tab-enter' : undefined}>
          {tab === 'transactions' && (
            <>
              {showOfflineFirstBoot ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30 px-5 py-6 text-center text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-semibold mb-1">Sin datos locales</p>
                  <p>Conectate una vez para cargar tus datos. Despues podras usarlos sin conexion.</p>
                </div>
              ) : (
                <>
                  {/* View toggle: Lista | Gráficos */}
                  <div className="mb-4 flex justify-end">
                    <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/50 p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                          viewMode === 'list'
                            ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                      >
                        Lista
                      </button>
                      <button
                        onClick={() => setViewMode('charts')}
                        className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                          viewMode === 'charts'
                            ? 'bg-zinc-200 text-zinc-950 shadow dark:bg-zinc-700 dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                      >
                        Gráficos
                      </button>
                    </div>
                  </div>

                  <div key={viewMode} className="animate-tab-enter">
                  {viewMode === 'list' ? (
                    <TransactionTable
                      transactions={transactions}
                      onEdit={handleEdit}
                      onDelete={handleDeleteTransaction}
                      isPending={isPending}
                    />
                  ) : transactions.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                      Sin registros para mostrar gráficos.
                    </div>
                  ) : (
                    <ChartsSection transactions={transactions} />
                  )}
                  </div>
                </>
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
              transactions={transactions}
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
          {tab === 'ahorros' && (
            <AhorrosSection
              accounts={ahorroAccounts}
              onAdd={handleAhorroAdd}
              onUpdate={handleAhorroUpdate}
              onDelete={handleAhorroDelete}
              onAddMovimiento={handleMovimientoAdd}
              onDeleteMovimiento={handleMovimientoDelete}
              onUpdateStatus={handleAhorroStatus}
              isPending={isPending}
              currencies={effectiveCurrencies}
            />
          )}
          {tab === 'inversiones' && (
            <InversionesSection
              investments={investments}
              onCreateInvestment={handleCreateInvestment}
              onUpdateInvestment={handleUpdateInvestment}
              onDeleteInvestment={handleDeleteInvestment}
              onUpdateStatus={handleUpdateInvestmentStatus}
              onAddReturn={handleAddReturn}
              onDeleteReturn={handleDeleteReturn}
              isPending={isPending}
              currencies={effectiveCurrencies}
            />
          )}
          </div>
        </div>
      </main>

      {/* Transaction form modal */}
      {shouldRenderForm && (
        <TransactionForm
          onSave={handleTransactionSave}
          onClose={handleCloseForm}
          editing={editing}
          initialType={initialType}
          currencies={effectiveCurrencies}
          isPending={isPending}
          isOnline={online}
          className={!showForm ? 'animate-modal-out' : ''}
        />
      )}

      {/* Settings modal */}
      {shouldRenderPicker && (
        <CurrencyPicker
          selected={effectiveCurrencies}
          displayCurrency={activeDisplayCurrency}
          onClose={() => setPickerOpen(false)}
          onDisplayCurrencyChange={handleDisplayCurrencyChange}
          onCurrenciesChange={handleCurrenciesChange}
          className={!pickerOpen ? 'animate-modal-out' : ''}
        />
      )}

      {OFFLINE_ENABLED && drawerOpen && (
        <DeadLetterDrawer
          failedOps={failedOps}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
        />
      )}

      <MobileBottomNav
        tab={tab}
        onTabChange={(t) => { tabSwitched.current = true; setTab(t) }}
        badges={badgeCounts}
        userEmail={userEmail}
        isSuperadmin={isSuperadmin}
      />
    </div>
  )
}
