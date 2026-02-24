import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, X, ChevronDown, MessageSquare, Pencil, Palette, Image, Loader2 } from 'lucide-react'
import { useConversationStore } from '../../store/conversationStore'
import { usePlanStore } from '../../store/planStore'
import { useAgentChat } from '../../ai/use-agent-chat'
import { listTemplates } from '../../ai/prompt-templates'
import styles from './AIAssistant.module.css'

interface ConversationSwitcherProps {
  onSwitch?: () => void
}

const TEMPLATE_ICONS: Record<string, typeof MessageSquare> = {
  'scene-building': Pencil,
  'material-editing': Palette,
  'sketch-interpretation': Image,
}

export function ConversationSwitcher({ onSwitch }: ConversationSwitcherProps) {
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const conversations = useConversationStore((s) => s.listConversations())
  const activeId = useConversationStore((s) => s.activeConversationId)
  const switchConversation = useConversationStore((s) => s.switchConversation)
  const createConversation = useConversationStore((s) => s.createConversation)
  const deleteConversation = useConversationStore((s) => s.deleteConversation)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const renameConversation = useConversationStore((s) => s.renameConversation)
  const templates = listTemplates()
  const { status: chatStatus } = useAgentChat()
  const activePlan = usePlanStore((s) => s.activePlan)

  const isChatLoading = chatStatus === 'streaming' || chatStatus === 'submitted'
  const isPlanPendingApproval = activePlan?.status === 'pending'

  // Custom 0.5px scroll indicator
  const tabListRef = useRef<HTMLDivElement>(null)
  const [scrollThumb, setScrollThumb] = useState<{ left: string; width: string } | null>(null)

  const updateScrollThumb = useCallback(() => {
    const el = tabListRef.current
    if (!el) return
    const { scrollWidth, clientWidth, scrollLeft } = el
    if (scrollWidth <= clientWidth) {
      setScrollThumb(null)
      return
    }
    const ratio = clientWidth / scrollWidth
    const thumbWidth = ratio * 100
    const thumbLeft = (scrollLeft / scrollWidth) * 100
    setScrollThumb({ left: `${thumbLeft}%`, width: `${thumbWidth}%` })
  }, [])

  useEffect(() => {
    const el = tabListRef.current
    if (!el) return
    updateScrollThumb()
    el.addEventListener('scroll', updateScrollThumb, { passive: true })
    const ro = new ResizeObserver(updateScrollThumb)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollThumb)
      ro.disconnect()
    }
  }, [updateScrollThumb, conversations.length])

  const handleNew = (templateId?: string) => {
    const template = templates.find((t) => t.id === templateId)
    createConversation(template?.name || undefined)
    setNewMenuOpen(false)
    onSwitch?.()
  }

  const handleSwitch = (id: string) => {
    switchConversation(id)
    onSwitch?.()
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteConversation(id)
  }

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation()
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleFinishRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim())
    }
    setEditingId(null)
    setEditTitle('')
  }

  return (
    <div className={styles.conversationSwitcher}>
      <div className={styles.tabListWrap}>
      <div className={styles.tabList} role="tablist" ref={tabListRef}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            role="tab"
            aria-selected={conv.id === activeId}
            className={`${styles.tab} ${conv.id === activeId ? styles.tabActive : ''}`}
          >
            <button
              type="button"
              className={styles.tabButton}
              onClick={() => handleSwitch(conv.id)}
              title={conv.title}
            >
              {(() => {
                const isActive = conv.id === activeId
                const showSpinner = isActive && isChatLoading
                const showYellowDot = isActive && isPlanPendingApproval && !showSpinner
                const showBlueDot = !showSpinner && !showYellowDot
                return (
                  <>
                    {editingId === conv.id ? (
                <input
                  className={styles.tabRenameInput}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  className={styles.tabLabel}
                  onDoubleClick={(e) => handleStartRename(e, conv.id, conv.title)}
                >
                  {conv.title}
                </span>
              )}
                    <span className={styles.tabStatusIndicator} aria-hidden>
                      {showSpinner && (
                        <Loader2 size={10} className={styles.tabStatusSpinner} />
                      )}
                      {showYellowDot && (
                        <span className={styles.tabStatusDotPending} />
                      )}
                      {showBlueDot && (
                        <span className={styles.tabStatusDotDone} />
                      )}
                    </span>
                  </>
                )
              })()}
            </button>
            {conv.id !== activeId && (
              <button
                type="button"
                className={styles.tabClose}
                onClick={(e) => handleDelete(e, conv.id)}
                title="Close"
                aria-label={`Close ${conv.title}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {scrollThumb && (
        <div className={styles.tabScrollTrack}>
          <div
            className={styles.tabScrollThumb}
            style={{ left: scrollThumb.left, width: scrollThumb.width }}
          />
        </div>
      )}
      </div>
      <div className={styles.tabActions}>
        <div className={styles.tabNewWrap}>
          <button
            type="button"
            className={styles.tabNew}
            onClick={() => setNewMenuOpen(!newMenuOpen)}
            title="New chat"
            aria-expanded={newMenuOpen}
          >
            <Plus size={14} />
            <ChevronDown size={10} className={newMenuOpen ? styles.chevronOpen : ''} />
          </button>
          {newMenuOpen && (
            <>
              <div
                className={styles.tabNewBackdrop}
                onClick={() => setNewMenuOpen(false)}
                aria-hidden
              />
              <div className={styles.tabNewMenu}>
                {/* Maintain: New Chat (blank) + template items from prompt-templates */}
                <button
                  type="button"
                  className={styles.tabNewMenuItem}
                  onClick={() => handleNew()}
                >
                  <MessageSquare size={12} />
                  New Chat
                </button>
                {templates.map((t) => {
                  const Icon = TEMPLATE_ICONS[t.id] || MessageSquare
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.tabNewMenuItem}
                      onClick={() => handleNew(t.id)}
                    >
                      <Icon size={12} />
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
