import { useRef, useEffect } from 'react'
import type { UIMessage } from '@ai-sdk/react'
import { usePlanStore } from '../../store/planStore'
import { MessageBubble } from './MessageBubble'
import toDoIcon from '../../../prompts/to-do.svg'
import styles from './AIAssistant.module.css'

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  pendingToolCount: number
}

export function MessageList({ messages, isLoading, pendingToolCount }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const activePlan = usePlanStore((s) => s.activePlan)
  const hasAgentTasks =
    pendingToolCount > 0 ||
    (activePlan != null &&
      activePlan.status !== 'rejected' &&
      activePlan.status !== 'done')

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const lastMessage = messages[messages.length - 1]
  const lastIsAssistantWithNoText =
    lastMessage?.role === 'assistant' &&
    isLoading &&
    !(lastMessage.parts
      ?.filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('')
      ?.replace(/\[OPEN_ASSISTANT\]/g, '')
      .trim())

  return (
    <div className={styles.messages}>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1
        const isGenerating =
          isLast && message.role === 'assistant' && lastIsAssistantWithNoText
        return (
          <MessageBubble
            key={message.id}
            message={message}
            isGenerating={isGenerating}
          />
        )
      })}

      {isLoading && (
        <div className={styles.status}>
          {hasAgentTasks ? (
            <img
              src={toDoIcon}
              alt=""
              width={14}
              height={14}
              className={styles.statusToDosIcon}
              aria-hidden
            />
          ) : (
            <span className={styles.statusDot} />
          )}
          {pendingToolCount > 0
            ? `Executing ${pendingToolCount} tool${pendingToolCount > 1 ? 's' : ''}...`
            : 'Thinking...'}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
