'use client'

/**
 * ScentAdvisor — AI chat assistant for the builder.
 * Responds to natural language queries and can modify the composition.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { resolveIntent, SUGGESTION_CHIPS, type AssistantAction } from '@/lib/assistant'
import { answerScentQuestion, type AnalystAnswer } from '@/lib/concierge'
import { NOTES_BY_ID } from '@/lib/fragrance-data'
import type { Concentration } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

interface AppliedChange {
  type: 'added' | 'removed' | 'replaced' | 'concentration'
  label: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: AppliedChange[]
  suggestions?: AnalystAnswer['suggestions']
}

interface ScentAdvisorProps {
  noteIds: string[]
  onAddNote: (id: string) => void
  onRemoveNote: (id: string) => void
  onReplaceNote: (oldId: string, newId: string) => void
  onSetConcentration: (value: Concentration) => void
  className?: string
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ScentAdvisor({
  noteIds,
  onAddNote,
  onRemoveNote,
  onReplaceNote,
  onSetConcentration,
  className,
}: ScentAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [lastSnapshot, setLastSnapshot] = useState<string[] | null>(null)
  const [open, setOpen] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking])

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsThinking(true)
    setLastSnapshot([...noteIds])

    // Resolve intent
    const action = resolveIntent(text, noteIds)

    // Execute action
    const changes: AppliedChange[] = []
    let updatedNoteIds = [...noteIds]

    if (action.type === 'ADD') {
      onAddNote(action.noteId)
      updatedNoteIds = [...noteIds, action.noteId]
      changes.push({
        type: 'added',
        label: `Added ${NOTES_BY_ID[action.noteId]?.name || action.noteId}`,
      })
    } else if (action.type === 'REMOVE') {
      onRemoveNote(action.noteId)
      updatedNoteIds = noteIds.filter((id) => id !== action.noteId)
      changes.push({
        type: 'removed',
        label: `Removed ${NOTES_BY_ID[action.noteId]?.name || action.noteId}`,
      })
    } else if (action.type === 'REPLACE') {
      onReplaceNote(action.oldId, action.newId)
      updatedNoteIds = noteIds.map((id) => (id === action.oldId ? action.newId : id))
      changes.push({
        type: 'replaced',
        label: `Replaced ${NOTES_BY_ID[action.oldId]?.name} with ${NOTES_BY_ID[action.newId]?.name}`,
      })
    } else if (action.type === 'SET_CONCENTRATION') {
      onSetConcentration(action.value)
      changes.push({
        type: 'concentration',
        label: `Changed concentration to ${action.value.toUpperCase()}`,
      })
    }

    // Generate natural language response
    let responseText = ''
    let suggestionChips: AnalystAnswer['suggestions'] | undefined

    if (action.type === 'EXPLAIN') {
      const holisticAnswer = answerScentQuestion(noteIds, text)
      responseText = holisticAnswer.answer
      suggestionChips = holisticAnswer.suggestions
    } else if (action.type === 'CLARIFY') {
      responseText = action.prompt
    } else if (action.type === 'NONE') {
      responseText = "I'm here to help you refine your blend. Try asking me to make it last longer, add freshness, or explain how it will smell."
    } else if ('reason' in action) {
      // ADD, REMOVE, REPLACE, SET_CONCENTRATION all have reason
      const baseResponse = answerScentQuestion(updatedNoteIds, text)
      responseText = `${action.reason}\n\n${baseResponse.answer}`
      suggestionChips = baseResponse.suggestions
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: responseText,
      suggestions: suggestionChips,
      actions: changes.length > 0 ? changes : undefined,
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsThinking(false)
  }

  const handleUndo = () => {
    if (!lastSnapshot) return

    // Calculate the diff and apply inverse operations
    const currentSet = new Set(noteIds)
    const snapshotSet = new Set(lastSnapshot)

    // Remove notes that were added
    for (const id of currentSet) {
      if (!snapshotSet.has(id)) {
        onRemoveNote(id)
      }
    }

    // Add back notes that were removed
    for (const id of snapshotSet) {
      if (!currentSet.has(id)) {
        onAddNote(id)
      }
    }

    setLastSnapshot(null)

    // Add system message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        text: 'Undone. Your blend is restored to the previous state.',
      },
    ])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('flex flex-col rounded-2xl border border-[#CCDFF0] bg-[#FDFEFF]', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-3 border-b border-[#CCDFF0] px-4 py-3 transition-colors hover:bg-[#F5F9FD]"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#1E63C8]" aria-hidden="true" />
          <h3 className="font-serif text-lg text-[#0A1A52]">Scent Advisor</h3>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-[#5C728F]" />
        ) : (
          <ChevronDown className="size-4 text-[#5C728F]" />
        )}
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
              className="flex max-h-[400px] flex-col gap-3 overflow-y-auto p-4"
            >
              {messages.length === 0 && (
                <div className="rounded-lg bg-[#E4EEF8] p-4 text-sm text-[#0E1B33]">
                  <p className="mb-2 font-medium">Hi! I'm your Scent Advisor.</p>
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

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((suggestion) => (
                        <button
                          key={`${msg.id}-${suggestion.noteId}`}
                          type="button"
                          onClick={() => onAddNote(suggestion.noteId)}
                          className="rounded-full border border-[#1E63C8] bg-white px-2.5 py-1 text-xs font-medium text-[#1E63C8] transition-colors hover:bg-[#1E63C8] hover:text-[#F5F9FD]"
                        >
                          + {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {msg.actions.map((change, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-[#1E63C8]/20 px-2 py-0.5 text-xs font-medium text-[#1E63C8]"
                        >
                          {change.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 self-start rounded-lg bg-[#E4EEF8] px-3 py-2 text-sm text-[#5C728F]">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking...
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
                    onClick={() => handleSend(chip.message)}
                    disabled={isThinking}
                    className="rounded-full border border-[#CCDFF0] bg-white px-3 py-1.5 text-xs text-[#0E1B33] transition-colors hover:border-[#1E63C8] hover:bg-[#F5F9FD] disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Undo button */}
            {lastSnapshot && (
              <div className="border-t border-[#CCDFF0] px-4 py-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#1E63C8] transition-colors hover:text-[#0A1A52]"
                >
                  <RotateCcw className="size-3" />
                  Undo last change
                </button>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-[#CCDFF0] p-3">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  rows={1}
                  disabled={isThinking}
                  className="flex-1 resize-none rounded-lg border border-[#CCDFF0] bg-white px-3 py-2 text-sm text-[#0E1B33] outline-none transition focus:border-[#1E63C8] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
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
