import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { ChevronDown, Loader2, Plus } from 'lucide-react'
import { useConversationStore } from '../../store/conversationStore'
import { usePlanStore } from '../../store/planStore'
import { useAgentChat } from '../../ai/use-agent-chat'
import { useDockingStore } from '../../store/dockingStore'
import styles from './AIAssistant.module.css'

export function TasksDropdown() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const conversations = useConversationStore((s) => s.listConversations())
  const activeId = useConversationStore((s) => s.activeConversationId)
  const switchConversation = useConversationStore((s) => s.switchConversation)
  const createConversation = useConversationStore((s) => s.createConversation)
  const { status: chatStatus } = useAgentChat()
  const activePlan = usePlanStore((s) => s.activePlan)
  const streamingIds = useConversationStore((s) => s.streamingIds)
  const statusOption = useDockingStore((s) => s.dropdownTaskListStatusOption)

  const isChatLoading = chatStatus === 'streaming' || chatStatus === 'submitted'
  const isPlanPendingApproval = activePlan?.status === 'pending'

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) {
      setPosition(null)
      return
    }
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const menuEl = menuRef.current
    const pad = 8
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Align dropdown to the left edge of the panel header (not the trigger)
    const headerEl = triggerRef.current.closest('[class*="draggableHeader"]')
    const leftEdge = headerEl
      ? (headerEl.getBoundingClientRect().left)
      : triggerRect.left

    let left = leftEdge
    let top = triggerRect.bottom + 2

    // Clamp to viewport
    if (left + (menuEl.offsetWidth || 200) > vw - pad) left = vw - pad - (menuEl.offsetWidth || 200)
    if (left < pad) left = pad
    if (top + (menuEl.offsetHeight || 200) > vh - pad) top = triggerRect.top - (menuEl.offsetHeight || 0) - 2
    if (top < pad) top = pad

    setPosition({ top, left })
  }, [open, conversations.length])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (id: string) => {
    switchConversation(id)
    setOpen(false)
  }

  const handleNewChat = () => {
    createConversation()
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.tasksDropdownTrigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Tasks dropdown"
        title="Switch task"
      >
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          ref={menuRef}
          className={styles.tasksDropdownMenu}
          role="listbox"
          style={{
            position: 'fixed',
            ...(position
              ? { top: position.top, left: position.left }
              : { left: -9999, top: 0, visibility: 'hidden' as const }),
          }}
        >
          <div className={styles.tasksDropdownList}>
          {conversations.length === 0 ? (
            <div className={styles.tasksDropdownEmpty}>No conversations yet</div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeId
              const showSpinner = isActive && isChatLoading
              const isStreamingInBackground = !isActive && streamingIds.has(conv.id)
              const showYellowDot = (isActive && isPlanPendingApproval && !showSpinner) || isStreamingInBackground
              const showBlueDot = !showSpinner && !showYellowDot
              const statusText =
                statusOption === 'status'
                  ? showSpinner
                    ? 'Loading'
                    : null
                  : null
              const showPendingIcon = statusOption === 'status' && showYellowDot
              const showDoneIcon = statusOption === 'status' && !showSpinner && !showYellowDot
              return (
                <button
                  key={conv.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={styles.tasksDropdownItem}
                  onClick={() => handleSelect(conv.id)}
                >
                  <span className={styles.tasksDropdownItemLabel}>{conv.title}</span>
                  {(statusOption === 'color' || statusOption === 'status') && (
                    <span className={styles.tasksDropdownItemStatus} aria-hidden>
                      {statusOption === 'color' && showSpinner && (
                        <Loader2 size={10} className={styles.tasksDropdownItemSpinner} />
                      )}
                      {statusOption === 'color' && showYellowDot && (
                        <span className={styles.tasksDropdownDotPending} />
                      )}
                      {statusOption === 'color' && showBlueDot && (
                        <span className={styles.tasksDropdownDotDone} />
                      )}
                      {statusOption === 'status' && statusText && (
                        <span className={styles.tasksDropdownItemStatusText}>{statusText}</span>
                      )}
                      {showPendingIcon && (
                        <img
                          src="/prompts/awaiting-approval.svg"
                          alt="Awaiting approval"
                          className={styles.tasksDropdownItemPendingIcon}
                          height={14}
                        />
                      )}
                      {showDoneIcon && (
                        <img
                          src="/prompts/completed.svg"
                          alt="Done"
                          className={styles.tasksDropdownItemDoneIcon}
                          width={14}
                          height={14}
                        />
                      )}
                    </span>
                  )}
                </button>
              )
            })
          )}
          </div>
          <button
            type="button"
            className={styles.tasksDropdownNewChat}
            onClick={handleNewChat}
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>
      )}
    </>
  )
}
