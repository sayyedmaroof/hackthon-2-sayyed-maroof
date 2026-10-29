'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth-store'
import { DEFAULT_BOTTLE } from './fragrance-data'
import { createId, sanitizeName, storage } from './storage'
import { sanitizeNoteIds, validateAdd, type AddResult } from './validation'
import { simulatePlan, type PlanAction } from './ai/plan'
import type { Blend, BottleOptions, CartItem, Concentration, Layer, Order } from './types'

const MAX_QTY = 10

/** Full composition state so undo restores notes AND bottle settings. */
export interface CompositionSnapshot {
  noteIds: string[]
  concentration: Concentration
}

export interface ApplyPlanResult {
  ok: boolean
  message?: string
  warnings?: { id: string; message: string; suggestion?: string }[]
  snapshot?: CompositionSnapshot
  labels?: string[]
}

function emptyDraft(): Blend {
  return {
    id: 'draft',
    name: 'Untitled Blend',
    noteIds: [],
    bottle: { ...DEFAULT_BOTTLE },
    updatedAt: 0,
  }
}

interface StudioContextValue {
  hydrated: boolean
  draft: Blend
  cart: CartItem[]
  saved: Blend[]
  orders: Order[]
  cartCount: number
  editingCartItemId: string | null
  addNote: (noteId: string, layer?: Layer) => AddResult
  removeNote: (noteId: string) => void
  replaceNote: (oldId: string | undefined, newId: string) => AddResult
  /**
   * Atomically apply a validated assistant change set. The full plan is
   * simulated first; the draft is only touched when every step is valid.
   */
  applyAssistantPlan: (actions: readonly PlanAction[]) => ApplyPlanResult
  /** Restore a previous composition (notes + concentration) for undo. */
  restoreComposition: (snapshot: CompositionSnapshot) => boolean
  /** Capture the current composition for undo. */
  captureComposition: () => CompositionSnapshot
  clearDraft: () => void
  loadBlend: (input: { name: string; noteIds: string[]; bottle?: BottleOptions; presetId?: string }) => void
  openSaved: (id: string) => boolean
  setName: (name: string) => void
  setBottle: (patch: Partial<BottleOptions>) => void
  saveDraft: () => Blend
  deleteSaved: (id: string) => void
  addToCart: (blend?: Blend) => void
  editCartItem: (itemId: string) => boolean
  cancelEditCartItem: () => void
  setQuantity: (itemId: string, quantity: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  recordOrder: (order: Order) => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: { children: React.ReactNode }) {
  // Auth state drives PostgreSQL sync: signed-in users get their cart and
  // saved blends stored in the database instead of only in localStorage.
  const { status: authStatus } = useAuth()
  const [hydrated, setHydrated] = useState(false)
  const [draft, setDraft] = useState<Blend>(emptyDraft)
  const [cart, setCart] = useState<CartItem[]>([])
  const [saved, setSaved] = useState<Blend[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null)

  const syncedRef = useRef(false)
  const prevAuthStatus = useRef(authStatus)
  const pushTimer = useRef<number | undefined>(undefined)

  // localStorage is only available after mount; load persisted state once.
  useEffect(() => {
    const storedDraft = storage.loadDraft()
    setDraft(storedDraft ?? { ...emptyDraft(), id: createId('blend') })
    setCart(storage.loadCart())
    setSaved(storage.loadSaved())
    setOrders(storage.loadOrders())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) storage.saveDraft(draft)
  }, [draft, hydrated])
  useEffect(() => {
    if (hydrated) storage.saveCart(cart)
  }, [cart, hydrated])
  useEffect(() => {
    if (hydrated) storage.saveSaved(saved)
  }, [saved, hydrated])
  useEffect(() => {
    if (hydrated) storage.saveOrders(orders)
  }, [orders, hydrated])

  // Merge helper: keep server rows, append any local-only entries (by id).
  const mergeCart = (server: CartItem[], local: CartItem[]): CartItem[] => {
    const seen = new Set(server.map((item) => item.id))
    return [...server, ...local.filter((item) => !seen.has(item.id))]
  }
  const mergeSaved = (server: Blend[], local: Blend[]): Blend[] => {
    const seen = new Set(server.map((b) => b.id))
    return [...server, ...local.filter((b) => !seen.has(b.id))]
  }

  // On sign-in: pull the account's cart + saved blends and merge with local data.
  useEffect(() => {
    if (authStatus !== 'authed' || syncedRef.current) return
    syncedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const [cartRes, savedRes] = await Promise.all([
          fetch('/api/cart', { cache: 'no-store' }),
          fetch('/api/saved', { cache: 'no-store' }),
        ])
        if (cancelled) return
        const cartData = (await cartRes.json().catch(() => null)) as { items?: CartItem[] } | null
        const savedData = (await savedRes.json().catch(() => null)) as { blends?: Blend[] } | null
        if (cancelled) return
        // Hydration may not have finished yet; read the freshest values.
        setCart((current) => mergeCart(Array.isArray(cartData?.items) ? cartData.items : [], current))
        setSaved((current) => mergeSaved(Array.isArray(savedData?.blends) ? savedData.blends : [], current))
      } catch {
        // Offline or DB down: keep working in memory.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authStatus])

  // On sign-out: local cart/saved were account data in the DB; clear them.
  useEffect(() => {
    if (prevAuthStatus.current === 'authed' && authStatus === 'guest') {
      syncedRef.current = false
      setCart([])
      setSaved([])
      setEditingCartItemId(null)
    }
    prevAuthStatus.current = authStatus
  }, [authStatus])

  // While signed in, keep the database in sync with local changes (debounced).
  useEffect(() => {
    if (authStatus !== 'authed' || !hydrated || !syncedRef.current) return
    window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(() => {
      void fetch('/api/cart', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      }).catch(() => {})
      void fetch('/api/saved', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blends: saved }),
      }).catch(() => {})
    }, 350)
    return () => window.clearTimeout(pushTimer.current)
  }, [authStatus, hydrated, cart, saved])

  const touch = (blend: Blend): Blend => ({ ...blend, updatedAt: Date.now() })

  const addNote = useCallback(
    (noteId: string, layer?: Layer) => {
      const result = validateAdd(draft.noteIds, noteId, layer)
      if (result.ok) setDraft((d) => touch({ ...d, noteIds: [...d.noteIds, noteId] }))
      return result
    },
    [draft.noteIds],
  )

  const removeNote = useCallback((noteId: string) => {
    setDraft((d) => touch({ ...d, noteIds: d.noteIds.filter((id) => id !== noteId) }))
  }, [])

  const replaceNote = useCallback(
    (oldId: string | undefined, newId: string) => {
      const base = oldId ? draft.noteIds.filter((id) => id !== oldId) : draft.noteIds
      const result = validateAdd(base, newId)
      if (result.ok) setDraft((d) => touch({ ...d, noteIds: [...base, newId] }))
      return result
    },
    [draft.noteIds],
  )

  const captureComposition = useCallback<StudioContextValue['captureComposition']>(() => {
    return { noteIds: [...draft.noteIds], concentration: draft.bottle.concentration }
  }, [draft.noteIds, draft.bottle.concentration])

  const applyAssistantPlan = useCallback<StudioContextValue['applyAssistantPlan']>(
    (actions) => {
      // 1. Simulate the complete change set against a copy of the blend.
      const sim = simulatePlan(draft.noteIds, draft.bottle.concentration, actions)
      // 2. Commit only if every step is valid and no clash rules fire.
      if (!sim.ok) {
        return {
          ok: false,
          message: sim.steps.find((s) => !s.ok)?.message ?? 'That change does not fit the current blend.',
        }
      }
      if (sim.noChanges) {
        return { ok: true, snapshot: { noteIds: [...draft.noteIds], concentration: draft.bottle.concentration }, labels: [] }
      }
      // 3. Single commit: one setDraft call covers notes + concentration.
      const snapshot: CompositionSnapshot = { noteIds: [...draft.noteIds], concentration: draft.bottle.concentration }
      setDraft((d) =>
        touch({
          ...d,
          noteIds: sim.finalIds,
          bottle: { ...d.bottle, concentration: sim.finalConcentration },
        }),
      )
      return { ok: true, snapshot, warnings: sim.warnings, labels: sim.steps.filter((s) => s.ok).map((s) => (s as { label: string }).label) }
    },
    [draft.noteIds, draft.bottle.concentration],
  )

  const restoreComposition = useCallback<StudioContextValue['restoreComposition']>((snapshot) => {
    const ids = sanitizeNoteIds(snapshot.noteIds)
    const concentration: Concentration =
      snapshot.concentration === 'edt' || snapshot.concentration === 'parfum' ? snapshot.concentration : 'edp'
    if (ids.length === 0 && snapshot.noteIds.length > 0) return false
    setDraft((d) => touch({ ...d, noteIds: ids, bottle: { ...d.bottle, concentration } }))
    return true
  }, [])

  const clearDraft = useCallback(() => {
    setDraft({ ...emptyDraft(), id: createId('blend'), updatedAt: Date.now() })
  }, [])

  const loadBlend = useCallback<StudioContextValue['loadBlend']>((input) => {
    setDraft({
      id: createId('blend'),
      name: sanitizeName(input.name),
      noteIds: sanitizeNoteIds(input.noteIds),
      bottle: { ...(input.bottle ?? DEFAULT_BOTTLE) },
      presetId: input.presetId,
      updatedAt: Date.now(),
    })
  }, [])

  const openSaved = useCallback(
    (id: string) => {
      const blend = saved.find((b) => b.id === id)
      if (!blend) return false
      setDraft({ ...blend, noteIds: [...blend.noteIds], bottle: { ...blend.bottle } })
      return true
    },
    [saved],
  )

  const setName = useCallback((name: string) => {
    setDraft((d) => touch({ ...d, name: name.slice(0, 32) }))
  }, [])

  const setBottle = useCallback((patch: Partial<BottleOptions>) => {
    setDraft((d) => touch({ ...d, bottle: { ...d.bottle, ...patch } }))
  }, [])

  const saveDraft = useCallback(() => {
    const snapshot = touch({ ...draft, name: sanitizeName(draft.name) })
    setDraft(snapshot)
    setSaved((list) => [snapshot, ...list.filter((b) => b.id !== snapshot.id)])
    return snapshot
  }, [draft])

  const deleteSaved = useCallback((id: string) => {
    setSaved((list) => list.filter((b) => b.id !== id))
  }, [])

  const addToCart = useCallback(
    (blend?: Blend) => {
      const source = blend ?? draft
      const snapshot: Blend = {
        ...source,
        name: sanitizeName(source.name),
        noteIds: [...source.noteIds],
        bottle: { ...source.bottle },
      }
      setEditingCartItemId((editingId) => {
        if (editingId) {
          // Editing an existing cart item: replace its blend, keep id + quantity.
          setCart((items) => {
            if (!items.some((item) => item.id === editingId)) return [...items, { id: editingId, blend: snapshot, quantity: 1 }]
            return items.map((item) => (item.id === editingId ? { ...item, blend: snapshot } : item))
          })
        } else {
          setCart((items) => [...items, { id: createId('item'), blend: snapshot, quantity: 1 }])
        }
        return null
      })
    },
    [draft],
  )

  // Load a cart item's blend into the builder so its notes/bottle can be edited;
  // the next addToCart() updates that item in place instead of adding a new one.
  const editCartItem = useCallback(
    (itemId: string): boolean => {
      const item = cart.find((i) => i.id === itemId)
      if (!item) return false
      setEditingCartItemId(itemId)
      setDraft({
        ...item.blend,
        noteIds: [...item.blend.noteIds],
        bottle: { ...item.blend.bottle },
      })
      return true
    },
    [cart],
  )

  const cancelEditCartItem = useCallback(() => {
    setEditingCartItemId(null)
  }, [])

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    const safe = Math.min(MAX_QTY, Math.max(1, Math.floor(quantity) || 1))
    setCart((items) => items.map((item) => (item.id === itemId ? { ...item, quantity: safe } : item)))
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setCart((items) => items.filter((item) => item.id !== itemId))
    setEditingCartItemId((current) => (current === itemId ? null : current))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setEditingCartItemId(null)
  }, [])

  const recordOrder = useCallback((order: Order) => {
    setOrders((list) => [order, ...list.filter((o) => o.id !== order.id)])
  }, [])

  const value = useMemo<StudioContextValue>(
    () => ({
      hydrated,
      draft,
      cart,
      saved,
      orders,
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      editingCartItemId,
      addNote,
      removeNote,
      replaceNote,
      applyAssistantPlan,
      restoreComposition,
      captureComposition,
      clearDraft,
      loadBlend,
      openSaved,
      setName,
      setBottle,
      saveDraft,
      deleteSaved,
      addToCart,
      editCartItem,
      cancelEditCartItem,
      setQuantity,
      removeFromCart,
      clearCart,
      recordOrder,
    }),
    [hydrated, draft, cart, saved, orders, editingCartItemId, addNote, removeNote, replaceNote, applyAssistantPlan, restoreComposition, captureComposition, clearDraft, loadBlend, openSaved, setName, setBottle, saveDraft, deleteSaved, addToCart, editCartItem, cancelEditCartItem, setQuantity, removeFromCart, clearCart, recordOrder],
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider')
  return ctx
}

export const MAX_CART_QUANTITY = MAX_QTY
