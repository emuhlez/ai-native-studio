import type { UIMessage } from '@ai-sdk/react'
import { ToolCallPart } from './ToolCallPart'
import { PlanCard } from './PlanCard'
import styles from './AIAssistant.module.css'

interface MessageBubbleProps {
  message: UIMessage
  isGenerating?: boolean
}

/** AI SDK v6 tool parts have type `tool-${toolName}` */
function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith('tool-')
}

function getToolName(part: { type: string }): string {
  return part.type.slice(5) // remove 'tool-' prefix
}

interface ToolPartData {
  toolCallId: string
  toolName: string
  state: string
  input: unknown
  output?: unknown
}

function extractToolData(part: unknown): ToolPartData {
  const p = part as Record<string, unknown>
  const toolName = getToolName(p as { type: string })
  return {
    toolCallId: (p.toolCallId as string) ?? '',
    toolName,
    state: (p.state as string) ?? '',
    input: p.input,
    output: p.output,
  }
}

export function MessageBubble({ message, isGenerating = false }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const textParts = message.parts
    ?.filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('') || ''

  const displayText = textParts.replace(/\[OPEN_ASSISTANT\]/g, '').trim()
  const showGeneratingPlaceholder =
    !isUser && isGenerating && !displayText && message.parts?.filter(isToolPart).length === 0

  const toolParts = message.parts
    ?.filter(isToolPart)
    || []

  const fileParts = message.parts
    ?.filter((p) => p.type === 'file')
    || []

  return (
    <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
      {fileParts.length > 0 && (
        <div className={styles.attachments}>
          {fileParts.map((part, i) => {
            const filePart = part as unknown as { type: 'file'; mediaType: string; url: string }
            if (filePart.mediaType?.startsWith('image/')) {
              return (
                <img
                  key={i}
                  src={filePart.url}
                  alt="Sketch attachment"
                  className={styles.attachmentImage}
                />
              )
            }
            return null
          })}
        </div>
      )}

      {showGeneratingPlaceholder ? (
        <div className={styles.bubbleText}>
          <span className={styles.generatingText}>Generating...</span>
        </div>
      ) : (displayText || !isUser) ? (
        <div className={styles.bubbleText}>
          {displayText || (isUser ? '' : 'Done.')}
        </div>
      ) : null}

      {toolParts.length > 0 && (
        <div className={styles.toolCalls}>
          {toolParts.map((part, i) => {
            const td = extractToolData(part)
            if (td.toolName === 'createPlan') {
              return <PlanCard key={td.toolCallId || i} toolData={td} />
            }
            return (
              <ToolCallPart
                key={td.toolCallId || i}
                toolData={td}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
