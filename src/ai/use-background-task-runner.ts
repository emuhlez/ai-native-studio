import { useEffect, useRef } from 'react'
import { useBackgroundTaskStore } from '../store/backgroundTaskStore'
import { useConversationStore } from '../store/conversationStore'
import { useDockingStore } from '../store/dockingStore'
import { useAgentChat } from './use-agent-chat'
import { classifyResponse, extractTaskSummary } from './classify-response'
import type { PersistedMessage } from '../types'

/** Create a new conversation tab pre-populated with a user message and assistant response. */
function createConversationFromTask(command: string, responseText: string): string {
  const convStore = useConversationStore.getState()
  const title = command.slice(0, 40) + (command.length > 40 ? '...' : '')
  const convId = convStore.createConversation(title)

  const userMsg: PersistedMessage = {
    id: `user-task-${Date.now()}`,
    role: 'user',
    textContent: command,
    timestamp: Date.now(),
  }
  convStore.addMessage(convId, userMsg)

  if (responseText) {
    const assistantMsg: PersistedMessage = {
      id: `assistant-task-${Date.now()}`,
      role: 'assistant',
      textContent: responseText,
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

  // Mid-stream detection: check for [OPEN_ASSISTANT] or createPlan while streaming
  useEffect(() => {
    if (!runningTaskIdRef.current) return
    if (promotedRef.current) return
    if (status !== 'streaming') return

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.parts?.length) return

    const hasPlan = lastMsg.parts.some(
      (p) => (p as { type: string }).type === 'tool-createPlan'
    )
    const textContent = lastMsg.parts
      .filter((p) => (p as { type: string }).type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('')
    const wantsAssistant = textContent.includes('[OPEN_ASSISTANT]')

    if (hasPlan || wantsAssistant) {
      // Immediately promote to a new conversation tab
      promotedRef.current = true
      const taskId = runningTaskIdRef.current
      const task = useBackgroundTaskStore.getState().tasks.find((t) => t.id === taskId)
      if (task) {
        createConversationFromTask(task.command, textContent)
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

    const wantsAssistant = textContent.includes('[OPEN_ASSISTANT]')
    const classification = classifyResponse({ textContent, toolNames, hasPlan, wantsAssistant })
    const summary = extractTaskSummary(textContent, toolNames)

    if (classification === 'task') {
      // Keep in drawer — no need to hide message IDs since tasks use a separate chat instance
      useBackgroundTaskStore.getState().classifyAndComplete(taskId, {
        classification,
        summary,
        fullResponseText: textContent,
        toolCalls,
        messageIds,
      })
    } else {
      // Conversation: create a new conversation tab, remove from drawer, expand panel
      const task = useBackgroundTaskStore.getState().tasks.find((t) => t.id === taskId)
      if (task) {
        createConversationFromTask(task.command, textContent)
      }
      useBackgroundTaskStore.getState().dismissTask(taskId)
      useDockingStore.getState().setAiAssistantBodyCollapsed(false)
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
