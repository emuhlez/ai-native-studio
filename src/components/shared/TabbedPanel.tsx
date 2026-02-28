import { useState, useRef, useEffect } from 'react'
import { TabHeader, type Tab } from './TabHeader'
import { useDockingStore } from '../../store/dockingStore'
import type { DockZone } from '../../types'
import type { ReactNode } from 'react'
import styles from './TabbedPanel.module.css'

const STICKY_PANEL_MIN_WIDTH = 280
const STICKY_PANEL_MIN_HEIGHT = 160
const STICKY_PANEL_WIDTH = 320

interface TabbedPanelProps {
  tabs: Tab[]
  tabContents: Record<string, ReactNode>
  zone: DockZone
  title?: string
  className?: string
}

export function TabbedPanel({ tabs, tabContents, zone, title, className }: TabbedPanelProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || '')
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [_targetZone, setTargetZone] = useState<DockZone | null>(null)
  const [hoveredZone, setHoveredZone] = useState<DockZone | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dockWidget = useDockingStore((state) => state.dockWidget)
  const setWidgetPosition = useDockingStore((state) => state.setWidgetPosition)
  const setStickyDrag = useDockingStore((state) => state.setStickyDrag)
  const stickyDragOffset = useDockingStore((state) => state.stickyDragOffset)
  const viewportBounds = useDockingStore((state) => state.viewportBounds)
  const widget = useDockingStore((state) => state.widgets[tabs[0]?.id ?? ''])
  const undockWidget = useDockingStore((state) => state.undockWidget)
  const isSticky = zone === 'right-top'

  // Update active tab if current one is removed
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(tabs[0]?.id || '')
    }
  }, [tabs, activeTabId])

  const handleTabClose = (tabId: string) => {
    if (tabs.length <= 1) return // Don't close if it's the last tab
    
    // If closing active tab, switch to another
    if (tabId === activeTabId) {
      const currentIndex = tabs.findIndex(t => t.id === tabId)
      const newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex + 1
      if (tabs[newIndex]) {
        setActiveTabId(tabs[newIndex].id)
      }
    }
    
    // Remove widget from docking store
    undockWidget(tabId)
  }

  useEffect(() => {
    if (!isDragging) {
      document.querySelectorAll('[data-zone]').forEach((el) => {
        el.classList.remove('dragOver')
      })
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
        if (isSticky && viewportBounds && tabs[0]) {
          const vx = e.clientX - viewportBounds.left
          const vy = e.clientY - viewportBounds.top
          const x = stickyDragOffset ? vx - stickyDragOffset.x : vx
          const y = stickyDragOffset ? vy - stickyDragOffset.y : vy
          setStickyDrag(tabs[0].id, { x, y })
          return
        }
        document.querySelectorAll('.emptyColumn').forEach((el) => {
          const column = el as HTMLElement
          if (column.classList.contains('leftColumn') || column.classList.contains('rightColumn')) {
            column.style.width = '200px'
            column.style.minWidth = '200px'
          }
          column.style.overflow = 'visible'
          column.style.display = 'flex'
        })
        const element = document.elementFromPoint(e.clientX, e.clientY)
        if (element) {
          const zoneElement = element.closest('[data-zone]')
          if (zoneElement) {
            const detectedZone = zoneElement.getAttribute('data-zone') as DockZone
            if (detectedZone) {
              setTargetZone(detectedZone)
              document.querySelectorAll('[data-zone]').forEach((el) => el.classList.remove('dragOver'))
              if (detectedZone !== zone) zoneElement.classList.add('dragOver')
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
      document.querySelectorAll('.emptyColumn').forEach((el) => {
        const column = el as HTMLElement
        column.style.width = ''
        column.style.minWidth = ''
        column.style.overflow = ''
      })
      document.querySelectorAll('[data-zone]').forEach((el) => el.classList.remove('dragOver'))

      if (isSticky && viewportBounds) {
        const vx = e.clientX - viewportBounds.left
        const vy = e.clientY - viewportBounds.top
        const x = stickyDragOffset ? vx - stickyDragOffset.x : vx
        const y = stickyDragOffset ? vy - stickyDragOffset.y : vy
        const clampedX = Math.max(0, Math.min(viewportBounds.width - STICKY_PANEL_MIN_WIDTH, x))
        const clampedY = Math.max(0, Math.min(viewportBounds.height - STICKY_PANEL_MIN_HEIGHT, y))
        tabs.forEach((tab) => setWidgetPosition(tab.id, clampedX, clampedY))
      } else if (!isSticky) {
        const dropZone = hoveredZone || (() => {
          const element = document.elementFromPoint(e.clientX, e.clientY)
          const zoneElement = element?.closest('[data-zone]')
          return zoneElement ? (zoneElement.getAttribute('data-zone') as DockZone) : null
        })()
        if (dropZone && dropZone !== zone) {
          tabs.forEach((tab) => dockWidget(tab.id, dropZone))
        }
      }

      setHoveredZone(null)
      document.body.style.cursor = ''
    }
    
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
      document.querySelectorAll('[data-zone]').forEach((el) => {
        el.classList.remove('dragOver')
      })
      document.querySelectorAll('.emptyColumn').forEach((el) => {
        const column = el as HTMLElement
        column.style.width = ''
        column.style.minWidth = ''
        column.style.overflow = ''
      })
      document.body.classList.remove('dragging-widget')
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, zone, tabs, dockWidget, hoveredZone, isSticky, viewportBounds, stickyDragOffset, setWidgetPosition, setStickyDrag, widget?.position])
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    // Don't start drag if clicking on tab or close button
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('.tab')) {
      return
    }
    setIsDragging(true)
    document.body.style.cursor = 'grabbing'
    if (isSticky && viewportBounds && tabs[0]) {
      const panelLeft = widget?.position?.x ?? viewportBounds.width - STICKY_PANEL_WIDTH - 16
      const panelTop = widget?.position?.y ?? 16
      const offsetX = e.clientX - viewportBounds.left - panelLeft
      const offsetY = e.clientY - viewportBounds.top - panelTop
      setStickyDrag(tabs[0].id, { x: panelLeft, y: panelTop }, { x: offsetX, y: offsetY })
    }
    e.preventDefault()
  }

  const activeContent = tabContents[activeTabId]

  return (
    <>
      <div 
        ref={panelRef}
        className={`${styles.tabbedPanel} ${className || ''} ${isDragging && !isSticky ? styles.dragging : ''}`}
      >
        <div className={styles.panelContainer}>
          <div
            ref={headerRef}
            className={`${styles.draggableHeader} ${isDragging && !isSticky ? styles.dragging : ''}`}
            onMouseDown={handleMouseDown}
          >
            <TabHeader
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={setActiveTabId}
              onTabClose={handleTabClose}
              title={title}
            />
          </div>
          <div className={styles.panelContent}>
            {activeContent}
          </div>
        </div>
      </div>
      
      {isDragging && !isSticky && (
        <div
          className={styles.dragPreview}
          style={{ left: dragPosition.x, top: dragPosition.y }}
        >
          <div className={styles.dragPreviewContent}>
            <TabHeader
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={() => {}}
              title={title}
            />
            <div className={styles.dragPreviewBody}>{activeContent}</div>
          </div>
        </div>
      )}
    </>
  )
}

