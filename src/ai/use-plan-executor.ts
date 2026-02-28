import { useEffect, useRef } from 'react'
import { usePlanStore } from '../store/planStore'
import type { UIMessage } from '@ai-sdk/react'

interface UsePlanExecutorOptions {
  sendMessage: (params: { text: string }) => void
  status: string
  messages: UIMessage[]
  autoSendPendingRef: React.RefObject<boolean>
}

/**
 * Check whether the last assistant message ended mid-execution (hit maxSteps
 * or maxTokens) rather than finishing naturally. When the AI completes a plan
 * it produces a text summary *after* all tool calls. If the last part is a
 * tool result with no trailing text, the model was likely cut off.
 */
function wasExecutionCutOff(messages: UIMessage[]): boolean {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  if (!lastAssistant?.parts?.length) return false

  const parts = lastAssistant.parts as Array<{ type: string; state?: string }>

  // Find the last meaningful part (skip empty text parts)
  const hasToolPart = parts.some((p) => p.type.startsWith('tool-'))
  if (!hasToolPart) return false

  // Check if there's substantial text AFTER the last tool part
  const lastToolIndex = parts.reduce(
    (idx, p, i) => (p.type.startsWith('tool-') ? i : idx),
    -1,
  )
  const trailingText = parts
    .slice(lastToolIndex + 1)
    .filter((p) => p.type === 'text')
    .map((p) => (p as unknown as { text: string }).text)
    .join('')
    .trim()

  // If there's no meaningful text after the last tool call, the model was cut off
  return trailingText.length < 20
}

export function usePlanExecutor({ sendMessage, status, messages, autoSendPendingRef }: UsePlanExecutorOptions) {
  const activePlan = usePlanStore((s) => s.activePlan)
  const startExecuting = usePlanStore((s) => s.startExecuting)
  const completePlan = usePlanStore((s) => s.completePlan)
  const clearPlan = usePlanStore((s) => s.clearPlan)

  const executingRef = useRef(false)
  const prevStatusRef = useRef(status)

  // When questions are answered, send Q&A pairs to AI and clear the plan
  useEffect(() => {
    if (activePlan?.status !== 'answered') return
    const questions = activePlan.data.questions ?? []
    const answers = activePlan.data.answers ?? []
    const qaPairs = questions
      .map((q, i) => `Q: ${q.text}\nA: ${answers[i] || '(no answer)'}`)
      .join('\n\n')

    console.log('[PlanExecutor] Q&A answered — setting pendingFollowUp=todos, clearing plan, sending answers')
    usePlanStore.getState().setPendingFollowUp('todos')
    clearPlan()
    sendMessage({
      text: `[PLAN_FOLLOWUP:todos]\n${qaPairs}`,
    })
  }, [activePlan?.status, activePlan?.data, sendMessage, clearPlan])

  // When plan is approved, start execution
  useEffect(() => {
    if (activePlan?.status !== 'approved') return
    if (executingRef.current) return

    executingRef.current = true
    console.log('[PlanExecutor] Plan approved — setting pendingFollowUp=execute, starting execution')
    usePlanStore.getState().setPendingFollowUp('execute')
    startExecuting()

    sendMessage({
      text: `[PLAN_FOLLOWUP:execute]\nBuild it.`,
    })
  }, [activePlan?.status, sendMessage, startExecuting, activePlan?.data])

  // Watch for status transition loading -> ready to detect completion.
  // If the AI was cut off mid-execution (hit maxSteps/maxTokens), auto-resume
  // instead of marking the plan done.
  useEffect(() => {
    const wasLoading =
      prevStatusRef.current === 'streaming' ||
      prevStatusRef.current === 'submitted'
    prevStatusRef.current = status

    if (!executingRef.current) return
    if (!wasLoading || status !== 'ready') return
    if (autoSendPendingRef.current) return

    // Check if the model was cut off mid-build
    if (wasExecutionCutOff(messages)) {
      console.log('[PlanExecutor] Execution cut off (maxSteps/maxTokens) — auto-resuming')
      usePlanStore.getState().setPendingFollowUp('execute')
      sendMessage({
        text: `[PLAN_FOLLOWUP:execute]\nContinue building. Pick up where you left off.`,
      })
      return
    }

    completePlan()
    executingRef.current = false
  }, [status, messages, completePlan, autoSendPendingRef, sendMessage])
}
