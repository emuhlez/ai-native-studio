import { useState } from 'react'
import type { UIMessage } from '@ai-sdk/react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { ToolCallPart } from './ToolCallPart'
import { PlanCard } from './PlanCard'
import { stripLeadingBrackets } from '../../ai/strip-brackets'
import styles from './AIAssistant.module.css'

const TOOL_CALLS_COLLAPSE_THRESHOLD = 1

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

const TOOL_LABELS: Record<string, string> = {
  addObject: 'Add Object',
  removeObject: 'Remove Object',
  transformObject: 'Transform Object',
  setMaterial: 'Set Material',
}

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName
}

/** Summary format: "Add (4) Objects", "Transform (1) Object" */
const TOOL_SUMMARY: Record<string, { verb: string; noun: string }> = {
  addObject: { verb: 'Add', noun: 'Object' },
  removeObject: { verb: 'Remove', noun: 'Object' },
  transformObject: { verb: 'Transform', noun: 'Object' },
  setMaterial: { verb: 'Set', noun: 'Material' },
}

function getToolSummaryLabel(toolName: string, count: number): string {
  const entry = TOOL_SUMMARY[toolName]
  if (!entry) return `${toolName} (${count})`
  const noun = count === 1 ? entry.noun : `${entry.noun}s`
  return `${entry.verb} (${count}) ${noun}`
}

/** Shorten plan-follow-up user messages for display (full text still sent to API).
 *  Returns null if the text is not a plan follow-up. */
function shortenPlanFollowUpDisplay(text: string): string | null {
  if (/^\[PLAN_FOLLOWUP:todos\]/i.test(text)) return ''
  if (/^\[PLAN_FOLLOWUP:execute\]/i.test(text)) return 'Build it.'
  return null
}

/** Render lightweight bold markup: turns **Title** into a <strong>Title</strong> span. */
function renderTextWithBold(text: string) {
  const nodes: Array<string | JSX.Element> = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    nodes.push(
      <strong key={`b-${nodes.length}`}>{match[1]}</strong>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export function MessageBubble({ message, isGenerating = false }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [toolCallsExpanded, setToolCallsExpanded] = useState(false)

  const textParts = message.parts
    ?.filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('') || ''

  // For user messages, check for plan follow-up tags BEFORE stripping brackets
  const displayText = isUser
    ? (shortenPlanFollowUpDisplay(textParts.trim()) ?? stripLeadingBrackets(textParts).trim())
    : stripLeadingBrackets(textParts).trim()
  const textToShow = displayText
  const hasQuestionPlan =
    !isUser &&
    message.parts?.some((p) => {
      const part = p as { type: string; input?: { questions?: unknown[] } }
      return part.type === 'tool-createPlan' && (part.input?.questions?.length ?? 0) > 0
    })
  const showGeneratingPlaceholder =
    !isUser && isGenerating && !displayText && message.parts?.filter(isToolPart).length === 0

  const toolParts = message.parts
    ?.filter(isToolPart)
    || []

  const planParts = toolParts.filter((p) => getToolName(p) === 'createPlan')
  const otherToolParts = toolParts.filter((p) => getToolName(p) !== 'createPlan')
  const otherCount = otherToolParts.length
  const collapseToolCalls = otherCount > TOOL_CALLS_COLLAPSE_THRESHOLD

  const summaryByTool = otherToolParts.reduce<Record<string, number>>((acc, part) => {
    const name = getToolName(part)
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})
  const summaryEntries = Object.entries(summaryByTool).sort((a, b) => b[1] - a[1])

  const fileParts = message.parts
    ?.filter((p) => p.type === 'file')
    || []

  return (
    <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
      {fileParts.length > 0 && (
        <div className={styles.attachments}>
          {fileParts.map((part, i) => {
            const filePart = part as unknown as { type: 'file'; mediaType: string; url: string; name?: string }
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
            // Non-image files: render as icon + filename + download link (Gap 7)
            const fileName = filePart.name || `file-${i + 1}`
            return (
              <a
                key={i}
                href={filePart.url}
                download={fileName}
                className={styles.attachmentFile}
                title={`Download ${fileName}`}
              >
                <FileText size={12} className={styles.attachmentFileIcon} />
                <span>{fileName}</span>
              </a>
            )
          })}
        </div>
      )}

      {showGeneratingPlaceholder ? (
        <div className={styles.bubbleText}>
          <span className={styles.generatingText}>Generating...</span>
        </div>
      ) : textToShow && !hasQuestionPlan ? (
        <div className={styles.bubbleText}>
          {renderTextWithBold(textToShow)}
        </div>
      ) : null}

      {(planParts.length > 0 || otherToolParts.length > 0) && (
        <div className={styles.toolCalls}>
          {planParts.map((part, i) => {
            const td = extractToolData(part)
            return <PlanCard key={td.toolCallId || i} toolData={td} />
          })}
          {otherToolParts.length > 0 && (
            <>
              {collapseToolCalls && (
                <button
                  type="button"
                  className={styles.toolCallsSummary}
                  onClick={() => setToolCallsExpanded(!toolCallsExpanded)}
                >
                  <span className={styles.toolCallsSummaryChevron}>
                    {toolCallsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <span className={styles.toolCallsSummaryText}>
                    {summaryEntries.map(([name, count]) => getToolSummaryLabel(name, count)).join(', ')}
                  </span>
                </button>
              )}
              {(!collapseToolCalls || toolCallsExpanded) &&
                otherToolParts.map((part, i) => {
                  const td = extractToolData(part)
                  return <ToolCallPart key={td.toolCallId || i} toolData={td} />
                })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
