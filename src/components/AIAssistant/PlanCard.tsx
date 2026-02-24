import { useState } from 'react'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
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

  const input = toolData.input as { todos?: Array<{ label: string; category?: string }> }
  const todos = input?.todos ?? []

  const isPending = activePlan?.id === toolData.toolCallId && activePlan?.status === 'pending'
  const isExecuting = activePlan?.id === toolData.toolCallId && activePlan?.status === 'executing'
  const isDone = activePlan?.id === toolData.toolCallId && activePlan?.status === 'done'
  const isRejected = activePlan?.id === toolData.toolCallId && activePlan?.status === 'rejected'
  const checkedItems = activePlan?.id === toolData.toolCallId ? activePlan.checkedItems : new Set<number>()

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
              return (
                <li
                  key={i}
                  className={styles.todoItem}
                  onClick={() => isPending && toggleTodo(i)}
                >
                  <span className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}>
                    {checked && <Check size={10} className={styles.checkIcon} />}
                  </span>
                  <span className={`${styles.todoLabel} ${checked ? styles.todoLabelChecked : ''}`}>
                    {todo.category && (
                      <span className={styles.category}>{todo.category}: </span>
                    )}
                    {todo.label}
                  </span>
                </li>
              )
            })}
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
