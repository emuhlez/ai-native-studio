import { Loader2, X } from 'lucide-react'
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore'
import { stripLeadingBrackets } from '../../ai/strip-brackets'
import type { BackgroundTask, BackgroundTaskStatus } from '../../types'
import styles from './BackgroundTaskDrawer.module.css'

const statusClass: Record<BackgroundTaskStatus, string> = {
  pending: styles.statusPending,
  running: '',
  done: styles.statusDone,
  error: styles.statusError,
}

function TaskItem({ task }: { task: BackgroundTask }) {
  const dismissTask = useBackgroundTaskStore((s) => s.dismissTask)

  const isDone = task.status === 'done'
  const isError = task.status === 'error'
  const isClassified = isDone && task.classification != null
  const rawText = isClassified ? task.summary : task.command
  const displayText = stripLeadingBrackets(rawText)

  return (
    <div className={styles.taskItem}>
      <div className={styles.taskHeader}>
        {task.status === 'running' ? (
          <Loader2 size={12} className={styles.spinner} />
        ) : task.status === 'error' ? (
          <img
            src="/prompts/stop.svg"
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
