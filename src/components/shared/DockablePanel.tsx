import { useRef, useState, useEffect } from 'react'
import { PanelHeader } from './Panel'
import { useDockingStore } from '../../store/dockingStore'
import { useWidgetMetadataStore } from '../../store/widgetMetadataStore'
import { DockingIndicator } from './DockingIndicator'
import type { DockZone } from '../../types'
import type { ReactNode } from 'react'
import styles from './DockablePanel.module.css'

interface DockablePanelProps {
  widgetId: string
  title: string
  icon?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function DockablePanel({
  widgetId,
  title,
  icon,
  children,
  actions,
  className,
}: DockablePanelProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [targetZone, setTargetZone] = useState<DockZone | null>(null)
  const [hoveredZone, setHoveredZone] = useState<DockZone | null>(null)
  const dockWidget = useDockingStore((state) => state.dockWidget)
  const widget = useDockingStore((state) => state.widgets[widgetId])
  const getWidgetsInZone = useDockingStore((state) => state.getWidgetsInZone)
  const registerWidget = useWidgetMetadataStore((state) => state.registerWidget)
  
  // Register widget metadata
  useEffect(() => {
    registerWidget(widgetId, { title, icon, actions })
  }, [widgetId, title, icon, actions, registerWidget])
  
  // Check if this widget is in a tabbed panel (multiple widgets in zone)
  const widgetsInZone = widget ? getWidgetsInZone(widget.zone) : []
  const isInTabbedPanel = widgetsInZone.length > 1
  
  useEffect(() => {
    if (!isDragging) {
      // Remove any drag over classes when not dragging
      document.querySelectorAll('[data-zone]').forEach((el) => {
        el.classList.remove('dragOver')
      })
      // Remove drag mode styles
      document.body.classList.remove('dragging-widget')
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
      return
    }
    
    // Add class to body to disable interactions during drag
    document.body.classList.add('dragging-widget')
    document.body.style.pointerEvents = 'none'
    document.body.style.cursor = 'grabbing'
    
    // Re-enable pointer events for docking indicator
    const enableIndicator = () => {
      const indicator = document.querySelector('.dockingIndicator')
      if (indicator) {
        ;(indicator as HTMLElement).style.pointerEvents = 'auto'
      }
    }
    
    // Check for indicator after a brief delay to ensure it's rendered
    setTimeout(enableIndicator, 0)
    const indicatorCheck = setInterval(enableIndicator, 50)
    
    // Store interval ID for cleanup
    let indicatorCheckInterval: number | undefined = indicatorCheck
    
    let rafId: number | null = null
    const handleMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame to smooth position updates
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      
      rafId = requestAnimationFrame(() => {
        setDragPosition({ x: e.clientX, y: e.clientY })
      
      // Show empty columns during drag
      document.querySelectorAll('.emptyColumn').forEach((el) => {
        const column = el as HTMLElement
        if (column.classList.contains('leftColumn') || column.classList.contains('rightColumn')) {
          column.style.width = '200px'
          column.style.minWidth = '200px'
        }
        column.style.overflow = 'visible'
        column.style.display = 'flex'
      })
      
      // Find which zone we're over
      const element = document.elementFromPoint(e.clientX, e.clientY)
      if (element) {
        const zoneElement = element.closest('[data-zone]')
        if (zoneElement) {
          const zone = zoneElement.getAttribute('data-zone') as DockZone
          if (zone) {
            // Show indicator for any zone, even if it's the current one (for visual feedback)
            setTargetZone(zone)
            // Remove drag over from all zones first
            document.querySelectorAll('[data-zone]').forEach((el) => {
              el.classList.remove('dragOver')
            })
            // Only add visual feedback if it's a different zone
            if (zone !== widget?.zone) {
              zoneElement.classList.add('dragOver')
            }
          } else {
            setTargetZone(null)
            // Remove visual feedback from all zones
            document.querySelectorAll('[data-zone]').forEach((el) => {
              el.classList.remove('dragOver')
            })
          }
        } else {
          // Check if we're over an empty column area
          const leftColumn = document.querySelector('.leftColumn')
          const rightColumn = document.querySelector('.rightColumn')
          const centerColumn = document.querySelector('.centerColumn')
          
          if (leftColumn) {
            const leftRect = leftColumn.getBoundingClientRect()
            if (e.clientX >= leftRect.left && e.clientX <= leftRect.right) {
              setTargetZone('left')
            }
          }
          if (rightColumn) {
            const rightRect = rightColumn.getBoundingClientRect()
            if (e.clientX >= rightRect.left && e.clientX <= rightRect.right) {
              const rightMid = rightRect.top + rightRect.height / 2
              setTargetZone(e.clientY < rightMid ? 'right-top' : 'right-bottom')
            }
          }
          if (centerColumn) {
            const centerRect = centerColumn.getBoundingClientRect()
            if (e.clientX >= centerRect.left && e.clientX <= centerRect.right) {
              const centerTop = centerRect.top + (centerRect.height * 0.4)
              if (e.clientY < centerTop) {
                setTargetZone('center-top')
              } else {
                setTargetZone('center-bottom')
              }
            }
          }
          
          if (!leftColumn && !rightColumn && !centerColumn) {
            setTargetZone(null)
          }
          
          // Remove visual feedback from all zones
          document.querySelectorAll('[data-zone]').forEach((el) => {
            el.classList.remove('dragOver')
          })
        }
      }
      })
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      setTargetZone(null)
      
      // Hide empty columns again
      document.querySelectorAll('.emptyColumn').forEach((el) => {
        const column = el as HTMLElement
        column.style.width = ''
        column.style.minWidth = ''
        column.style.overflow = ''
      })
      
      // Remove visual feedback from all zones
      document.querySelectorAll('[data-zone]').forEach((el) => {
        el.classList.remove('dragOver')
      })
      
      // Find drop zone - prefer hovered zone from indicator, otherwise check element
      const dropZone = hoveredZone || (() => {
        const element = document.elementFromPoint(e.clientX, e.clientY)
        if (element) {
          const zoneElement = element.closest('[data-zone]')
          if (zoneElement) {
            return zoneElement.getAttribute('data-zone') as DockZone
          }
        }
        return null
      })()
      
      if (dropZone && dropZone !== widget?.zone) {
        dockWidget(widgetId, dropZone)
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
      // Hide empty columns
      document.querySelectorAll('.emptyColumn').forEach((el) => {
        const column = el as HTMLElement
        column.style.width = ''
        column.style.minWidth = ''
        column.style.overflow = ''
      })
      // Remove drag mode styles
      document.body.classList.remove('dragging-widget')
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
      if (indicatorCheckInterval !== undefined) {
        clearInterval(indicatorCheckInterval)
      }
    }
  }, [isDragging, widgetId, widget?.zone, dockWidget, hoveredZone])
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button
    if (isInTabbedPanel) return // Don't drag if in tabbed panel (TabbedPanel handles it)
    
    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement
    const isInteractive = target.closest('button, input, a, [role="button"]') !== null
    if (isInteractive) return
    
    setIsDragging(true)
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
    e.stopPropagation()
  }
  
  if (!widget) {
    // Widget not in store yet, but still render so it can be initialized
    return (
      <div className={`${styles.dockablePanel} ${className || ''}`}>
        {!isInTabbedPanel && (
          <div className={styles.draggableHeader}>
            <PanelHeader title={title} icon={icon} actions={actions} />
          </div>
        )}
        <div className={styles.panelContent}>
          {children}
        </div>
      </div>
    )
  }
  
  return (
    <>
      <div 
        ref={panelRef}
        className={`${styles.dockablePanel} ${className || ''} ${isDragging ? styles.dragging : ''} ${isInTabbedPanel ? styles.inTabbedPanel : ''}`}
      >
        {!isInTabbedPanel && (
          <div
            ref={headerRef}
            className={`${styles.draggableHeader} ${isDragging ? styles.dragging : ''}`}
            onMouseDown={handleMouseDown}
          >
            <PanelHeader title={title} icon={icon} actions={actions} />
          </div>
        )}
        <div className={styles.panelContent}>
          {children}
        </div>
      </div>
      
      {isDragging && (
        <>
          <div
            className={styles.dragPreview}
            style={{
              left: dragPosition.x,
              top: dragPosition.y,
            }}
          >
            <div className={styles.dragPreviewContent}>
              <PanelHeader title={title} icon={icon} actions={actions} />
              <div className={styles.dragPreviewBody}>
                {children}
              </div>
            </div>
          </div>
          {targetZone && (
            <DockingIndicator
              targetZone={targetZone}
              hoveredZone={hoveredZone}
              onZoneHover={setHoveredZone}
              isVisible={true}
            />
          )}
        </>
      )}
    </>
  )
}

