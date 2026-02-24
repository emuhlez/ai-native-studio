import { useState, useRef, useEffect, type FormEvent, type ReactNode } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { VoiceButton } from './VoiceButton'
import { PillInput } from '../shared/PillInput'
import type { InputSegment, PillInputHandle } from '../../types'
import styles from './AIAssistant.module.css'

interface ChatInputProps {
  onSend: (text: string) => void
  isLoading: boolean
  placeholder?: string
  extraButtons?: ReactNode
  showVoice?: boolean
  inline?: boolean
  onExpandRequested?: () => void
  segments?: InputSegment[]
  onSegmentsChange?: (segments: InputSegment[]) => void
}

export function ChatInput({ onSend, isLoading, placeholder, extraButtons, showVoice = true, inline = false, onExpandRequested, segments: controlledSegments, onSegmentsChange }: ChatInputProps) {
  const [internalSegments, setInternalSegments] = useState<InputSegment[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const pillInputRef = useRef<PillInputHandle>(null)
  const isControlled = controlledSegments !== undefined
  const segments = isControlled ? controlledSegments : internalSegments

  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds)
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds)
  const gameObjects = useEditorStore((s) => s.gameObjects)
  const assets = useEditorStore((s) => s.assets)
  const assetByIdRef = useRef<Map<string, { id: string; name: string }>>(new Map())
  assetByIdRef.current = new Map(assets.map((a) => [a.id, { id: a.id, name: a.name }]))
  const prevSelectionRef = useRef<Set<string>>(new Set())
  const prevAssetSelectionRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    prevSelectionRef.current = new Set(selectedObjectIds)
    prevAssetSelectionRef.current = new Set(selectedAssetIds)
  }, [])
  useEffect(() => {
    if (!isFocused) return
    const prevIds = prevSelectionRef.current
    const currentIds = new Set(selectedObjectIds)
    const newIds = selectedObjectIds.filter(id => !prevIds.has(id))
    prevSelectionRef.current = currentIds
    if (newIds.length === 0) return
    const newPills = newIds
      .map(id => ({ id, label: gameObjects[id]?.name ?? id }))
      .filter(p => p.label)
    if (newPills.length > 0) {
      pillInputRef.current?.insertPillsAtCursor(newPills)
    }
  }, [selectedObjectIds, isFocused, gameObjects])
  useEffect(() => {
    if (!isFocused) return
    const prevIds = prevAssetSelectionRef.current
    const currentIds = new Set(selectedAssetIds)
    const newIds = selectedAssetIds.filter(id => !prevIds.has(id))
    prevAssetSelectionRef.current = currentIds
    if (newIds.length === 0) return
    const newPills = newIds
      .map(id => assetByIdRef.current.get(id))
      .filter((p): p is { id: string; name: string } => p != null && p.name != null)
      .map(p => ({ id: p.id, label: p.name }))
    if (newPills.length > 0) {
      pillInputRef.current?.insertPillsAtCursor(newPills)
    }
  }, [selectedAssetIds, isFocused, assets])

  const handleSegmentsChange = (next: InputSegment[]) => {
    if (isControlled && onSegmentsChange) {
      onSegmentsChange(next)
    } else {
      setInternalSegments(next)
    }
    const hasContent = next.some(s => (s.type === 'text' && s.text.trim()) || s.type === 'pill')
    if (hasContent && onExpandRequested) {
      onExpandRequested()
    }
  }

  const submit = () => {
    const text = pillInputRef.current?.getTextContent()?.trim() ?? ''
    if (!text || isLoading) return
    onSend(text)
    if (isControlled && onSegmentsChange) {
      onSegmentsChange([])
    } else {
      setInternalSegments([])
    }
  }

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleListeningTranscript = (text: string) => {
    const newSegments: InputSegment[] = [{ type: 'text', text }]
    if (isControlled && onSegmentsChange) {
      onSegmentsChange(newSegments)
    } else {
      setInternalSegments(newSegments)
    }
  }

  const hasText = segments.some(s => (s.type === 'text' && s.text.trim()) || s.type === 'pill')

  return (
    <form
      onSubmit={onFormSubmit}
      className={`${styles.inputArea} ${inline ? styles.inputAreaInline : ''}`}
      onMouseDown={inline ? (e) => e.stopPropagation() : undefined}
    >
      <div className={`${styles.inputWrapper} ${showVoice ? styles.inputWrapperWithVoice : ''}`}>
        <PillInput
          ref={pillInputRef}
          segments={segments}
          onSegmentsChange={handleSegmentsChange}
          onSubmit={submit}
          placeholder={placeholder || 'Build with Assistant'}
          disabled={isLoading}
          className={styles.inputField}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {showVoice && (
          <VoiceButton
            onTranscript={() => {}}
            hasText={hasText}
            onSendClick={submit}
            onListeningTranscript={handleListeningTranscript}
          />
        )}
      </div>
      {extraButtons}
    </form>
  )
}
