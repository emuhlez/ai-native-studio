import { useState, useRef, useEffect, useCallback } from 'react'
import nebulaIcon from '../../../icons/nebula.svg'
import { useEditorStore } from '../../store/editorStore'
import { useDockingStore } from '../../store/dockingStore'
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore'
import { VoiceButton } from '../AIAssistant/VoiceButton'
import { PillInput } from '../shared/PillInput'
import type { InputSegment, PillInputHandle } from '../../types'
import styles from './ViewportAIInput.module.css'

export function ViewportAIInput() {
  const [segments, setSegments] = useState<InputSegment[]>([])
  const pillInputRef = useRef<PillInputHandle>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const visible = useDockingStore((s) => s.viewportAIInputOpen)
  const setVisible = useDockingStore((s) => s.setViewportAIInputOpen)
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds)
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds)
  const gameObjects = useEditorStore((s) => s.gameObjects)
  const assets = useEditorStore((s) => s.assets)
  const aiInputAnchorPosition = useEditorStore((s) => s.aiInputAnchorPosition)

  const assetById = useRef<Map<string, { id: string; name: string }>>(new Map())
  assetById.current = new Map(assets.map((a) => [a.id, { id: a.id, name: a.name }]))

  const prevSelectionRef = useRef<Set<string>>(new Set())
  const prevAssetSelectionRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    prevSelectionRef.current = new Set(selectedObjectIds)
    prevAssetSelectionRef.current = new Set(selectedAssetIds)
  }, [])
  useEffect(() => {
    if (!visible) return
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
  }, [selectedObjectIds, visible, gameObjects])
  useEffect(() => {
    if (!visible) return
    const prevIds = prevAssetSelectionRef.current
    const currentIds = new Set(selectedAssetIds)
    const newIds = selectedAssetIds.filter(id => !prevIds.has(id))
    prevAssetSelectionRef.current = currentIds
    if (newIds.length === 0) return
    const newPills = newIds
      .map(id => assetById.current.get(id))
      .filter((p): p is { id: string; name: string } => p != null && p.name != null)
      .map(p => ({ id: p.id, label: p.name }))
    if (newPills.length > 0) {
      pillInputRef.current?.insertPillsAtCursor(newPills)
    }
  }, [selectedAssetIds, visible, assets])

  const doSubmit = useCallback(() => {
    let text = pillInputRef.current?.getTextContent()?.trim() ?? ''
    if (!text) return

    // When pen tool is active, prepend world-position context from last drawn position
    const editorState = useEditorStore.getState()
    if (editorState.activeTool === 'pen' && editorState.penToolLastDrawnPosition && editorState.screenToWorld) {
      const { x, y } = editorState.penToolLastDrawnPosition
      const worldPos = editorState.screenToWorld(x, y)
      if (worldPos) {
        text = `[Context: the user drew near world position [${worldPos.x}, ${worldPos.y}, ${worldPos.z}]] ${text}`
      }
    }

    // When area selection circle exists, prepend spatial context
    if (editorState.areaSelectionCircle && editorState.screenToWorld) {
      const c = editorState.areaSelectionCircle
      const centerWorld = editorState.screenToWorld(c.centerX, c.centerY)
      const edgeWorld = editorState.screenToWorld(c.centerX + c.radius, c.centerY)
      if (centerWorld) {
        let worldRadius = 0
        if (edgeWorld) {
          const dx = edgeWorld.x - centerWorld.x
          const dy = edgeWorld.y - centerWorld.y
          const dz = edgeWorld.z - centerWorld.z
          worldRadius = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 100) / 100
        }
        text = `[Context: the user circled an area centered at world position [${centerWorld.x}, ${centerWorld.y}, ${centerWorld.z}], approximate world radius: ${worldRadius}. Objects inside this area are already selected.] ${text}`
      }
      editorState.setAreaSelectionCircle(null)
    }

    useBackgroundTaskStore.getState().enqueueTask(text)
    setSegments([])
    setVisible(false)
    // Keep selection so Cmd+/ "remembers" what was selected for follow-up actions
  }, [setVisible])

  const handleVoiceTranscript = useCallback((text: string) => {
    useBackgroundTaskStore.getState().enqueueTask(text)
    setVisible(false)
  }, [setVisible])

  // Focus input when overlay opens
  const prevVisibleRef = useRef(visible)
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => pillInputRef.current?.focus(), 0)
      prevVisibleRef.current = true
      return () => clearTimeout(t)
    }
    if (prevVisibleRef.current) {
      setSegments([])
    }
    prevVisibleRef.current = false
  }, [visible])

  // Click outside: close contextual input
  useEffect(() => {
    if (!visible) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (overlayRef.current && !overlayRef.current.contains(target)) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    return () => document.removeEventListener('mousedown', handleMouseDown, true)
  }, [visible, setVisible])

  if (!visible) {
    return null
  }

  const overlayStyle: React.CSSProperties | undefined = aiInputAnchorPosition
    ? { left: aiInputAnchorPosition.x, top: aiInputAnchorPosition.y, transform: 'translateX(-50%)', bottom: 'auto' }
    : undefined

  const hasText = segments.some(s => s.type === 'text' && s.text.trim()) || segments.some(s => s.type === 'pill')

  return (
    <div ref={overlayRef} className={styles.overlay} style={overlayStyle}>
      <div className={styles.inputRow} role="search">
        <span className={styles.inputIcon} aria-hidden>
          <img src={nebulaIcon} alt="" width={24} height={24} className={styles.inputIconImg} />
        </span>
        <PillInput
          ref={pillInputRef}
          segments={segments}
          onSegmentsChange={setSegments}
          onSubmit={doSubmit}
          placeholder="Build with Assistant"
          autoFocus
          className={styles.pillsAndInput}
          ariaLabel="Describe what to do"
        />
        <VoiceButton
          onTranscript={handleVoiceTranscript}
          hasText={hasText}
          onSendClick={doSubmit}
          useCollapsedStyle
        />
      </div>
    </div>
  )
}
