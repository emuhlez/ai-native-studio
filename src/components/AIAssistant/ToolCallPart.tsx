import { useState } from 'react'
import { ChevronRight, ChevronDown, Wrench, Check, Loader2, AlertCircle } from 'lucide-react'
import styles from './AIAssistant.module.css'

interface ToolPartData {
  toolCallId: string
  toolName: string
  state: string
  input: unknown
  output?: unknown
}

interface ToolCallPartProps {
  toolData: ToolPartData
}

const TOOL_LABELS: Record<string, string> = {
  addObject: 'Add Object',
  removeObject: 'Remove Object',
  transformObject: 'Transform Object',
  setMaterial: 'Set Material',
  createTerrain: 'Create Terrain',
}

export function ToolCallPart({ toolData }: ToolCallPartProps) {
  const [expanded, setExpanded] = useState(false)
  const { toolName, input, state, output } = toolData

  const label = TOOL_LABELS[toolName] || toolName
  const isStreaming = state === 'input-streaming'
  const isExecuting = state === 'input-available'
  const isComplete = state === 'output-available'
  const isError = state === 'output-error' || (isComplete && output && typeof output === 'object' && 'error' in (output as Record<string, unknown>))

  return (
    <div className={styles.toolCard}>
      <button
        className={styles.toolCardHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.toolCardIcon}>
          {isStreaming || isExecuting ? (
            <Loader2 size={12} className={styles.spinner} />
          ) : isError ? (
            <AlertCircle size={12} className={styles.toolError} />
          ) : isComplete ? (
            <Check size={12} className={styles.toolSuccess} />
          ) : (
            <Wrench size={12} />
          )}
        </span>
        <span className={styles.toolCardName}>{label}</span>
        <span className={styles.toolCardState}>
          {isStreaming ? 'streaming...' : isExecuting ? 'executing...' : ''}
        </span>
        <span className={styles.toolCardChevron}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>

      {expanded && (
        <div className={styles.toolCardBody}>
          <div className={styles.toolCardSection}>
            <span className={styles.toolCardSectionLabel}>Args</span>
            <pre className={styles.toolCardPre}>
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {isComplete && output !== undefined && (
            <div className={styles.toolCardSection}>
              <span className={styles.toolCardSectionLabel}>Result</span>
              <pre className={styles.toolCardPre}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
