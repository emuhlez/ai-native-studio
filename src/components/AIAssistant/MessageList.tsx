import { useRef, useEffect, useState } from 'react'
import type { UIMessage } from '@ai-sdk/react'
import { MessageBubble } from './MessageBubble'
import styles from './AIAssistant.module.css'

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  pendingToolCount: number
}

export function MessageList({ messages, isLoading, pendingToolCount }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const idleStatusPhrases = ['Thinking...', 'Building...', 'Generating...', 'Creating worlds...']
  const [statusIndex, setStatusIndex] = useState(0)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Pick a new friendly status phrase for each idle-thinking run (no active tools)
  useEffect(() => {
    if (!isLoading || pendingToolCount > 0) return
    setStatusIndex((prev) => (prev + 1) % idleStatusPhrases.length)
  }, [isLoading, pendingToolCount, idleStatusPhrases.length])

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
            key={`${message.id}-${index}`}
            message={message}
            isGenerating={isGenerating}
          />
        )
      })}

      {isLoading && pendingToolCount === 0 && (
        <div className={styles.status}>
          <span className={styles.statusText}>
            {idleStatusPhrases[statusIndex]}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
