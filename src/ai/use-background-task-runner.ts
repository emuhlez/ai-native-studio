import { useEffect, useRef } from 'react'
import { useBackgroundTaskStore } from '../store/backgroundTaskStore'
import { useConversationStore } from '../store/conversationStore'
import { useDockingStore } from '../store/dockingStore'
import { useAgentChat } from './use-agent-chat'
import { extractTaskSummary } from './classify-response'
import { stripLeadingBrackets } from './strip-brackets'
import type { PersistedMessage } from '../types'

/** Extract tool call data from AI SDK message parts for persistence. */
function extractToolCallsFromParts(parts: Array<{ type: string; [key: string]: unknown }>): PersistedMessage['toolCalls'] {
  const toolCalls: NonNullable<PersistedMessage['toolCalls']> = []
  for (const part of parts) {
    if (part.type.startsWith('tool-')) {
      toolCalls.push({
        toolName: part.type.slice(5) as string,
        toolCallId: (part.toolCallId as string) ?? undefined,
        args: (part.input ?? {}) as Record<string, unknown>,
        result: part.output as unknown,
      })
    }
  }
  return toolCalls.length > 0 ? toolCalls : undefined
}

/** Create a new conversation tab pre-populated with a user message and assistant response. */
function createConversationFromTask(
  command: string,
  responseText: string,
  toolCalls?: PersistedMessage['toolCalls'],
): string {
  const convStore = useConversationStore.getState()
  const cleanCommand = stripLeadingBrackets(command)
  const title = cleanCommand.slice(0, 40) + (cleanCommand.length > 40 ? '...' : '')
  const convId = convStore.createConversation(title)

  const userMsg: PersistedMessage = {
    id: `user-task-${Date.now()}`,
    role: 'user',
    textContent: command,
    timestamp: Date.now(),
  }
  convStore.addMessage(convId, userMsg)

  if (responseText || toolCalls?.length) {
    const assistantMsg: PersistedMessage = {
      id: `assistant-task-${Date.now()}`,
      role: 'assistant',
      textContent: responseText,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      timestamp: Date.now(),
    }
    convStore.addMessage(convId, assistantMsg)
  }

  return convId
}

export function useBackgroundTaskRunner() {
  const tasks = useBackgroundTaskStore((s) => s.tasks)
  const { sendMessage, setMessages, status, messages } = useAgentChat({ conversationId: '__background-tasks__' })

  const runningTaskIdRef = useRef<string | null>(null)
  const prevStatusRef = useRef(status)
  const messageCountBeforeTaskRef = useRef(0)
  const promotedRef = useRef(false)

  const hasRunning = tasks.some((t) => t.status === 'running')

  // Pick up next pending task when nothing is running
  useEffect(() => {
    if (runningTaskIdRef.current) return
    const pending = useBackgroundTaskStore.getState().getNextPending()
    if (!pending) return

    // Don't start if useChat is still busy
    if (status === 'streaming' || status === 'submitted') return

    // Clear previous task messages so each contextual input is fully isolated
    setMessages([])
    messageCountBeforeTaskRef.current = 0
    runningTaskIdRef.current = pending.id
    promotedRef.current = false
    useBackgroundTaskStore.getState().startTask(pending.id)
    sendMessage({ text: pending.command })
  }, [tasks, status, sendMessage, setMessages, messages.length])

  // Mid-stream detection: check for createPlan while streaming — promote to conversation panel
  useEffect(() => {
    if (!runningTaskIdRef.current) return
    if (promotedRef.current) return
    if (status !== 'streaming') return

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.parts?.length) return

    const hasPlan = lastMsg.parts.some(
      (p) => (p as { type: string }).type === 'tool-createPlan'
    )

    if (hasPlan) {
      // Immediately promote plans to a new conversation tab (they need user approval)
      promotedRef.current = true
      const taskId = runningTaskIdRef.current
      const textContent = lastMsg.parts
        .filter((p) => (p as { type: string }).type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('')
      const task = useBackgroundTaskStore.getState().tasks.find((t) => t.id === taskId)
      if (task) {
        const toolCalls = extractToolCallsFromParts(lastMsg.parts as Array<{ type: string; [key: string]: unknown }>)
        createConversationFromTask(task.command, textContent, toolCalls)
      }
      useBackgroundTaskStore.getState().dismissTask(taskId)
      useDockingStore.getState().setAiAssistantBodyCollapsed(false)
      // Don't clear runningTaskIdRef yet — let completion handler clean up
    }
  }, [status, messages])

  // Watch for status transition loading -> ready to detect completion
  useEffect(() => {
    const wasLoading =
      prevStatusRef.current === 'streaming' ||
      prevStatusRef.current === 'submitted'
    prevStatusRef.current = status

    if (!runningTaskIdRef.current) return
    if (!wasLoading || status !== 'ready') return

    const taskId = runningTaskIdRef.current
    runningTaskIdRef.current = null

    // If already promoted mid-stream, just stop — messages are already visible
    if (promotedRef.current) {
      promotedRef.current = false
      return
    }

    // Extract response data from the last assistant message
    const newMessages = messages.slice(messageCountBeforeTaskRef.current)
    const messageIds = newMessages.map((m) => m.id)
    const lastAssistant = [...newMessages].reverse().find((m) => m.role === 'assistant')

    let textContent = ''
    let toolNames: string[] = []
    let toolCalls: { toolName: string; args: Record<string, unknown> }[] = []
    let hasPlan = false

    if (lastAssistant?.parts?.length) {
      textContent = lastAssistant.parts
        .filter((p) => (p as { type: string }).type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('')

      hasPlan = lastAssistant.parts.some(
        (p) => (p as { type: string }).type === 'tool-createPlan'
      )

      // Extract tool calls from parts
      for (const part of lastAssistant.parts) {
        const p = part as { type: string; toolName?: string; args?: Record<string, unknown> }
        if (p.type === 'tool-invocation' || p.type?.startsWith('tool-')) {
          if (p.toolName) {
            toolNames.push(p.toolName)
            toolCalls.push({ toolName: p.toolName, args: p.args ?? {} })
          }
        }
      }
    }

    const summary = extractTaskSummary(textContent, toolNames)

    if (hasPlan) {
      // Safety net: promote plans that weren't caught mid-stream
      const task = useBackgroundTaskStore.getState().tasks.find((t) => t.id === taskId)
      if (task) {
        const persistedToolCalls = lastAssistant?.parts
          ? extractToolCallsFromParts(lastAssistant.parts as Array<{ type: string; [key: string]: unknown }>)
          : undefined
        createConversationFromTask(task.command, textContent, persistedToolCalls)
      }
      useBackgroundTaskStore.getState().dismissTask(taskId)
      useDockingStore.getState().setAiAssistantBodyCollapsed(false)
    } else {
      // All contextual inputs stay as tasks in the drawer
      useBackgroundTaskStore.getState().classifyAndComplete(taskId, {
        classification: 'task',
        summary,
        fullResponseText: textContent,
        toolCalls,
        messageIds,
      })
    }
  }, [status, messages])

  // Watch for errors
  useEffect(() => {
    if (!runningTaskIdRef.current) return
    if (status !== 'error') return

    useBackgroundTaskStore.getState().failTask(
      runningTaskIdRef.current,
      'AI request failed'
    )
    runningTaskIdRef.current = null
    promotedRef.current = false
  }, [status, messages])

  return {
    isRunning: hasRunning || runningTaskIdRef.current !== null,
  }
}
