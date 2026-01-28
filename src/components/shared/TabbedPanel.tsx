import { useState, useRef, useEffect } from 'react'
import { TabHeader, type Tab } from './TabHeader'
import { useDockingStore } from '../../store/dockingStore'
import { DockingIndicator } from './DockingIndicator'
import type { DockZone } from '../../types'
import type { ReactNode } from 'react'
import styles from './TabbedPanel.module.css'

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
  const [targetZone, setTargetZone] = useState<DockZone | null>(null)
  const [hoveredZone, setHoveredZone] = useState<DockZone | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dockWidget = useDockingStore((state) => state.dockWidget)
  const undockWidget = useDockingStore((state) => state.undockWidget)

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
    
    const enableIndicator = () => {
      const indicator = document.querySelector('.dockingIndicator')
      if (indicator) {
        ;(indicator as HTMLElement).style.pointerEvents = 'auto'
      }
    }
    
    setTimeout(enableIndicator, 0)
    const indicatorCheck = setInterval(enableIndicator, 50)
    let indicatorCheckInterval: number | undefined = indicatorCheck
    
    let rafId: number | null = null
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      
      rafId = requestAnimationFrame(() => {
        setDragPosition({ x: e.clientX, y: e.clientY })
      
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
              document.querySelectorAll('[data-zone]').forEach((el) => {
                el.classList.remove('dragOver')
              })
              if (detectedZone !== zone) {
                zoneElement.classList.add('dragOver')
              }
            } else {
              setTargetZone(null)
              document.querySelectorAll('[data-zone]').forEach((el) => {
                el.classList.remove('dragOver')
              })
            }
          } else {
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
      
      document.querySelectorAll('.emptyColumn').forEach((el) => {
        const column = el as HTMLElement
        column.style.width = ''
        column.style.minWidth = ''
        column.style.overflow = ''
      })
      
      document.querySelectorAll('[data-zone]').forEach((el) => {
        el.classList.remove('dragOver')
      })
      
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
      
      if (dropZone && dropZone !== zone) {
        // Move all tabs to new zone
        tabs.forEach((tab) => {
          dockWidget(tab.id, dropZone)
        })
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
      if (indicatorCheckInterval !== undefined) {
        clearInterval(indicatorCheckInterval)
      }
    }
  }, [isDragging, zone, tabs, dockWidget, hoveredZone])
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    // Don't start drag if clicking on tab or close button
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('.tab')) {
      return
    }
    setIsDragging(true)
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
  }

  const activeContent = tabContents[activeTabId]

  return (
    <>
      <div 
        ref={panelRef}
        className={`${styles.tabbedPanel} ${className || ''} ${isDragging ? styles.dragging : ''}`}
      >
        <div className={styles.panelContainer}>
          <div
            ref={headerRef}
            className={`${styles.draggableHeader} ${isDragging ? styles.dragging : ''}`}
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
              <TabHeader
                tabs={tabs}
                activeTabId={activeTabId}
                onTabSelect={() => {}}
                title={title}
              />
              <div className={styles.dragPreviewBody}>
                {activeContent}
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

