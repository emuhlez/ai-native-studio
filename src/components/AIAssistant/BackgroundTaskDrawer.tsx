import { Loader2, ChevronRight, X } from 'lucide-react'
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore'
import { useConversationStore } from '../../store/conversationStore'
import { useDockingStore } from '../../store/dockingStore'
import type { BackgroundTask, BackgroundTaskStatus, PersistedMessage } from '../../types'
import styles from './BackgroundTaskDrawer.module.css'

const statusClass: Record<BackgroundTaskStatus, string> = {
  pending: styles.statusPending,
  running: '',
  done: styles.statusDone,
  error: styles.statusError,
}

function TaskItem({ task }: { task: BackgroundTask }) {
  const toggleExpanded = useBackgroundTaskStore((s) => s.toggleTaskExpanded)
  const dismissTask = useBackgroundTaskStore((s) => s.dismissTask)

  const isDone = task.status === 'done'
  const isError = task.status === 'error'
  const isClassified = isDone && task.classification != null
  const displayText = isClassified ? task.summary : task.command
  const canExpand = isClassified && task.classification === 'task'

  const handlePromote = () => {
    const convStore = useConversationStore.getState()
    const title = task.command.slice(0, 40) + (task.command.length > 40 ? '...' : '')
    const convId = convStore.createConversation(title)

    const userMsg: PersistedMessage = {
      id: `user-task-${Date.now()}`,
      role: 'user',
      textContent: task.command,
      timestamp: Date.now(),
    }
    convStore.addMessage(convId, userMsg)

    if (task.fullResponseText) {
      const assistantMsg: PersistedMessage = {
        id: `assistant-task-${Date.now()}`,
        role: 'assistant',
        textContent: task.fullResponseText,
        timestamp: Date.now(),
      }
      convStore.addMessage(convId, assistantMsg)
    }

    dismissTask(task.id)
    useDockingStore.getState().setAiAssistantBodyCollapsed(false)
  }

  return (
    <div className={styles.taskItem}>
      <div
        className={`${styles.taskHeader} ${canExpand ? styles.taskHeaderClickable : ''}`}
        onClick={canExpand ? () => toggleExpanded(task.id) : undefined}
      >
        {task.status === 'running' ? (
          <Loader2 size={12} className={styles.spinner} />
        ) : (
          <span className={`${styles.statusDot} ${statusClass[task.status]}`} />
        )}
        <span className={styles.commandText}>{displayText}</span>
        {canExpand && (
          <button
            type="button"
            className={styles.chevronButton}
            onClick={(e) => {
              e.stopPropagation()
              handlePromote()
            }}
            title="Continue in chat"
            aria-label="Continue in chat"
          >
            <ChevronRight
              size={12}
              className={`${styles.chevron} ${task.expanded ? styles.chevronExpanded : ''}`}
            />
          </button>
        )}
        {isError && (
          <span className={`${styles.statusLabel} ${styles.statusLabelError}`}>Failed</span>
        )}
        {(isDone || isError) && (
          <button
            type="button"
            className={styles.dismissButton}
            onClick={(e) => {
              e.stopPropagation()
              dismissTask(task.id)
            }}
            title="Dismiss"
            aria-label="Dismiss task"
          >
            <X size={10} />
          </button>
        )}
      </div>
      {canExpand && task.expanded && (
        <div className={styles.expandedContent}>
          {task.fullResponseText && (
            <div className={styles.responseText}>{task.fullResponseText}</div>
          )}
          {task.toolCalls && task.toolCalls.length > 0 && (
            <div className={styles.toolCallList}>
              {task.toolCalls.map((tc, i) => (
                <span key={i} className={styles.toolCallChip}>{tc.toolName}</span>
              ))}
            </div>
          )}
          <button
            type="button"
            className={styles.continueInChat}
            onClick={handlePromote}
          >
            Continue in chat
          </button>
        </div>
      )}
    </div>
  )
}

export function BackgroundTaskDrawer() {
  const tasks = useBackgroundTaskStore((s) => s.tasks)

  if (tasks.length === 0) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.drawer}>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}
