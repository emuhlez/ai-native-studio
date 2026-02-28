import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { stripLeadingBrackets } from '../../ai/strip-brackets'
import { useConversationStore } from '../../store/conversationStore'
import styles from './AIAssistant.module.css'

export function TasksDropdown() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [conversations, setConversations] = useState(() =>
    useConversationStore.getState().listConversations()
  )
  const [activeId, setActiveId] = useState(() =>
    useConversationStore.getState().activeConversationId
  )

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  // Subscribe to conversation store changes without using the React hook API
  useEffect(() => {
    const unsubscribe = useConversationStore.subscribe((state) => {
      setConversations(state.listConversations())
      setActiveId(state.activeConversationId)
    })
    return unsubscribe
  }, [])

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
    useConversationStore.getState().switchConversation(id)
    setOpen(false)
  }

  const handleNewChat = () => {
    useConversationStore.getState().createConversation()
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
              return (
                <button
                  key={conv.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={styles.tasksDropdownItem}
                  onClick={() => handleSelect(conv.id)}
                >
                  <div className={styles.tasksDropdownItemContent}>
                    <span className={styles.tasksDropdownItemLabel}>{stripLeadingBrackets(conv.title)}</span>
                    {conv.summary && (
                      <span className={styles.tasksDropdownItemSummary}>{conv.summary}</span>
                    )}
                  </div>
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
