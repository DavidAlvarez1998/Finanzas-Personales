'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Transaction, Debt, FinanzasState } from '@/types'

const STORAGE_KEY = 'finanzas_personales_v1'

const initialState: FinanzasState = {
  transactions: [],
  debts: [],
}

export function useFinanzas() {
  const [state, setState] = useState<FinanzasState>(initialState)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setState(JSON.parse(raw))
    } catch {
      // corrupt data — start fresh
    }
    setLoaded(true)
  }, [])

  const persist = useCallback((next: FinanzasState) => {
    setState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setState(prev => {
      const next = {
        ...prev,
        transactions: [
          ...prev.transactions,
          { ...t, id: crypto.randomUUID() },
        ],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateTransaction = useCallback((updated: Transaction) => {
    setState(prev => {
      const next = {
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === updated.id ? updated : t
        ),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const addDebt = useCallback((d: Omit<Debt, 'id'>) => {
    setState(prev => {
      const next = {
        ...prev,
        debts: [...prev.debts, { ...d, id: crypto.randomUUID() }],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateDebt = useCallback((updated: Debt) => {
    setState(prev => {
      const next = {
        ...prev,
        debts: prev.debts.map(d => (d.id === updated.id ? updated : d)),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteDebt = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        debts: prev.debts.filter(d => d.id !== id),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const totalIncome = state.transactions.reduce(
    (sum, t) => sum + (t.income ?? 0),
    0
  )
  const totalExpense = state.transactions.reduce(
    (sum, t) => sum + (t.expense ?? 0),
    0
  )
  const balance = totalIncome - totalExpense

  return {
    transactions: state.transactions,
    debts: state.debts,
    loaded,
    totalIncome,
    totalExpense,
    balance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addDebt,
    updateDebt,
    deleteDebt,
  }
}
