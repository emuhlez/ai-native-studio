import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronDown, Check, Loader2, X, Plus } from 'lucide-react'
import { usePlanStore } from '../../store/planStore'
import toDoIcon from '../../../prompts/to-do.svg'
import styles from './PlanCard.module.css'

interface ToolPartData {
  toolCallId: string
  toolName: string
  state: string
  input: unknown
  output?: unknown
}

interface PlanCardProps {
  toolData: ToolPartData
}

export function PlanCard({ toolData }: PlanCardProps) {
  const [expanded, setExpanded] = useState(true)
  const activePlan = usePlanStore((s) => s.activePlan)
  const approvePlan = usePlanStore((s) => s.approvePlan)
  const rejectPlan = usePlanStore((s) => s.rejectPlan)
  const toggleTodo = usePlanStore((s) => s.toggleTodo)
  const answerQuestions = usePlanStore((s) => s.answerQuestions)
  const updateTodo = usePlanStore((s) => s.updateTodo)
  const addTodo = usePlanStore((s) => s.addTodo)
  const removeTodo = usePlanStore((s) => s.removeTodo)

  // Inline editing state (Gap 5)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')

  // During streaming, input may be partial/malformed — guard defensively
  const rawInput = (typeof toolData.input === 'object' && toolData.input !== null)
    ? toolData.input as Record<string, unknown>
    : {}
  const todos = (Array.isArray(rawInput.todos) ? rawInput.todos : []) as Array<{ label: string; category?: string }>
  const questions = (Array.isArray(rawInput.questions) ? rawInput.questions : [])
    .filter((q): q is { text: string; placeholder?: string; category?: string; options?: Array<{ label: string; description: string }> } =>
      typeof q === 'object' && q !== null && typeof (q as Record<string, unknown>).text === 'string'
    )
  const expectedQuestionCount =
    typeof (toolData.output as { questionCount?: unknown } | undefined)?.questionCount === 'number'
      ? (toolData.output as { questionCount?: number }).questionCount
      : undefined

  // Category tab state — default to the first category
  const DEFAULT_CATEGORY = 'Summary'
  const categoryOrder = ['Scope', 'Gameplay', 'World', 'Layout', 'Style', 'Summary']
  const byCategory = new Map<string, number[]>()
  questions.forEach((q, i) => {
    const cat = q.category?.trim() || DEFAULT_CATEGORY
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(i)
  })
  const orderedCategories = categoryOrder.filter((c) => byCategory.has(c))
  const otherCategories = [...byCategory.keys()].filter((c) => !categoryOrder.includes(c))
  const categories = [...orderedCategories, ...otherCategories]
  // Flatten to one ordered list of question indices (for progressive disclosure)
  const orderedQuestionIndices = categories.flatMap((cat) => byCategory.get(cat) ?? [])

  const [expandedIndex, setExpandedIndex] = useState(0)

  // Keep expandedIndex in bounds when question count changes
  useEffect(() => {
    if (orderedQuestionIndices.length === 0) return
    setExpandedIndex((prev) => Math.min(prev, orderedQuestionIndices.length - 1))
  }, [orderedQuestionIndices.length])

  // Pre-select the first option pill for each question
  const [draftAnswers, setDraftAnswers] = useState<string[]>(() =>
    questions.map((q) => q.options?.[0]?.label ?? '')
  )

  // Sync draftAnswers and expandedIndex when questions arrive (e.g. after streaming)
  const prevQuestionCountRef = useRef(questions.length)
  useEffect(() => {
    if (questions.length > 0 && prevQuestionCountRef.current === 0) {
      setDraftAnswers(questions.map((q) => q.options?.[0]?.label ?? ''))
      setExpandedIndex(0)
    }
    prevQuestionCountRef.current = questions.length
  }, [questions.length])

  const updateAnswer = useCallback((index: number, value: string) => {
    setDraftAnswers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const isThisPlan = activePlan?.id === toolData.toolCallId
  const isPending = isThisPlan && activePlan?.status === 'pending'
  const isExecuting = isThisPlan && activePlan?.status === 'executing'
  const isDone = isThisPlan && activePlan?.status === 'done'
  const isRejected = isThisPlan && activePlan?.status === 'rejected'
  const isClarifying = isThisPlan && activePlan?.status === 'clarifying'
  const isAnswered = isThisPlan && activePlan?.status === 'answered'
  const checkedItems = isThisPlan ? activePlan.checkedItems : new Set<number>()

  const submitAnswersRef = useRef<(() => void) | null>(null)
  const canSubmitRef = useRef(false)
  canSubmitRef.current = false
  submitAnswersRef.current = null

  // Global Cmd+Enter to submit answers (when not focused in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || (!e.metaKey && !e.ctrlKey)) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!canSubmitRef.current) return
      e.preventDefault()
      submitAnswersRef.current?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Arrow keys: previous / next accordion item
  // Number/letter keys: select option card (1-4 or a-d)
  useEffect(() => {
    if (questions.length === 0 || orderedQuestionIndices.length === 0) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setExpandedIndex((prev) => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setExpandedIndex((prev) =>
          prev < orderedQuestionIndices.length - 1 ? prev + 1 : prev
        )
      } else {
        // Number keys 1-4 or letter keys a-d select option cards
        let optIndex = -1
        if (e.key >= '1' && e.key <= '4') {
          optIndex = parseInt(e.key) - 1
        } else if (e.key >= 'a' && e.key <= 'd') {
          optIndex = e.key.charCodeAt(0) - 'a'.charCodeAt(0)
        }
        if (optIndex >= 0) {
          const questionIndex = orderedQuestionIndices[expandedIndex]
          if (questionIndex === undefined) return
          const q = questions[questionIndex]
          const opts = (q?.options ?? []).filter(
            (o: { label?: string }) => typeof o === 'object' && o !== null && typeof o.label === 'string'
          )
          if (optIndex < opts.length) {
            e.preventDefault()
            updateAnswer(questionIndex, opts[optIndex].label)
            // Advance to next question after selection
            if (expandedIndex < orderedQuestionIndices.length - 1) {
              setExpandedIndex((prev) => prev + 1)
            }
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [questions, orderedQuestionIndices, expandedIndex, updateAnswer])

  const hasReadyQuestions =
    questions.length > 0 &&
    (expectedQuestionCount === undefined || questions.length >= expectedQuestionCount)

  // Don't render the card if there are no to-do items and no fully-formed questions
  if (todos.length === 0 && !hasReadyQuestions) return null

  // Question mode: accordion — one section expanded at a time
  if (hasReadyQuestions) {
    const handleSubmitAnswers = () => {
      answerQuestions(draftAnswers)
    }

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmitAnswers()
      }
    }

    const hasAnyAnswer = draftAnswers.some((a) => a.trim().length > 0)

    submitAnswersRef.current = handleSubmitAnswers
    canSubmitRef.current = isClarifying && hasAnyAnswer

    return (
      <div className={`${styles.planCard} ${styles.questionMode}`}>
        <div className={styles.questionModeHeaderRow}>
          <div className={styles.questionModeHeading}>Questions</div>
        </div>

        <div className={styles.accordion}>
          {orderedQuestionIndices.map((questionIndex, idx) => {
            const q = questions[questionIndex]
            if (!q) return null
            const isExpanded = expandedIndex === idx
            const opts = (q.options ?? []).filter(
              (o) => typeof o === 'object' && o !== null && typeof o.label === 'string'
            )
            return (
              <div
                key={idx}
                className={`${styles.accordionItem} ${isExpanded ? styles.accordionItemExpanded : ''}`}
              >
                <button
                  type="button"
                  className={styles.accordionHeader}
                  onClick={() => setExpandedIndex(idx)}
                  aria-expanded={isExpanded}
                  aria-controls={`plan-question-${idx}`}
                  id={`plan-question-heading-${idx}`}
                >
                  <span className={styles.accordionTitle}>{q.text}</span>
                </button>
                <div
                  id={`plan-question-${idx}`}
                  role="region"
                  aria-labelledby={`plan-question-heading-${idx}`}
                  className={styles.accordionBody}
                  hidden={!isExpanded}
                >
                  <div className={styles.questionSection}>
                    {opts.length > 0 && (
                      <div className={styles.optionCardList}>
                        {opts.map((opt, optIdx) => {
                          const isSelected = (draftAnswers[questionIndex] ?? '') === opt.label
                          const shortcutKey = optIdx < 4 ? String(optIdx + 1) : undefined
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
                              onClick={() => {
                                if (!isClarifying) return
                                updateAnswer(questionIndex, opt.label)
                                // Advance to next question after selection
                                if (idx < orderedQuestionIndices.length - 1) {
                                  setExpandedIndex(idx + 1)
                                }
                              }}
                              disabled={!isClarifying}
                            >
                              <span className={styles.optionCardTop}>
                                {shortcutKey && <span className={styles.optionCardShortcut}>{shortcutKey}</span>}
                                <span className={styles.optionCardLabel}>{opt.label}</span>
                              </span>
                              <span className={styles.optionCardDesc}>{opt.description}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <input
                      type="text"
                      className={styles.questionInput}
                      placeholder={q.placeholder ?? 'Type your own answer'}
                      value={draftAnswers[questionIndex] ?? ''}
                      onChange={(e) => updateAnswer(questionIndex, e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={!isClarifying}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className={`${styles.actions} ${styles.actionsRight}`}>
          {isClarifying && (
            <>
              <button className={styles.actionButton} onClick={() => rejectPlan()}>
                Dismiss
              </button>
              <button
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                onClick={handleSubmitAnswers}
                disabled={!hasAnyAnswer}
              >
                Submit <span className={styles.kbd}>&#8984;&#8629;</span>
              </button>
            </>
          )}
        </div>

        {isAnswered && (
          <div className={`${styles.statusBadge} ${styles.statusAnswered}`}>
            Answers submitted
          </div>
        )}

        {isRejected && (
          <div className={`${styles.statusBadge} ${styles.statusRejected}`}>
            Questions dismissed
          </div>
        )}
      </div>
    )
  }

  // Todo mode: original plan card UI
  const handleViewPlan = () => {
    setExpanded(true)
  }

  const handleBuild = () => {
    approvePlan()
  }

  const handleReject = () => {
    rejectPlan()
  }

  return (
    <div>
      <div className={styles.planCard}>
        <button className={styles.header} onClick={() => setExpanded(!expanded)}>
          <img src={toDoIcon} alt="" width={16} height={16} className={styles.headerIcon} aria-hidden />
          <span className={styles.headerLabel}>
            {todos.length} To-do{todos.length !== 1 ? 's' : ''}
          </span>
          <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>
            <ChevronDown size={14} />
          </span>
        </button>

        {expanded && todos.length > 0 && (
          <ul className={styles.todoList}>
            {todos.map((todo, i) => {
              const checked = checkedItems.has(i)
              const isEditing = editingIndex === i
              return (
                <li
                  key={i}
                  className={styles.todoItem}
                  onClick={() => !isEditing && isPending && toggleTodo(i)}
                  onDoubleClick={() => {
                    if (isPending) {
                      setEditingIndex(i)
                      setEditingText(todo.label)
                    }
                  }}
                >
                  <span className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}>
                    {checked && <Check size={10} className={styles.checkIcon} />}
                  </span>
                  {isEditing ? (
                    <input
                      className={styles.todoEditInput}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => {
                        if (editingText.trim()) updateTodo(i, editingText.trim())
                        setEditingIndex(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingText.trim()) updateTodo(i, editingText.trim())
                          setEditingIndex(null)
                        }
                        if (e.key === 'Escape') setEditingIndex(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className={`${styles.todoLabel} ${checked ? styles.todoLabelChecked : ''}`}>
                      {todo.category && (
                        <span className={styles.category}>{todo.category}: </span>
                      )}
                      {todo.label}
                    </span>
                  )}
                  {isPending && !isEditing && (
                    <button
                      type="button"
                      className={styles.todoRemoveButton}
                      onClick={(e) => { e.stopPropagation(); removeTodo(i) }}
                      title="Remove"
                      aria-label="Remove to-do"
                    >
                      <X size={10} />
                    </button>
                  )}
                </li>
              )
            })}
            {/* Add to-do row (Gap 5) */}
            {isPending && (
              <li className={styles.addTodoRow}>
                {addingTodo ? (
                  <input
                    className={styles.todoEditInput}
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onBlur={() => {
                      if (newTodoText.trim()) addTodo(newTodoText.trim())
                      setNewTodoText('')
                      setAddingTodo(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (newTodoText.trim()) addTodo(newTodoText.trim())
                        setNewTodoText('')
                        setAddingTodo(false)
                      }
                      if (e.key === 'Escape') { setNewTodoText(''); setAddingTodo(false) }
                    }}
                    placeholder="New to-do..."
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.addTodoButton}
                    onClick={() => setAddingTodo(true)}
                  >
                    <Plus size={10} /> Add to-do
                  </button>
                )}
              </li>
            )}
          </ul>
        )}
      </div>

      {isPending && (
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={handleViewPlan}>
            View plan
          </button>
          <button className={styles.actionButton} onClick={handleReject}>
            Reject <span className={styles.kbd}>&#8984;&#9003;</span>
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={handleBuild}
          >
            Build <span className={styles.kbd}>&#8984;&#8629;</span>
          </button>
        </div>
      )}

      {isExecuting && (
        <div className={`${styles.statusBadge} ${styles.statusExecuting}`}>
          <Loader2 size={12} /> Executing plan...
        </div>
      )}

      {isDone && (
        <div className={`${styles.statusBadge} ${styles.statusDone}`}>
          <Check size={12} /> Plan completed
        </div>
      )}

      {isRejected && (
        <div className={`${styles.statusBadge} ${styles.statusRejected}`}>
          Plan rejected
        </div>
      )}
    </div>
  )
}
