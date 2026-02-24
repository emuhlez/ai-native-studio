import { useState, useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
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
import { PillInput } from '../shared/PillInput'
import type { InputSegment, PillInputHandle } from '../../types'
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
  const { messages, sendMessage, status } = useAgentChat()
  const { isRunning: isBackgroundTaskRunning } = useBackgroundTaskRunner()
  const hiddenMessageIds = useBackgroundTaskStore((s) => s.hiddenMessageIds)
  const visibleMessages = messages.filter((m) => !hiddenMessageIds.has(m.id))
  usePlanExecutor({ sendMessage, status })
  const [segments, setSegments] = useState<InputSegment[]>([])
  const [collapsedVoiceAccumulated, setCollapsedVoiceAccumulated] = useState('')
  const pillInputRef = useRef<PillInputHandle>(null)

  // Per-conversation input drafts — save/restore when switching tabs
  const activeConversationId = useConversationStore((s) => s.activeConversationId)
  const draftsRef = useRef<Map<string, InputSegment[]>>(new Map())
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments
  const prevConversationIdRef = useRef(activeConversationId)

  useEffect(() => {
    const prevId = prevConversationIdRef.current
    if (prevId && prevId !== activeConversationId) {
      // Save current input as draft for the conversation we're leaving
      draftsRef.current.set(prevId, segmentsRef.current)
      // Restore draft for the conversation we're entering (or start empty)
      const draft = activeConversationId ? draftsRef.current.get(activeConversationId) ?? [] : []
      setSegments(draft)
    }
    prevConversationIdRef.current = activeConversationId
  }, [activeConversationId])

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
    // Skip pill insertion while a task is running — only insert from user-initiated selections
    if (isLoadingRef.current) return
    const newPills = newIds
      .map(id => ({ id, label: gameObjects[id]?.name ?? id }))
      .filter(p => p.label)
    if (newPills.length > 0) {
      pillInputRef.current?.insertPillsAtCursor(newPills)
    }
  }, [selectedObjectIds, viewportAIInputOpen, gameObjects])
  useEffect(() => {
    if (viewportAIInputOpen) return
    const prevIds = prevAssetSelectionRef.current
    const currentIds = new Set(selectedAssetIds)
    const newIds = selectedAssetIds.filter(id => !prevIds.has(id))
    prevAssetSelectionRef.current = currentIds
    if (newIds.length === 0) return
    // Skip pill insertion while a task is running — only insert from user-initiated selections
    if (isLoadingRef.current) return
    const newPills = newIds
      .map(id => assetByIdRef.current.get(id))
      .filter((p): p is { id: string; name: string } => p != null && p.name != null)
      .map(p => ({ id: p.id, label: p.name }))
    if (newPills.length > 0) {
      pillInputRef.current?.insertPillsAtCursor(newPills)
    }
  }, [selectedAssetIds, viewportAIInputOpen, assets])

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

  const onCollapsedSubmit = () => {
    const text = pillInputRef.current?.getTextContent()?.trim() ?? ''
    if (text && !isLoading) {
      // Clear selection first so pill-insertion effects don't re-populate the input after submit
      useEditorStore.getState().selectObject(null)
      useEditorStore.getState().selectAsset(null)
      // Route through background task queue for auto-classification
      useBackgroundTaskStore.getState().enqueueTask(text)
      setSegments([])
      // Clear the draft for this conversation since we submitted
      if (activeConversationId) {
        draftsRef.current.delete(activeConversationId)
      }
    }
  }

  const onExpandedSubmit = () => {
    const text = pillInputRef.current?.getTextContent()?.trim() ?? ''
    if (text && !isLoading) {
      const hasSelection = useEditorStore.getState().selectedObjectIds.length > 0

      if (hasSelection) {
        // Contextual command with selected objects → route through task queue
        // so it stays isolated from the conversation (drawer or promoted to its own tab)
        useBackgroundTaskStore.getState().enqueueTask(text)
      } else {
        // No selection → direct conversation message in the active tab
        sendMessage({ text })
      }

      // Clear selection first so pill-insertion effects don't re-populate the input after submit
      useEditorStore.getState().selectObject(null)
      useEditorStore.getState().selectAsset(null)
      setSegments([])
      if (activeConversationId) {
        draftsRef.current.delete(activeConversationId)
      }
    }
  }

  const hasText = segments.some(s => (s.type === 'text' && s.text.trim()) || s.type === 'pill')

  const compactInputBar = (inExpandedView: boolean) => {
    const handleSubmit = inExpandedView ? onExpandedSubmit : onCollapsedSubmit
    return (
    <div className={`${styles.collapsedInputOnly} ${inExpandedView ? styles.compactInputBarInExpanded : ''}`}>
      <div className={styles.collapsedInputRowBottom}>
        <div className={styles.collapsedRowIconWrap}>
          <img src="/icons/Add.svg" alt="" width={24} height={24} className={`${styles.collapsedRowIcon} ${styles.collapsedRowIconLarge}`} aria-hidden />
        </div>
        <div className={styles.collapsedRowIconWrap}>
          <img src="/icons/filters-ai.svg" alt="" width={16} height={16} className={`${styles.collapsedRowIcon} ${styles.collapsedRowIconSmall}`} aria-hidden />
        </div>
        <div className={styles.collapsedInputRowBottomSpacer} aria-hidden />
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
      <div className={styles.collapsedInputRowTop}>
        <div className={styles.collapsedInputLine}>
          <div className={styles.collapsedInputLineRow}>
            <PillInput
              ref={pillInputRef}
              segments={segments}
              onSegmentsChange={setSegments}
              onSubmit={handleSubmit}
              placeholder={isLoading ? 'Generating...' : 'Build with Assistant'}
              disabled={isLoading}
              className={`${styles.input} ${styles.inputCollapsedTextarea}`}
              ariaLabel="Build with Assistant"
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
      titleTrailing={chatbotUIMode === 'dropdown' ? <TasksDropdown /> : undefined}
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
            <BackgroundTaskDrawer />
            {compactInputBar(false)}
          </div>
        ) : (
          <>
            <MessageList
              messages={visibleMessages}
              isLoading={isLoading}
              pendingToolCount={pendingToolCount}
            />
            <BackgroundTaskDrawer />
            {compactInputBar(true)}
          </>
        )}
      </div>
    </DockablePanel>
  )
}
