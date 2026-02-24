import { useEffect, useRef } from 'react'
import { usePlanStore } from '../store/planStore'

interface UsePlanExecutorOptions {
  sendMessage: (params: { text: string }) => void
  status: string
}

export function usePlanExecutor({ sendMessage, status }: UsePlanExecutorOptions) {
  const activePlan = usePlanStore((s) => s.activePlan)
  const startExecuting = usePlanStore((s) => s.startExecuting)
  const completePlan = usePlanStore((s) => s.completePlan)

  const executingRef = useRef(false)
  const prevStatusRef = useRef(status)

  // When plan is approved, start execution
  useEffect(() => {
    if (activePlan?.status !== 'approved') return
    if (executingRef.current) return

    executingRef.current = true
    startExecuting()

    const todoList = activePlan.data.todos
      .map((t, i) => {
        const prefix = t.category ? `${t.category}: ` : ''
        return `${i + 1}. ${prefix}${t.label}`
      })
      .join('\n')

    sendMessage({
      text: `Execute the approved plan. The to-do items are:\n${todoList}\n\nBuild them now.`,
    })
  }, [activePlan?.status, sendMessage, startExecuting, activePlan?.data])

  // Watch for status transition loading -> ready to detect completion
  useEffect(() => {
    const wasLoading =
      prevStatusRef.current === 'streaming' ||
      prevStatusRef.current === 'submitted'
    prevStatusRef.current = status

    if (!executingRef.current) return
    if (!wasLoading || status !== 'ready') return

    completePlan()
    executingRef.current = false
  }, [status, completePlan])
}
