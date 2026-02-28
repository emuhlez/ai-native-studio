import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import nebulaIcon from '../../../icons/nebula.svg'
import { useEditorStore } from '../../store/editorStore'
import { useDockingStore } from '../../store/dockingStore'
import { useConversationStore } from '../../store/conversationStore'
import { useCommentStore } from '../../store/commentStore'
import { VoiceButton } from '../AIAssistant/VoiceButton'
import { PillInput } from '../shared/PillInput'
import { MentionDropdown, type MentionItem } from '../shared/MentionDropdown'
import { MENTION_TOOLS, MENTION_SCRIPTING } from './mentionItems'
import type { InputSegment, PillInputHandle, MentionQuery } from '../../types'
import styles from './ViewportAIInput.module.css'

export function ViewportAIInput() {
  const [segments, setSegments] = useState<InputSegment[]>([])
  const pillInputRef = useRef<PillInputHandle>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null)
  const visible = useDockingStore((s) => s.viewportAIInputOpen)
  const setVisible = useDockingStore((s) => s.setViewportAIInputOpen)
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds)
  const gameObjects = useEditorStore((s) => s.gameObjects)
  const collaborators = useEditorStore((s) => s.collaborators)
  const rootObjectIds = useEditorStore((s) => s.rootObjectIds)
  const aiInputAnchorPosition = useEditorStore((s) => s.aiInputAnchorPosition)

  const mentionItems: MentionItem[] = useMemo(() => {
    const items: MentionItem[] = []
    // Collaborators
    for (const c of collaborators) {
      items.push({ id: c.id, label: c.name, kind: 'collaborator', category: 'collaborator' })
    }
    // Scene objects
    const workspaceId = rootObjectIds[0]
    const workspace = workspaceId ? gameObjects[workspaceId] : null
    if (workspace?.children) {
      for (const childId of workspace.children) {
        const obj = gameObjects[childId]
        if (obj && obj.name !== 'Drops') {
          items.push({
            id: childId,
            label: obj.name,
            kind: 'object',
            category: 'object',
            objectType: obj.primitiveType === 'terrain' ? 'terrain' : obj.type !== 'mesh' && obj.type !== 'empty' ? obj.type : undefined,
          })
        }
      }
    }
    // Tools
    items.push(...MENTION_TOOLS)
    // Scripting
    items.push(...MENTION_SCRIPTING)
    return items
  }, [collaborators, gameObjects, rootObjectIds])

  const prevSelectionRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    prevSelectionRef.current = new Set(selectedObjectIds)
  }, [])
  useEffect(() => {
    if (!visible) return
    const prevIds = prevSelectionRef.current
    const currentIds = new Set(selectedObjectIds)
    const newIds = selectedObjectIds.filter(id => !prevIds.has(id))
    prevSelectionRef.current = currentIds
    if (newIds.length === 0) return
    // Skip IDs that already have a pill in the input
    const existingPillIds = new Set(
      segments.filter(s => s.type === 'pill').map(s => s.id)
    )
    const newPills = newIds
      .filter(id => !existingPillIds.has(id))
      .map(id => ({ id, label: gameObjects[id]?.name ?? id }))
      .filter(p => p.label)
    if (newPills.length > 0) {
      pillInputRef.current?.insertPillsAtCursor(newPills)
    }
  }, [selectedObjectIds, visible, gameObjects, segments])
  // Asset pill insertion removed — selecting assets in the panel
  // should not auto-populate the chat input.

  const doSubmit = useCallback(() => {
    let text = pillInputRef.current?.getTextContent()?.trim() ?? ''
    if (!text) return

    // Check if any collaborator pills are present → route to comments instead of AI
    const collabPills = segments.filter(
      (s) => s.type === 'pill' && s.kind === 'collaborator',
    )
    if (collabPills.length > 0) {
      // Strip collaborator names from the text for the comment body
      const commentText = segments
        .map((s) => (s.type === 'text' ? s.text : s.kind === 'collaborator' ? '' : s.label))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      useCommentStore.getState().addComment({
        author: 'You',
        text: commentText,
        taggedCollaboratorIds: collabPills.map((s) => s.type === 'pill' ? s.id : ''),
        taggedCollaboratorNames: collabPills.map((s) => s.type === 'pill' ? s.label : ''),
      })
      // Open the comments panel so the user sees their comment
      const dock = useDockingStore.getState()
      if (!dock.widgets['comments']) {
        dock.dockWidget('comments', 'right-top')
      }
      setSegments([])
      setVisible(false)
      return
    }

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

    const convStore = useConversationStore.getState()
    convStore.createConversation()
    convStore.setPendingViewportMessage(text)
    // Signal generating state immediately so the toolbar spinner shows
    useEditorStore.getState().setAiGenerating(true)
    setSegments([])
    setVisible(false)
    // Keep selection so Cmd+/ "remembers" what was selected for follow-up actions
  }, [setVisible, segments])

  const handleVoiceTranscript = useCallback((text: string) => {
    const convStore = useConversationStore.getState()
    convStore.createConversation()
    convStore.setPendingViewportMessage(text)
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
      const target = e.target as HTMLElement
      if (overlayRef.current && !overlayRef.current.contains(target)) {
        // Don't close when clicking the viewport canvas (user is selecting assets)
        if (target.hasAttribute?.('data-viewport-canvas')) return
        // Don't close when clicking the @ mention dropdown (portaled to body)
        if (target.closest('[role="listbox"][aria-label="Mention"]')) return
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
          <img src={nebulaIcon} alt="" width={16} height={16} className={styles.inputIconImg} />
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
          onMentionQuery={setMentionQuery}
        />
        <MentionDropdown
          mention={mentionQuery}
          items={mentionItems}
          pillInputRef={pillInputRef}
          onClose={() => setMentionQuery(null)}
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
