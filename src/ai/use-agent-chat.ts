import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useConversationStore } from '../store/conversationStore'
import { serializeSceneContext, serializeSelectionContext, serializeCameraContext } from './scene-context'
import { executeTool } from './tool-executor'
import type { ConversationMode, PersistedMessage } from '../types'

/** Convert persisted messages back into UIMessage format so the AI SDK can render them. */
function persistedToUIMessages(messages: PersistedMessage[]): UIMessage[] {
  return messages.map((m) => {
    const parts: UIMessage['parts'] = []

    if (m.textContent) {
      parts.push({ type: 'text' as const, text: m.textContent })
    }

    // Ensure every message has at least one part
    if (parts.length === 0) {
      parts.push({ type: 'text' as const, text: '' })
    }

    return { id: m.id, role: m.role, parts }
  })
}

interface UseAgentChatOptions {
  conversationId?: string | null
  mode?: ConversationMode
}

export function useAgentChat(options?: UseAgentChatOptions) {
  const storeRef = useRef(useEditorStore.getState())

  // Subscribe once via useEffect to avoid re-subscribing every render
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state) => {
      storeRef.current = state
    })
    return unsub
  }, [])

  const activeConversationId = useConversationStore((s) => s.activeConversationId)
  const mode = options?.mode

  // Use a stable chat ID for useChat. Only change when an explicit conversationId
  // is provided or when the user switches conversations via the store.
  // Fall back to 'agent-chat' to keep the hook stable on first render.
  const chatId = options?.conversationId ?? activeConversationId ?? 'agent-chat'
  const isBackgroundTasks = chatId === '__background-tasks__'

  // Tracks which conversation ID is currently streaming so onFinish/onError
  // can clear the yellow indicator even if the user has switched tabs.
  const streamingConvRef = useRef<string | null>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent/chat',
        body: () => {
          const state = storeRef.current
          // When in pen tool, use sketch mode so the AI understands generate (new from sketch) vs annotate (modify existing)
          const effectiveMode = mode ?? (state.activeTool === 'pen' ? 'sketch' : undefined)

          // Include camera context in sketch mode for spatial grounding
          let cameraContext: string | undefined
          if (effectiveMode === 'sketch' && state.getCameraInfo) {
            const camInfo = state.getCameraInfo()
            if (camInfo) {
              cameraContext = serializeCameraContext(camInfo)
            }
          }

          return {
            sceneContext: serializeSceneContext(
              state.gameObjects,
              state.rootObjectIds
            ),
            selectionContext: serializeSelectionContext(
              state.gameObjects,
              state.selectedObjectIds
            ),
            mode: effectiveMode,
            cameraContext,
          }
        },
      }),
    [chatId, mode]
  )

  const chat = useChat({
    id: chatId,
    transport,
    onToolCall: ({ toolCall }) => {
      console.log('[useAgentChat] onToolCall:', toolCall.toolName, toolCall.input)
      try {
        const result = executeTool(
          toolCall.toolName,
          toolCall.input as Record<string, unknown>,
          toolCall.toolCallId
        )
        console.log('[useAgentChat] tool result:', toolCall.toolName, result)
        return result
      } catch (err) {
        console.error('[useAgentChat] tool execution error:', toolCall.toolName, err)
        return { error: String(err) }
      }
    },
    onFinish: ({ message }) => {
      // Clear streaming indicator for the conversation that started this stream
      if (streamingConvRef.current) {
        useConversationStore.getState().markReady(streamingConvRef.current)
        streamingConvRef.current = null
      }

      if (isBackgroundTasks) return
      const convStore = useConversationStore.getState()
      const convId = options?.conversationId ?? convStore.activeConversationId
      if (!convId || !convStore.conversations[convId]) return

      const textContent = message.parts
        ?.filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
        .map((p) => p.text)
        .join('') || ''

      const toolCalls = message.parts
        ?.filter((p) => p.type.startsWith('tool-'))
        .map((p) => {
          // AI SDK v6: tool parts have type `tool-${toolName}`, properties at top level
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const part = p as any
          return {
            toolName: part.type.slice(5) as string,
            args: (part.input ?? {}) as Record<string, unknown>,
            result: part.output,
          }
        })

      const persisted: PersistedMessage = {
        id: message.id,
        role: 'assistant',
        textContent,
        toolCalls: toolCalls?.length ? toolCalls : undefined,
        timestamp: Date.now(),
      }

      convStore.addMessage(convId, persisted)
    },
    onError: (error) => {
      // Clear streaming indicator for the conversation that started this stream
      if (streamingConvRef.current) {
        useConversationStore.getState().markReady(streamingConvRef.current)
        streamingConvRef.current = null
      }
      console.error('[useAgentChat] onError:', error)
      useEditorStore.getState().log(
        `AI Error: ${error.message}`,
        'error',
        'AI Agent'
      )
    },
  })

  // Track per-conversation streaming state so non-active tabs can show
  // a yellow "in-progress" indicator after the user switches away.
  const convIdForStreaming = options?.conversationId ?? activeConversationId
  useEffect(() => {
    if (isBackgroundTasks || !convIdForStreaming) return
    const convStore = useConversationStore.getState()
    const isStreaming = chat.status === 'streaming' || chat.status === 'submitted'
    if (isStreaming) {
      streamingConvRef.current = convIdForStreaming
      convStore.markStreaming(convIdForStreaming)
    } else {
      convStore.markReady(convIdForStreaming)
      if (streamingConvRef.current === convIdForStreaming) {
        streamingConvRef.current = null
      }
    }
  }, [chat.status, convIdForStreaming, isBackgroundTasks])

  // Restore persisted messages when switching to a conversation that the
  // AI SDK has no in-memory cache for (e.g. tab switch, page reload).
  const prevChatIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (isBackgroundTasks) return
    // Skip the very first render where prevChatIdRef is null but chatId is already set —
    // allow it to run so we restore messages on initial page load too.
    if (prevChatIdRef.current === chatId) return
    prevChatIdRef.current = chatId

    // If the AI SDK already has messages cached for this id, nothing to do
    if (chat.messages.length > 0) return

    const convStore = useConversationStore.getState()
    const convId = options?.conversationId ?? convStore.activeConversationId
    if (!convId) return
    const conv = convStore.conversations[convId]
    if (!conv || conv.messages.length === 0) return

    chat.setMessages(persistedToUIMessages(conv.messages))
  }, [chatId, isBackgroundTasks, chat.messages.length, chat.setMessages, options?.conversationId])

  // Wrap sendMessage to persist user messages to conversation store
  const sendMessage = useCallback(
    (params?: Parameters<typeof chat.sendMessage>[0]) => {
      if (!isBackgroundTasks) {
        const convStore = useConversationStore.getState()
        let convId = options?.conversationId ?? convStore.activeConversationId

        // Ensure we always have a conversation so the chat is saved and visible in the switcher
        if (!convId || !convStore.conversations[convId]) {
          convId = convStore.createConversation()
        }

        if (convId && params) {
          const text = typeof params === 'string'
            ? params
            : 'text' in params
              ? (params as { text: string }).text
              : ''

          const hasImage = typeof params === 'object' && params !== null && 'parts' in params
            ? ((params as { parts?: Array<{ type: string }> }).parts)?.some((p) => p.type === 'file')
            : false

          const persisted: PersistedMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            textContent: text || '',
            timestamp: Date.now(),
            hasImage: hasImage || undefined,
          }
          convStore.addMessage(convId, persisted)
        }
      }

      return chat.sendMessage(params)
    },
    [chat.sendMessage, isBackgroundTasks, options?.conversationId]
  )

  return {
    ...chat,
    sendMessage,
    conversationId: chatId,
  }
}
