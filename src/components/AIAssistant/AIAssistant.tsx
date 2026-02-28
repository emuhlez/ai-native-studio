import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Bot, Paperclip, X } from 'lucide-react'
import { DockablePanel } from '../shared/DockablePanel'
import { useDockingStore } from '../../store/dockingStore'
import { useEditorStore } from '../../store/editorStore'
import { useAgentChat } from '../../ai/use-agent-chat'
import { useSpeechRecognition } from '../../ai/use-speech-recognition'
import { usePlanExecutor } from '../../ai/use-plan-executor'
import { usePlanStore } from '../../store/planStore'
import { useConversationStore } from '../../store/conversationStore'
import { TasksDropdown } from './TasksDropdown'
import { ConversationSwitcher } from './ConversationSwitcher'
import { MessageList } from './MessageList'
import { BackgroundTaskDrawer } from './BackgroundTaskDrawer'
import { useBackgroundTaskRunner } from '../../ai/use-background-task-runner'
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore'
import { useCommentStore } from '../../store/commentStore'
import { PlanCard } from './PlanCard'
import { PillInput } from '../shared/PillInput'
import { MentionDropdown, type MentionItem } from '../shared/MentionDropdown'
import { MENTION_TOOLS, MENTION_SCRIPTING } from '../Viewport/mentionItems'
import type { InputSegment, PillInputHandle, MentionQuery } from '../../types'
import styles from './AIAssistant.module.css'

export function AIAssistant() {
  const aiAssistantBodyCollapsed = useDockingStore((state) => state.aiAssistantBodyCollapsed)
  const setAiAssistantBodyCollapsed = useDockingStore((state) => state.setAiAssistantBodyCollapsed)
  const viewportAIInputOpen = useDockingStore((state) => state.viewportAIInputOpen)
  const chatbotUIMode = useDockingStore((state) => state.chatbotUIMode)
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds)
  const selectedAssetIds = useEditorStore((s) => s.selectedAssetIds)
  const gameObjects = useEditorStore((s) => s.gameObjects)
  const assets = useEditorStore((s) => s.assets)
  const collaborators = useEditorStore((s) => s.collaborators)
  const rootObjectIds = useEditorStore((s) => s.rootObjectIds)
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null)

  const mentionItems: MentionItem[] = useMemo(() => {
    const items: MentionItem[] = []
    for (const c of collaborators) {
      items.push({ id: c.id, label: c.name, kind: 'collaborator', category: 'collaborator' })
    }
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
    items.push(...MENTION_TOOLS)
    items.push(...MENTION_SCRIPTING)
    return items
  }, [collaborators, gameObjects, rootObjectIds])
  const { messages, sendMessage, status, autoSendPendingRef, conversationId } = useAgentChat()
  const { isRunning: isBackgroundTaskRunning } = useBackgroundTaskRunner()
  const hiddenMessageIds = useBackgroundTaskStore((s) => s.hiddenMessageIds)
  const visibleMessages = messages.filter((m) => !hiddenMessageIds.has(m.id))
  usePlanExecutor({ sendMessage, status, messages, autoSendPendingRef })
  const pendingViewportMessage = useConversationStore((s) => s.pendingViewportMessage)
  const activePlan = usePlanStore((s) => s.activePlan)

  // Consume pending messages queued from the mini composer (ViewportAIInput).
  // Read from the store directly to avoid React strict mode double-invoke
  // sending the message twice (closure retains stale value across both runs).
  useEffect(() => {
    const pending = useConversationStore.getState().pendingViewportMessage
    if (!pending) return
    if (status === 'streaming' || status === 'submitted') return
    useConversationStore.getState().setPendingViewportMessage(null)
    sendMessage({ text: pending })
  }, [pendingViewportMessage, status, sendMessage])

  // Sync main chat loading state to shared store so Toolbar can show spinner
  useEffect(() => {
    const generating = status === 'streaming' || status === 'submitted'
    useEditorStore.getState().setAiGenerating(generating)
  }, [status])
  const [segments, setSegments] = useState<InputSegment[]>([])
  const [collapsedVoiceAccumulated, setCollapsedVoiceAccumulated] = useState('')
  const pillInputRef = useRef<PillInputHandle>(null)

  // File upload state (Gap 1)
  const [pendingFiles, setPendingFiles] = useState<{ file: File; dataUrl: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setPendingFiles((prev) => [...prev, { file, dataUrl: reader.result as string }])
      }
      reader.readAsDataURL(file)
    })
    // Reset so the same file can be re-selected
    e.target.value = ''
  }, [])

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Per-conversation input drafts — save/restore when switching tabs
  const draftsRef = useRef<Map<string, InputSegment[]>>(new Map())
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments
  const prevConversationIdRef = useRef<string | null>(conversationId)

  useEffect(() => {
    const prevId = prevConversationIdRef.current
    if (prevId && prevId !== conversationId) {
      // Save current input as draft for the conversation we're leaving
      draftsRef.current.set(prevId, segmentsRef.current)
      // Restore draft for the conversation we're entering (or start empty)
      const draft = conversationId ? draftsRef.current.get(conversationId) ?? [] : []
      setSegments(draft)
    }
    prevConversationIdRef.current = conversationId
  }, [conversationId])

  const assetByIdRef = useRef<Map<string, { id: string; name: string }>>(new Map())
  assetByIdRef.current = new Map(assets.map((a) => [a.id, { id: a.id, name: a.name }]))

  const prevSelectionRef = useRef<Set<string>>(new Set())
  const prevAssetSelectionRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    prevSelectionRef.current = new Set(selectedObjectIds)
    prevAssetSelectionRef.current = new Set(selectedAssetIds)
  }, [])
  useEffect(() => {
    if (viewportAIInputOpen) return
    const prevIds = prevSelectionRef.current
    const currentIds = new Set(selectedObjectIds)
    const newIds = selectedObjectIds.filter(id => !prevIds.has(id))
    prevSelectionRef.current = currentIds
    if (newIds.length === 0) return
    if (isLoadingRef.current) return
    // Skip pill insertion on double-click (focus action)
    if (useEditorStore.getState().skipPillInsertion) {
      useEditorStore.getState().setSkipPillInsertion(false)
      return
    }
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
  }, [selectedObjectIds, viewportAIInputOpen, gameObjects, segments])
  // Asset pill insertion removed — selecting assets in the panel
  // should not auto-populate the chat input.

  const {
    isListening: isCollapsedVoiceListening,
    transcript: collapsedVoiceTranscript,
    isSupported: isVoiceSupported,
    toggle: toggleCollapsedVoice,
  } = useSpeechRecognition({
    onFinalTranscript: (text) => {
      setCollapsedVoiceAccumulated((prev) => prev + (prev ? ' ' : '') + text)
    },
  })

  useEffect(() => {
    if (isCollapsedVoiceListening) {
      setCollapsedVoiceAccumulated('')
    }
  }, [isCollapsedVoiceListening])

  useEffect(() => {
    if (aiAssistantBodyCollapsed && isCollapsedVoiceListening) {
      const displayText =
        collapsedVoiceAccumulated + (collapsedVoiceTranscript ? (collapsedVoiceAccumulated ? ' ' : '') + collapsedVoiceTranscript : '')
      setSegments([{ type: 'text', text: displayText }])
    }
  }, [aiAssistantBodyCollapsed, isCollapsedVoiceListening, collapsedVoiceAccumulated, collapsedVoiceTranscript])

  // Keyboard shortcuts for plan actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      const plan = usePlanStore.getState().activePlan
      if (!plan || plan.status !== 'pending') return

      if (e.key === 'Enter') {
        e.preventDefault()
        usePlanStore.getState().approvePlan()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        usePlanStore.getState().rejectPlan()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Chat status directly (not including background tasks) — used for auto-expand logic
  const isChatDirectlyLoading = status === 'streaming' || status === 'submitted'
  const isLoading = isChatDirectlyLoading || isBackgroundTaskRunning
  // Ref so pill-insertion effects can read loading state without adding it as a dependency
  const isLoadingRef = useRef(false)
  isLoadingRef.current = isLoading

  // Classification in use-background-task-runner now handles expand/collapse decisions

  const pendingToolCount = visibleMessages
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => m.parts ?? [])
    .filter((part) => {
      if (part.type === 'text') return false
      if ('state' in part) {
        return part.state === 'input-streaming' || part.state === 'input-available'
      }
      return false
    }).length

  // Submit helper: files always go via sendMessage (with parts), text-only depends on mode (Gap 9 + Gap 1)
  const doSubmit = (asBackground: boolean) => {
    const text = pillInputRef.current?.getTextContent()?.trim() ?? ''
    if ((!text && pendingFiles.length === 0) || isLoading) return

    // Check if any collaborator pills are present → route to comments thread
    const collabPills = segments.filter(
      (s) => s.type === 'pill' && s.kind === 'collaborator',
    )
    if (collabPills.length > 0 && pendingFiles.length === 0) {
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
      const dock = useDockingStore.getState()
      if (!dock.widgets['comments']) {
        dock.dockWidget('comments', 'right-top')
      }
      setSegments([])
      if (conversationId) {
        draftsRef.current.delete(conversationId)
      }
      return
    }

    // Clear selection first so pill-insertion effects don't re-populate the input after submit
    useEditorStore.getState().selectObject(null)
    useEditorStore.getState().selectAsset(null)

    if (pendingFiles.length > 0) {
      // Files attached: send directly via sendMessage with parts (background queue only accepts text)
      const parts: Array<{ type: 'text'; text: string } | { type: 'file'; mediaType: string; data: string }> = []
      if (text) parts.push({ type: 'text', text })
      for (const pf of pendingFiles) {
        // Extract base64 data and media type from data URL
        const match = pf.dataUrl.match(/^data:(.*?);base64,(.*)$/)
        if (match) {
          parts.push({ type: 'file', mediaType: match[1], data: match[2] })
        }
      }
      sendMessage({ parts } as Parameters<typeof sendMessage>[0])
      setPendingFiles([])
    } else if (asBackground) {
      // Collapsed mode: route through background task queue for auto-classification
      useBackgroundTaskStore.getState().enqueueTask(text)
    } else {
      // Expanded mode: send directly to conversation (Sonnet, full context)
      sendMessage({ text })
    }

    setSegments([])
    if (conversationId) {
      draftsRef.current.delete(conversationId)
    }
  }

  const hasText = segments.some(s => (s.type === 'text' && s.text.trim()) || s.type === 'pill') || pendingFiles.length > 0

  const compactInputBar = (inExpandedView: boolean) => {
    const handleSubmit = () => doSubmit(!inExpandedView)
    const hasCurrentTask =
      chatbotUIMode === 'dropdown' &&
      activePlan &&
      (activePlan.status === 'pending' || activePlan.status === 'executing' || activePlan.status === 'clarifying')
    const placeholderText = hasCurrentTask ? 'Add a follow-up' : 'Build with Assistant'
    return (
    <div className={`${styles.collapsedInputOnly} ${inExpandedView ? styles.compactInputBarInExpanded : ''}`}>
      <div className={styles.collapsedInputRowBottom}>
        <div className={styles.collapsedInputRowBottomSpacer} aria-hidden />
        <button
          type="button"
          className={styles.paperclipButton}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          aria-label="Attach file"
        >
          <Paperclip size={14} />
        </button>
        {isVoiceSupported && (
          <button
            type="button"
            className={`${styles.collapsedRowIconWrap} ${styles.collapsedRowVoiceButton} ${isCollapsedVoiceListening ? styles.collapsedRowVoiceButtonListening : ''}`}
            onClick={() => {
              if (hasText && !isLoading) {
                handleSubmit()
              } else {
                toggleCollapsedVoice()
              }
            }}
            title={
              hasText
                ? 'Send message'
                : isCollapsedVoiceListening
                  ? 'Stop listening'
                  : 'Voice input'
            }
            aria-label={
              hasText
                ? 'Send message'
                : isCollapsedVoiceListening
                  ? 'Stop listening'
                  : 'Voice input'
            }
          >
            <img
              src={hasText ? '/icons/send.svg' : '/icons/microphone.svg'}
              alt=""
              width={24}
              height={24}
              className={`${styles.collapsedRowIcon} ${styles.collapsedRowIconLarge}`}
              aria-hidden
            />
          </button>
        )}
      </div>
      {/* Hidden file input (Gap 1) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <div className={styles.collapsedInputRowTop}>
        {/* Pending file previews (Gap 1) */}
        {pendingFiles.length > 0 && (
          <div className={styles.pendingFiles}>
            {pendingFiles.map((pf, i) => (
              <div key={i} className={styles.pendingFile}>
                {pf.file.type.startsWith('image/') ? (
                  <img src={pf.dataUrl} alt={pf.file.name} className={styles.pendingFileThumb} />
                ) : (
                  <span className={styles.pendingFileName}>{pf.file.name}</span>
                )}
                <button
                  type="button"
                  className={styles.pendingFileRemove}
                  onClick={() => removePendingFile(i)}
                  aria-label={`Remove ${pf.file.name}`}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.collapsedInputLine}>
          <div className={styles.collapsedInputLineRow}>
            <PillInput
              ref={pillInputRef}
              segments={segments}
              onSegmentsChange={setSegments}
              onSubmit={handleSubmit}
              placeholder={placeholderText}
              disabled={isLoading}
              className={`${styles.input} ${styles.inputCollapsedTextarea}`}
              ariaLabel="Build with Assistant"
              onMentionQuery={setMentionQuery}
            />
            <MentionDropdown
              mention={mentionQuery}
              items={mentionItems}
              pillInputRef={pillInputRef}
              onClose={() => setMentionQuery(null)}
            />
            {!inExpandedView && (
              <button
                type="button"
                className={styles.collapsedExpandButton}
                onClick={() => setAiAssistantBodyCollapsed(false)}
                title="Expand AI Assistant"
                aria-label="Expand AI Assistant"
              >
                <img src="/icons/Expand.svg" alt="" width={14} height={14} />
              </button>
            )}
          </div>
          <div className={styles.collapsedInputLineRow2} />
        </div>
      </div>
    </div>
  )
  }

  return (
    <DockablePanel
      widgetId="ai-assistant"
      title={chatbotUIMode === 'tabs' ? 'Assistant' : 'Tasks'}
      icon={<Bot size={16} />}
      titleTrailing={chatbotUIMode === 'dropdown' || chatbotUIMode === 'queue' ? <TasksDropdown /> : undefined}
      headerMiddle={chatbotUIMode === 'tabs' ? <ConversationSwitcher /> : undefined}
      bodyCollapsed={aiAssistantBodyCollapsed}
      collapsedShowsMinimalContent
      hideHeaderWhenCollapsed
      hideCloseButton
      contentFills
    >
      <div className={`${styles.content} ${aiAssistantBodyCollapsed ? styles.contentCollapsed : ''}`}>
        {aiAssistantBodyCollapsed ? (
          <div className={styles.collapsedDrawerStack}>
            {chatbotUIMode !== 'queue' && <BackgroundTaskDrawer />}
            {compactInputBar(false)}
          </div>
        ) : (
          <>
            <MessageList
              messages={visibleMessages}
              isLoading={isLoading}
              pendingToolCount={pendingToolCount}
            />
            {/* Standalone plan card when the plan isn't visible in any message (e.g. promoted from background task) */}
            {activePlan && (activePlan.status === 'pending' || activePlan.status === 'executing' || activePlan.status === 'clarifying') && !visibleMessages.some((m) =>
              m.parts?.some((p) => {
                const part = p as { type: string; toolCallId?: string }
                return part.type === 'tool-createPlan' && part.toolCallId === activePlan.id
              })
            ) && (
              <div style={{ padding: '0 12px 8px' }}>
                <PlanCard toolData={{
                  toolCallId: activePlan.id,
                  toolName: 'createPlan',
                  state: 'result',
                  input: activePlan.data,
                }} />
              </div>
            )}
            {chatbotUIMode !== 'queue' && <BackgroundTaskDrawer />}
            {compactInputBar(true)}
          </>
        )}
      </div>
    </DockablePanel>
  )
}
