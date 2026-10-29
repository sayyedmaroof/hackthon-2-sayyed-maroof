'use client'

/**
 * ScentAdvisor — AI chat assistant for the builder.
 *
 * The conversation lives in a session context (`ScentAdvisorSessionProvider`)
 * so the responsive layout can render the advisor in both the mobile column
 * and the desktop sidebar while sharing ONE logical state — no duplicate
 * requests, no duplicated proposals, no lost history across viewport changes.
 *
 * Assistant responses come from the shared AI endpoint. Composition changes
 * are never applied directly: they arrive as a proposed plan that the user
 * applies with one tap; the plan is re-simulated against the live store
 * (atomic commit, full-composition undo). If the AI service is unavailable
 * the original deterministic advisor takes over via `resolveIntent` and
 * `answerScentQuestion`, so the user never loses their input or blend.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Loader2, RotateCcw, Send, Sparkles, Undo2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { answerScentQuestion, type AnalystAnswer } from '@/lib/concierge'
import { NOTES_BY_ID } from '@/lib/fragrance-data'
import { resolveIntent, SUGGESTION_CHIPS } from '@/lib/assistant'
import { simulatePlan, type PlanAction } from '@/lib/ai/plan'
import type { ApiResponse, BuilderClientAction } from '@/lib/ai/schemas'
import { cn } from '@/lib/utils'
import { useStudio, type CompositionSnapshot } from '@/lib/studio-store'

// ─── Types ─────────────────────────────────────────────────────────────────

interface AppliedChange {
  label: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  suggestions?: AnalystAnswer['suggestions']
  /** A pending (or dismissed) change plan attached to this message. */
  proposal?: { actions: BuilderClientAction[]; planError?: string; dismissed?: boolean }
  /** Change labels recorded once the plan was applied. */
  applied?: AppliedChange[]
}

const REQUEST_TIMEOUT_MS = 20_000

// ─── Session context ───────────────────────────────────────────────────────

interface AdvisorSession {
  messages: Message[]
  input: string
  setInput: (value: string) => void
  isThinking: boolean
  open: boolean
  toggleOpen: () => void
  send: (text?: string) => void
  retryLast: () => void
  error: string | null
  undo: (() => void) | null
  /** Like send(), but with a pre-filled suggestion ("Add …"). */
  sendSuggestion: (text: string) => void
  applyProposal: (messageId: string) => void
  dismissProposal: (messageId: string) => void
}

const AdvisorSessionContext = createContext<AdvisorSession | null>(null)

export function ScentAdvisorSessionProvider({ children }: { children: ReactNode }) {
  const { draft, applyAssistantPlan, restoreComposition, captureComposition } = useStudio()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [undoSnapshot, setUndoSnapshot] = useState<CompositionSnapshot | null>(null)
  const lastUserMessage = useRef<string | null>(null)
  const requestSeq = useRef(0)

  // Freshest composition for request building without stale closures.
  const compositionRef = useRef({ noteIds: draft.noteIds, concentration: draft.bottle.concentration })
  compositionRef.current = { noteIds: draft.noteIds, concentration: draft.bottle.concentration }

  const patchMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  /** Deterministic fallback: identical behaviour to the pre-AI advisor. */
  const deterministicReply = useCallback((text: string, noteIds: string[]): Message => {
    const action = resolveIntent(text, noteIds)
    if (action.type === 'EXPLAIN') {
      const answer = answerScentQuestion(noteIds, text)
      return { id: `a${Date.now()}-local`, role: 'assistant', text: answer.answer, suggestions: answer.suggestions }
    }
    if (action.type === 'CLARIFY') {
      return { id: `a${Date.now()}-local`, role: 'assistant', text: action.prompt }
    }
    if (action.type === 'NONE') {
      return {
        id: `a${Date.now()}-local`,
        role: 'assistant',
        text: 'I can help you refine your blend — try "make it last longer", "add freshness" or "explain this blend".',
      }
    }
    let actions: BuilderClientAction[]
    if (action.type === 'SET_CONCENTRATION') {
      actions = [{ type: 'SET_CONCENTRATION', value: action.value, reason: action.reason }]
    } else if (action.type === 'ADD') {
      actions = [{ type: 'ADD', noteId: action.noteId, reason: action.reason }]
    } else if (action.type === 'REMOVE') {
      actions = [{ type: 'REMOVE', noteId: action.noteId, reason: action.reason }]
    } else {
      actions = [{ type: 'REPLACE', oldId: action.oldId, newId: action.newId, reason: action.reason }]
    }
    // Deterministic plans are pre-validated by resolveIntent's validateAdd,
    // but the proposal flow re-simulates on Apply either way.
    const sim = simulatePlan(
      noteIds,
      compositionRef.current.concentration,
      actions as unknown as PlanAction[],
    )
    return {
      id: `a${Date.now()}-local`,
      role: 'assistant',
      text: 'The studio advisor is offline, so here is my saved guidance. Review the change before applying it.',
      proposal: sim.ok ? { actions } : undefined,
    }
  }, [])

  const fetchAdvice = useCallback(
    async (text: string) => {
      const requestId = ++requestSeq.current
      const userMessage: Message = { id: `u${Date.now()}`, role: 'user', text }
      const history = [...messages.slice(-6)].map((m) => ({ role: m.role, text: m.text }))
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsThinking(true)
      setError(null)
      lastUserMessage.current = text

      const { noteIds, concentration } = compositionRef.current

      let okResponse: Extract<ApiResponse, { ok: true }> | null = null
      let apiErrorMessage: string | null = null
      try {
        const res = await fetch('/api/ai/fragrance', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ mode: 'builder', message: text, history, context: { noteIds, concentration } }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        const json = (await res.json().catch(() => null)) as ApiResponse | null
        if (json && json.ok) {
          okResponse = json
        } else if (json && !json.ok) {
          apiErrorMessage = json.error.message
        } else {
          apiErrorMessage = 'The advisor could not be reached. Your blend is unchanged.'
        }
      } catch {
        apiErrorMessage = 'The advisor could not be reached. Your blend is unchanged.'
      }

      // Stale-response guard: only the latest request may touch state.
      if (requestSeq.current !== requestId) return
      setIsThinking(false)

      if (okResponse && okResponse.mode === 'builder') {
        const honored = okResponse.planValid
        const failureNote =
          !honored && okResponse.planError ? `\n\nThat change didn't work out — ${okResponse.planError}` : ''
        setMessages((prev) => [
          ...prev,
          {
            id: `a${Date.now()}`,
            role: 'assistant',
            text: (okResponse.mode === 'builder' ? okResponse.reply : '') + failureNote,
            proposal:
              okResponse && okResponse.mode === 'builder' && okResponse.actions.length > 0
                ? {
                    actions: okResponse.actions,
                    planError: okResponse.planValid ? undefined : okResponse.planError,
                  }
                : undefined,
          },
        ])
        return
      }

      // Every provider failed → deterministic fallback preserves the answer.
      if (!apiErrorMessage) {
        setMessages((prev) => [...prev, deterministicReply(text, noteIds)])
      } else {
        setError(apiErrorMessage)
      }
    },
    [messages, deterministicReply],
  )

  const send = useCallback(
    (text?: string) => {
      const value = (text ?? input).trim()
      if (!value || isThinking) return
      void fetchAdvice(value)
    },
    [input, isThinking, fetchAdvice],
  )

  const sendSuggestion = useCallback(
    (text: string) => send(text),
    [send],
  )

  const retryLast = useCallback(() => {
    const last = lastUserMessage.current
    if (!last || isThinking) return
    // Drop the failed exchange, then re-send the same request.
    setMessages((prev) => {
      const copy = [...prev]
      while (copy.length > 0 && copy[copy.length - 1].role !== 'user') copy.pop()
      if (copy[copy.length - 1]?.text === last) copy.pop()
      return copy
    })
    void fetchAdvice(last)
  }, [isThinking, fetchAdvice])

  const applyProposal = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId)
      if (!message?.proposal || message.proposal.dismissed) return
      const plan = message.proposal.actions as unknown as PlanAction[]
      const result = applyAssistantPlan(plan)
      if (result.ok) {
        setUndoSnapshot(result.snapshot ?? captureComposition())
        const labels =
          result.labels && result.labels.length > 0
            ? result.labels
            : ['Change applied']
        patchMessage(messageId, {
          applied: labels.map((label) => ({ label })),
          proposal: { ...message.proposal, dismissed: true },
        })
        if (result.warnings && result.warnings.length > 0) {
          toast.warning(result.warnings[0].message, { description: result.warnings[0].suggestion })
        }
      } else {
        toast.error(result.message ?? 'That change does not fit the current blend.')
      }
    },
    [messages, applyAssistantPlan, captureComposition, patchMessage],
  )

  const dismissProposal = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId)
      if (!message?.proposal) return
      patchMessage(messageId, { proposal: { ...message.proposal, dismissed: true } })
    },
    [messages, patchMessage],
  )

  const undo = useMemo(() => {
    if (!undoSnapshot) return null
    return () => {
      const ok = restoreComposition(undoSnapshot)
      if (ok) {
        setUndoSnapshot(null)
        setMessages((prev) => [
          ...prev,
          { id: `a${Date.now()}-undo`, role: 'assistant', text: 'Undone. Your full composition — notes and bottle settings — is restored.' },
        ])
      } else {
        toast.error('Could not restore the previous composition.')
      }
    }
  }, [undoSnapshot, restoreComposition])

  const session = useMemo<AdvisorSession>(
    () => ({
      messages,
      input,
      setInput,
      isThinking,
      open,
      toggleOpen: () => setOpen((v) => !v),
      send,
      sendSuggestion,
      retryLast,
      error,
      undo,
      applyProposal,
      dismissProposal,
    }),
    [messages, input, isThinking, open, send, sendSuggestion, retryLast, error, undo, applyProposal, dismissProposal],
  )

  return <AdvisorSessionContext.Provider value={session}>{children}</AdvisorSessionContext.Provider>
}

function useAdvisorSession(): AdvisorSession {
  const ctx = useContext(AdvisorSessionContext)
  if (!ctx) {
    throw new Error('ScentAdvisor must be rendered inside <ScentAdvisorSessionProvider>.')
  }
  return ctx
}

// ─── Proposal card ─────────────────────────────────────────────────────────

function stepLabels(actions: readonly BuilderClientAction[]): string[] {
  return actions.map((action) => {
    if (action.type === 'ADD') return `Add ${NOTES_BY_ID[action.noteId]?.name ?? action.noteId}`
    if (action.type === 'REMOVE') return `Remove ${NOTES_BY_ID[action.noteId]?.name ?? action.noteId}`
    if (action.type === 'REPLACE')
      return `Replace ${NOTES_BY_ID[action.oldId]?.name ?? action.oldId} with ${NOTES_BY_ID[action.newId]?.name ?? action.newId}`
    const label = action.value === 'edt' ? 'Eau de Toilette' : action.value === 'parfum' ? 'Extrait de Parfum' : 'Eau de Parfum'
    return `Concentration → ${label}`
  })
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ScentAdvisor({ className }: { className?: string }) {
  const {
    messages,
    input,
    setInput,
    isThinking,
    open,
    toggleOpen,
    send,
    sendSuggestion,
    retryLast,
    error,
    undo,
    applyProposal,
    dismissProposal,
  } = useAdvisorSession()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking, error])

  return (
    <div className={cn('flex flex-col rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF]', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-between gap-3 border-b border-[#CCDFF0] px-4 py-3 transition-colors hover:bg-[#F5F9FD]"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#1E63C8]" aria-hidden="true" />
          <h3 className="font-serif text-lg text-[#0A1A52]">Scent Advisor</h3>
        </div>
        {open ? <ChevronUp className="size-4 text-[#5C728F]" /> : <ChevronDown className="size-4 text-[#5C728F]" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col overflow-hidden"
          >
            {/* Messages */}
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              className="flex max-h-[400px] flex-col gap-3 overflow-y-auto p-4"
            >
              {messages.length === 0 && (
                <div className="rounded-lg bg-[#E4EEF8] p-4 text-sm text-[#0E1B33]">
                  <p className="mb-2 font-medium">Hi! I&apos;m your Scent Advisor.</p>
                  <p className="text-[#5C728F]">
                    I can help you refine your blend, suggest notes, explain how it will smell, and more. Try
                    the suggestions below or ask me anything.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg p-3 text-sm',
                    msg.role === 'user'
                      ? 'self-end bg-[#1E63C8] text-[#F5F9FD]'
                      : 'self-start bg-[#E4EEF8] text-[#0E1B33]',
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.suggestions && msg.suggestions.length > 0 && !msg.applied && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((suggestion) => (
                        <button
                          key={`${msg.id}-${suggestion.noteId}`}
                          type="button"
                          onClick={() => sendSuggestion(`Add ${suggestion.label.replace(/^Add /, '')}`)}
                          className="rounded-full border border-[#1E63C8] bg-white px-2.5 py-1 text-xs font-medium text-[#1E63C8] transition-colors hover:bg-[#1E63C8] hover:text-[#F5F9FD]"
                        >
                          + {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.applied && msg.applied.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {msg.applied.map((change, idx) => (
                        <span
                          key={`${msg.id}-applied-${idx}`}
                          className="rounded-full bg-[#1E63C8]/20 px-2 py-0.5 text-xs font-medium text-[#1E63C8]"
                        >
                          {change.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <ProposalCard
                    message={msg}
                    onApply={applyProposal}
                    onDismiss={dismissProposal}
                  />
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 self-start rounded-lg bg-[#E4EEF8] px-3 py-2 text-sm text-[#5C728F]">
                  <Loader2 className="size-4 animate-spin" />
                  Reading your blend…
                </div>
              )}

              {error && !isThinking && (
                <div className="self-start rounded-lg border border-[#E5C4B0] bg-[#FDF3EE] px-3 py-2 text-sm text-[#7A2A10]">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={retryLast}
                    className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#B05030]/40 px-2.5 py-1 text-xs font-medium text-[#B05030] transition-colors hover:bg-[#B05030]/10"
                  >
                    <RotateCcw className="size-3" aria-hidden="true" /> Try again
                  </button>
                </div>
              )}
            </div>

            {/* Suggestion chips */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 border-t border-[#CCDFF0] px-4 py-3">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => send(chip.message)}
                    disabled={isThinking}
                    className="rounded-full border border-[#CCDFF0] bg-white px-3 py-1.5 text-xs text-[#0E1B33] transition-colors hover:border-[#1E63C8] hover:bg-[#F5F9FD] disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Undo last applied plan */}
            {undo && (
              <div className="border-t border-[#CCDFF0] px-4 py-2">
                <button
                  type="button"
                  onClick={undo}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#1E63C8] transition-colors hover:text-[#0A1A52]"
                >
                  <Undo2 className="size-3" aria-hidden="true" />
                  Undo last change
                </button>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-[#CCDFF0] p-3">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="Ask me anything..."
                  rows={1}
                  maxLength={600}
                  disabled={isThinking}
                  className="flex-1 resize-none rounded-lg border border-[#CCDFF0] bg-white px-3 py-2 text-sm text-[#0E1B33] outline-none transition focus:border-[#1E63C8] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || isThinking}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1E63C8] text-[#F5F9FD] transition-colors hover:bg-[#154FB8] disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProposalCard({
  message,
  onApply,
  onDismiss,
}: {
  message: Message
  onApply: (messageId: string) => void
  onDismiss: (messageId: string) => void
}) {
  const proposal = message.proposal
  if (!proposal || proposal.dismissed || message.applied) return null

  const labels = stepLabels(proposal.actions)

  return (
    <div className="mt-1 rounded-xl border border-[#CCDFF0] bg-[#FDFEFF] p-2.5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#5C728F]">Proposed changes</p>
      <ul className="mt-1.5 space-y-1">
        {labels.map((label) => (
          <li key={label} className="flex items-center gap-1.5 text-xs text-[#0E1B33]">
            <span className="size-1.5 rounded-full bg-[#1E63C8]" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
      {proposal.planError && (
        <p className="mt-1.5 text-xs text-[#B05030]">{proposal.planError}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApply(message.id)}
          className="inline-flex items-center gap-1 rounded-full bg-[#1E63C8] px-3 py-1.5 text-xs font-medium text-[#F5F9FD] transition-colors hover:bg-[#154FB8]"
        >
          <Check className="size-3" aria-hidden="true" /> Apply changes
        </button>
        <button
          type="button"
          onClick={() => onDismiss(message.id)}
          aria-label="Dismiss proposal"
          className="inline-flex size-7 items-center justify-center rounded-full border border-[#CCDFF0] text-[#5C728F] transition-colors hover:border-[#1E63C8]/40 hover:text-[#0E1B33]"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
