import { useState } from 'react'
import { Loader2, X, Square, ChevronDown } from 'lucide-react'
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore'
import { stripLeadingBrackets } from '../../ai/strip-brackets'
import type { BackgroundTask, BackgroundTaskStatus } from '../../types'
import { publicUrl } from '../../utils/assetUrl'
import styles from './BackgroundTaskDrawer.module.css'

const statusClass: Record<BackgroundTaskStatus, string> = {
  pending: styles.statusPending,
  running: '',
  done: styles.statusDone,
  error: styles.statusError,
}

function TaskItem({ task }: { task: BackgroundTask }) {
  const dismissTask = useBackgroundTaskStore((s) => s.dismissTask)
  const cancelTask = useBackgroundTaskStore((s) => s.cancelTask)

  const isDone = task.status === 'done'
  const isError = task.status === 'error'
  const isRunning = task.status === 'running'
  const isClassified = isDone && task.classification != null
  const rawText = isClassified ? (task.summary ?? task.command) : task.command
  const displayText = stripLeadingBrackets(rawText)

  return (
    <div className={styles.taskItem}>
      <div className={styles.taskHeader}>
        {isRunning ? (
          <Loader2 size={12} className={styles.spinner} />
        ) : task.status === 'error' ? (
          <img
            src={publicUrl('prompts/stop.svg')}
            alt="Failed"
            className={styles.taskStatusStopIcon}
            width={12}
            height={12}
          />
        ) : (
          <span className={`${styles.statusDot} ${statusClass[task.status]}`} />
        )}
        <span className={styles.commandText}>{displayText}</span>
        {isError && (
          <span className={`${styles.statusLabel} ${styles.statusLabelError}`}>Failed</span>
        )}
        {/* Cancel button for running tasks (Gap 2) */}
        {isRunning && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => cancelTask(task.id)}
            title="Cancel task"
            aria-label="Cancel task"
          >
            <Square size={8} />
          </button>
        )}
        {(isDone || isError) && (
          <button
            type="button"
            className={styles.dismissButton}
            onClick={() => dismissTask(task.id)}
            title="Dismiss"
            aria-label="Dismiss task"
          >
            <X size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

function HistorySection() {
  const [expanded, setExpanded] = useState(false)
  const history = useBackgroundTaskStore((s) => s.taskHistory)
  const clearHistory = useBackgroundTaskStore((s) => s.clearHistory)

  if (history.length === 0) return null

  return (
    <div className={styles.historySection}>
      <button
        type="button"
        className={styles.historyToggle}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronDown size={10} className={expanded ? styles.historyChevronOpen : ''} />
        <span>History ({history.length})</span>
        {expanded && (
          <button
            type="button"
            className={styles.historyClear}
            onClick={(e) => { e.stopPropagation(); clearHistory() }}
            title="Clear history"
          >
            Clear
          </button>
        )}
      </button>
      {expanded && (
        <div className={styles.historyList}>
          {history.map((task) => {
            const rawText = task.summary || task.command
            const displayText = stripLeadingBrackets(rawText)
            return (
              <div key={task.id} className={styles.historyItem}>
                <span className={`${styles.statusDot} ${task.status === 'error' ? styles.statusError : styles.statusDone}`} />
                <span className={styles.commandText}>{displayText}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function BackgroundTaskDrawer() {
  const tasks = useBackgroundTaskStore((s) => s.tasks)
  const hasHistory = useBackgroundTaskStore((s) => s.taskHistory.length > 0)

  if (tasks.length === 0 && !hasHistory) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.drawer}>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
        <HistorySection />
      </div>
    </div>
  )
}
