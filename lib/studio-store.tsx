'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_BOTTLE } from './fragrance-data'
import { createId, sanitizeName, storage } from './storage'
import { sanitizeNoteIds, validateAdd, type AddResult } from './validation'
import type { Blend, BottleOptions, CartItem, Layer, Order } from './types'

const MAX_QTY = 10

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
  addNote: (noteId: string, layer?: Layer) => AddResult
  removeNote: (noteId: string) => void
  replaceNote: (oldId: string | undefined, newId: string) => AddResult
  clearDraft: () => void
  loadBlend: (input: { name: string; noteIds: string[]; bottle?: BottleOptions; presetId?: string }) => void
  openSaved: (id: string) => boolean
  setName: (name: string) => void
  setBottle: (patch: Partial<BottleOptions>) => void
  saveDraft: () => Blend
  deleteSaved: (id: string) => void
  addToCart: (blend?: Blend) => void
  setQuantity: (itemId: string, quantity: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  recordOrder: (order: Order) => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [draft, setDraft] = useState<Blend>(emptyDraft)
  const [cart, setCart] = useState<CartItem[]>([])
  const [saved, setSaved] = useState<Blend[]>([])
  const [orders, setOrders] = useState<Order[]>([])

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
      setCart((items) => [...items, { id: createId('item'), blend: snapshot, quantity: 1 }])
    },
    [draft],
  )

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    const safe = Math.min(MAX_QTY, Math.max(1, Math.floor(quantity) || 1))
    setCart((items) => items.map((item) => (item.id === itemId ? { ...item, quantity: safe } : item)))
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setCart((items) => items.filter((item) => item.id !== itemId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

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
      addNote,
      removeNote,
      replaceNote,
      clearDraft,
      loadBlend,
      openSaved,
      setName,
      setBottle,
      saveDraft,
      deleteSaved,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      recordOrder,
    }),
    [hydrated, draft, cart, saved, orders, addNote, removeNote, replaceNote, clearDraft, loadBlend, openSaved, setName, setBottle, saveDraft, deleteSaved, addToCart, setQuantity, removeFromCart, clearCart, recordOrder],
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider')
  return ctx
}

export const MAX_CART_QUANTITY = MAX_QTY
