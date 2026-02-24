import { useRef, useState, useEffect } from 'react'
import { X } from 'lucide-react'
import collapseIcon from '../../../icons/collapse.svg'
import { PanelHeader } from './Panel'
import { useDockingStore } from '../../store/dockingStore'
import { useWidgetMetadataStore } from '../../store/widgetMetadataStore'
import type { DockZone } from '../../types'
import type { ReactNode } from 'react'
import styles from './DockablePanel.module.css'

const STICKY_PANEL_MIN_WIDTH = 280
const STICKY_PANEL_MIN_HEIGHT = 160
const STICKY_PANEL_WIDTH = 320

interface DockablePanelProps {
  widgetId: string
  title: string
  icon?: ReactNode
  children: ReactNode
  actions?: ReactNode
  /** Optional element after the title (e.g. dropdown chevron) */
  titleTrailing?: ReactNode
  className?: string
  /** When true, the close (X) button is not shown (e.g. for viewport) */
  hideCloseButton?: boolean
  /** When true, only the header is shown (body hidden) */
  bodyCollapsed?: boolean
  /** When true and bodyCollapsed, keep content visible so child can show minimal UI (e.g. single input) */
  collapsedShowsMinimalContent?: boolean
  /** When bodyCollapsed, hide the header so only content (e.g. input) remains visible */
  hideHeaderWhenCollapsed?: boolean
  /** When bodyCollapsed, render this in the header row so header and content become one bar */
  collapsedHeaderContent?: ReactNode
  /** When true, content fills the panel (no max-height; use for viewport) */
  contentFills?: boolean
}

export function DockablePanel({
  widgetId,
  title,
  icon,
  children,
  actions,
  titleTrailing,
  className,
  hideCloseButton = false,
  bodyCollapsed = false,
  collapsedShowsMinimalContent = false,
  hideHeaderWhenCollapsed = false,
  collapsedHeaderContent,
  contentFills = false,
}: DockablePanelProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [targetZone, setTargetZone] = useState<DockZone | null>(null)
  const [hoveredZone, setHoveredZone] = useState<DockZone | null>(null)
  const dockWidget = useDockingStore((state) => state.dockWidget)
  const setWidgetPosition = useDockingStore((state) => state.setWidgetPosition)
  const setStickyDrag = useDockingStore((state) => state.setStickyDrag)
  const stickyDragOffset = useDockingStore((state) => state.stickyDragOffset)
  const viewportBounds = useDockingStore((state) => state.viewportBounds)
  const widget = useDockingStore((state) => state.widgets[widgetId])
  const getWidgetsInZone = useDockingStore((state) => state.getWidgetsInZone)
  const centerBottomCollapsed = useDockingStore((state) => state.centerBottomCollapsed)
  const leftCollapsed = useDockingStore((state) => state.leftCollapsed)
  const toggleCenterBottomCollapsed = useDockingStore((state) => state.toggleCenterBottomCollapsed)
  const toggleLeftCollapsed = useDockingStore((state) => state.toggleLeftCollapsed)
  const aiAssistantBodyCollapsed = useDockingStore((state) => state.aiAssistantBodyCollapsed)
  const setAiAssistantBodyCollapsed = useDockingStore((state) => state.setAiAssistantBodyCollapsed)
  const undockWidget = useDockingStore((state) => state.undockWidget)
  const registerWidget = useWidgetMetadataStore((state) => state.registerWidget)
  
  // Register widget metadata
  useEffect(() => {
    registerWidget(widgetId, { title, icon, actions })
  }, [widgetId, title, icon, actions, registerWidget])
  
  // Check if this widget is in a tabbed panel (multiple widgets in zone).
  // Sticky (right-top) widgets are rendered as separate panels, so always show their headers.
  const widgetsInZone = widget ? getWidgetsInZone(widget.zone) : []
  const isInTabbedPanel = widgetsInZone.length > 1 && widget?.zone !== 'right-top'
  const isSticky = widget?.zone === 'right-top'
  
  const handleCollapseClick = () => {
    if (widget?.zone === 'center-bottom') toggleCenterBottomCollapsed()
    else if (widget?.zone === 'left') toggleLeftCollapsed()
    else if (widget?.zone === 'right-top' && widgetId === 'ai-assistant')
      setAiAssistantBodyCollapsed(!aiAssistantBodyCollapsed)
  }

  useEffect(() => {
    if (!isDragging) {
      // Remove any drag over classes when not dragging
      document.querySelectorAll('[data-zone]').forEach((el) => el.classList.remove('dragOver'))
      document.body.classList.remove('dragging-widget')
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
      return
    }
    
    document.body.classList.add('dragging-widget')
    document.body.style.pointerEvents = 'none'
    document.body.style.cursor = 'grabbing'

    let rafId: number | null = null
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setDragPosition({ x: e.clientX, y: e.clientY })
        if (isSticky && viewportBounds) {
          const vx = e.clientX - viewportBounds.left
          const vy = e.clientY - viewportBounds.top
          const x = stickyDragOffset ? vx - stickyDragOffset.x : vx
          const y = stickyDragOffset ? vy - stickyDragOffset.y : vy
          setStickyDrag(widgetId, { x, y })
          return
        }
        // Zone detection for non-sticky panels
        const element = document.elementFromPoint(e.clientX, e.clientY)
        if (element) {
          const zoneElement = element.closest('[data-zone]')
          if (zoneElement) {
            const zone = zoneElement.getAttribute('data-zone') as DockZone
            if (zone) {
              setTargetZone(zone)
              document.querySelectorAll('[data-zone]').forEach((el) => el.classList.remove('dragOver'))
              if (zone !== widget?.zone) zoneElement.classList.add('dragOver')
            } else {
              setTargetZone(null)
              document.querySelectorAll('[data-zone]').forEach((el) => el.classList.remove('dragOver'))
            }
          } else {
            setTargetZone(null)
            document.querySelectorAll('[data-zone]').forEach((el) => el.classList.remove('dragOver'))
          }
        }
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      setTargetZone(null)
      setStickyDrag(null, null)
      document.querySelectorAll('[data-zone]').forEach((el) => el.classList.remove('dragOver'))

      if (isSticky && viewportBounds) {
        const vx = e.clientX - viewportBounds.left
        const vy = e.clientY - viewportBounds.top
        const x = stickyDragOffset ? vx - stickyDragOffset.x : vx
        const y = stickyDragOffset ? vy - stickyDragOffset.y : vy
        const clampedX = Math.max(0, Math.min(viewportBounds.width - STICKY_PANEL_MIN_WIDTH, x))
        const clampedY = Math.max(0, Math.min(viewportBounds.height - STICKY_PANEL_MIN_HEIGHT, y))
        setWidgetPosition(widgetId, clampedX, clampedY)
      } else if (!isSticky) {
        const dropZone = hoveredZone || (() => {
          const element = document.elementFromPoint(e.clientX, e.clientY)
          const zoneElement = element?.closest('[data-zone]')
          if (zoneElement) {
            const zone = zoneElement.getAttribute('data-zone') as DockZone
            if (zone && getWidgetsInZone(zone).length > 0) return zone
          }
          return null
        })()
        if (dropZone && dropZone !== widget?.zone) dockWidget(widgetId, dropZone)
      }

      setHoveredZone(null)
      document.body.style.cursor = ''
    }
    
    // Prevent all interactions during drag
    const preventInteraction = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('click', preventInteraction, true)
    document.addEventListener('mousedown', preventInteraction, true)
    document.addEventListener('contextmenu', preventInteraction, true)
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('click', preventInteraction, true)
      document.removeEventListener('mousedown', preventInteraction, true)
      document.removeEventListener('contextmenu', preventInteraction, true)
      // Clean up any remaining drag over classes
      document.querySelectorAll('[data-zone]').forEach((el) => {
        el.classList.remove('dragOver')
      })
      // Remove drag mode styles
      document.body.classList.remove('dragging-widget')
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, widgetId, widget?.zone, dockWidget, hoveredZone, isSticky, viewportBounds, stickyDragOffset, setWidgetPosition, setStickyDrag, getWidgetsInZone])
  
  const isCenterBottomCollapsed = widget?.zone === 'center-bottom' && centerBottomCollapsed
  const isLeftCollapsed = widget?.zone === 'left' && leftCollapsed
  const isCollapsed = isCenterBottomCollapsed || isLeftCollapsed
  const showCollapseButton =
    (widget?.zone === 'center-bottom' && !centerBottomCollapsed) ||
    (widget?.zone === 'left' && !leftCollapsed) ||
    (widget?.zone === 'right-top' && widgetId === 'ai-assistant')
  const isAiAssistantCollapsed = widgetId === 'ai-assistant' && aiAssistantBodyCollapsed

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button
    if (isInTabbedPanel) return // Don't drag if in tabbed panel (TabbedPanel handles it)

    const target = e.target as HTMLElement
    const isCornerDragHandle = target.closest(`.${styles.cornerDragHandle}`) !== null

    // When panel is collapsed, normal header click expands — but corner drag handle always starts drag
    if (isCollapsed && !isCornerDragHandle) {
      handleCollapseClick()
      return
    }

    // Don't start drag if clicking on interactive elements (except corner handles)
    if (!isCornerDragHandle) {
      const isInteractive = target.closest('button, input, a, [role="button"]') !== null
      if (isInteractive) return
    }

    setIsDragging(true)
    document.body.style.cursor = 'grabbing'
    if (isSticky && viewportBounds && panelRef.current) {
      // Use the panel's actual DOM position so it doesn't jump (handles left/bottom, top/right defaults)
      const rect = panelRef.current.getBoundingClientRect()
      const panelLeft = rect.left - viewportBounds.left
      const panelTop = rect.top - viewportBounds.top
      const offsetX = e.clientX - rect.left
      const offsetY = e.clientY - rect.top
      setStickyDrag(widgetId, { x: panelLeft, y: panelTop }, { x: offsetX, y: offsetY })
    }
    e.preventDefault()
    e.stopPropagation()
  }
  
  if (!widget) {
    // Widget not in store yet, but still render so it can be initialized
    return (
      <div className={`${styles.dockablePanel} ${className || ''}`}>
        {!isInTabbedPanel && (
          <div className={styles.draggableHeader}>
            <PanelHeader title={title} icon={icon} titleTrailing={titleTrailing} actions={actions} />
          </div>
        )}
        <div className={`${styles.panelContent} ${bodyCollapsed && (!collapsedShowsMinimalContent || collapsedHeaderContent) ? styles.panelContentCollapsed : ''} ${bodyCollapsed && collapsedShowsMinimalContent ? styles.panelContentMinimal : ''} ${bodyCollapsed && collapsedShowsMinimalContent ? styles.panelContentMinimalHeight : ''} ${contentFills && !(bodyCollapsed && collapsedShowsMinimalContent) ? styles.panelContentFills : ''}`}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <>
      <div 
        ref={panelRef}
        className={`${styles.dockablePanel} ${className || ''} ${isDragging && !isSticky ? styles.dragging : ''} ${isInTabbedPanel ? styles.inTabbedPanel : ''} ${isCollapsed ? styles.collapsedAsTab : ''} ${bodyCollapsed && hideHeaderWhenCollapsed ? styles.dockablePanelCornerDrag : ''}`}
      >
        {!isInTabbedPanel && (
          <div
            ref={headerRef}
            className={`${styles.draggableHeader} ${isDragging && !isSticky ? styles.dragging : ''} ${isCollapsed && !collapsedHeaderContent ? styles.collapsedHeader : ''} ${isCollapsed && collapsedHeaderContent ? styles.headerWithInlineContent : ''} ${bodyCollapsed && hideHeaderWhenCollapsed ? styles.headerCollapsedToBar : ''}`}
            onMouseDown={handleMouseDown}
          >
            <PanelHeader
              title={title}
              icon={icon}
              titleTrailing={titleTrailing}
              middle={bodyCollapsed ? collapsedHeaderContent : undefined}
              actions={
                <>
                  {showCollapseButton && (
                    <button
                      type="button"
                      className={styles.collapseButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCollapseClick()
                      }}
                      aria-label={isAiAssistantCollapsed ? 'Expand panel' : 'Collapse panel'}
                    >
                      <img
                        src={collapseIcon}
                        alt=""
                        width={16}
                        height={16}
                        className={isAiAssistantCollapsed ? styles.collapseIconExpand : undefined}
                        aria-hidden
                      />
                    </button>
                  )}
                  {actions}
                  {!hideCloseButton && (
                    <button
                      type="button"
                      className={styles.collapseButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        undockWidget(widgetId)
                      }}
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  )}
                </>
              }
            />
          </div>
        )}
        <div className={`${styles.panelContent} ${bodyCollapsed && (!collapsedShowsMinimalContent || collapsedHeaderContent) ? styles.panelContentCollapsed : ''} ${bodyCollapsed && collapsedShowsMinimalContent ? styles.panelContentMinimal : ''} ${bodyCollapsed && collapsedShowsMinimalContent ? styles.panelContentMinimalHeight : ''} ${contentFills && !(bodyCollapsed && collapsedShowsMinimalContent) ? styles.panelContentFills : ''}`}>
          {children}
        </div>
        {bodyCollapsed && hideHeaderWhenCollapsed && (
          <>
            <div
              className={styles.cornerDragHandle}
              data-corner="top-left"
              onMouseDown={handleMouseDown}
              title="Drag to move"
              aria-label="Drag panel"
            />
            <div
              className={styles.cornerDragHandle}
              data-corner="top-right"
              onMouseDown={handleMouseDown}
              title="Drag to move"
              aria-label="Drag panel"
            />
            <div
              className={styles.cornerDragHandle}
              data-corner="bottom-left"
              onMouseDown={handleMouseDown}
              title="Drag to move"
              aria-label="Drag panel"
            />
            <div
              className={styles.cornerDragHandle}
              data-corner="bottom-right"
              onMouseDown={handleMouseDown}
              title="Drag to move"
              aria-label="Drag panel"
            />
          </>
        )}
      </div>
      
      {isDragging && !isSticky && (
        <div
          className={styles.dragPreview}
          style={{ left: dragPosition.x, top: dragPosition.y }}
        >
          <div className={styles.dragPreviewContent}>
            <PanelHeader title={title} icon={icon} titleTrailing={titleTrailing} actions={actions} />
            <div className={styles.dragPreviewBody}>{children}</div>
          </div>
        </div>
      )}
    </>
  )
}

