import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { useDockingStore } from '../../store/dockingStore'
import type { DockZone } from '../../types'
import styles from './DockLayout.module.css'

type ResizeDirection = 'n' | 's' | 'e' | 'w'

interface ResizeHandleProps {
  direction: ResizeDirection
  onDrag: (deltaX: number, deltaY: number) => void
  className?: string
}

function ResizeHandle({ direction, onDrag, className }: ResizeHandleProps) {
  const draggingRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0 })

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      startRef.current = { x: e.clientX, y: e.clientY }
      draggingRef.current = true
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y
      startRef.current = { x: e.clientX, y: e.clientY }
      onDrag(dx, dy)
    },
    [onDrag]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      draggingRef.current = false
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    },
    []
  )

  return (
    <div
      role="separator"
      aria-orientation={direction === 'e' || direction === 'w' ? 'vertical' : 'horizontal'}
      className={`${styles.resizeHandle} ${styles[`resizeHandle_${direction}`]} ${className ?? ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  )
}

interface DockZoneContainerProps {
  zone: DockZone
  children: ReactNode
  className?: string
}

export function DockZoneContainer({ zone, children, className }: DockZoneContainerProps) {
  const widgets = useDockingStore((state) => state.getWidgetsInZone(zone))
  const isEmpty = widgets.length === 0
  
  return (
    <div 
      className={`${styles.dockZone} ${styles[zone]} ${className || ''} ${isEmpty ? styles.empty : ''}`}
      data-zone={zone}
    >
      {children}
    </div>
  )
}

interface DockLayoutProps {
  leftZone: ReactNode
  centerTopZone: ReactNode
  centerBottomZone: ReactNode
  rightTopZone: ReactNode
  rightBottomZone: ReactNode
}

export function DockLayout({ leftZone, centerTopZone, centerBottomZone, rightTopZone, rightBottomZone }: DockLayoutProps) {
  const leftWidgets = useDockingStore((state) => state.getWidgetsInZone('left'))
  const centerTopWidgets = useDockingStore((state) => state.getWidgetsInZone('center-top'))
  const centerBottomWidgets = useDockingStore((state) => state.getWidgetsInZone('center-bottom'))
  const rightTopWidgets = useDockingStore((state) => state.getWidgetsInZone('right-top'))
  const rightBottomWidgets = useDockingStore((state) => state.getWidgetsInZone('right-bottom'))
  const panelSizes = useDockingStore((state) => state.panelSizes)
  const setPanelSize = useDockingStore((state) => state.setPanelSize)

  const hasLeftWidgets = leftWidgets.length > 0
  const hasCenterWidgets = centerTopWidgets.length > 0 || centerBottomWidgets.length > 0
  const hasCenterBottomWidgets = centerBottomWidgets.length > 0
  const hasRightWidgets = rightTopWidgets.length > 0 || rightBottomWidgets.length > 0

  const onResizeLeft = useCallback(
    (dx: number) => setPanelSize('leftWidth', panelSizes.leftWidth + dx),
    [panelSizes.leftWidth, setPanelSize]
  )
  const onResizeRight = useCallback(
    (dx: number) => setPanelSize('rightWidth', panelSizes.rightWidth - dx),
    [panelSizes.rightWidth, setPanelSize]
  )
  const onResizeCenterBottom = useCallback(
    (dy: number) => setPanelSize('centerBottomHeight', panelSizes.centerBottomHeight + dy),
    [panelSizes.centerBottomHeight, setPanelSize]
  )
  const onResizeRightBottom = useCallback(
    (dy: number) => setPanelSize('rightBottomHeight', panelSizes.rightBottomHeight + dy),
    [panelSizes.rightBottomHeight, setPanelSize]
  )

  return (
    <div className={styles.dockLayout}>
      <div
        className={`${styles.leftColumn} ${!hasLeftWidgets ? styles.emptyColumn : ''}`}
        style={hasLeftWidgets ? { width: panelSizes.leftWidth, minWidth: panelSizes.leftWidth } : undefined}
      >
        <DockZoneContainer zone="left">
          {leftZone}
        </DockZoneContainer>
        {hasLeftWidgets && (
          <ResizeHandle
            direction="e"
            className={styles.resizeHandleLeft}
            onDrag={(dx) => onResizeLeft(dx)}
          />
        )}
      </div>

      <div className={`${styles.centerColumn} ${!hasCenterWidgets ? styles.emptyColumn : ''}`}>
        <div className={styles.centerTop}>
          <DockZoneContainer zone="center-top">
            {centerTopZone}
          </DockZoneContainer>
        </div>
        {hasCenterWidgets && hasCenterBottomWidgets && (
          <ResizeHandle
            direction="s"
            className={styles.resizeHandleCenterBottom}
            onDrag={(_, dy) => onResizeCenterBottom(dy)}
          />
        )}
        <div
          className={`${styles.centerBottom} ${!hasCenterBottomWidgets ? styles.centerBottomHidden : ''}`}
          style={hasCenterBottomWidgets ? { height: panelSizes.centerBottomHeight } : undefined}
        >
          <DockZoneContainer zone="center-bottom">
            {centerBottomZone}
          </DockZoneContainer>
        </div>
      </div>

      <div
        className={`${styles.rightColumn} ${!hasRightWidgets ? styles.emptyColumn : ''}`}
        style={hasRightWidgets ? { width: panelSizes.rightWidth, minWidth: panelSizes.rightWidth } : undefined}
      >
        {hasRightWidgets && (
          <ResizeHandle
            direction="w"
            className={styles.resizeHandleRight}
            onDrag={(dx) => onResizeRight(dx)}
          />
        )}
        <div className={styles.rightTop}>
          <DockZoneContainer zone="right-top">
            {rightTopZone}
          </DockZoneContainer>
        </div>
        {hasRightWidgets && (
          <ResizeHandle
            direction="s"
            className={styles.resizeHandleRightSplit}
            onDrag={(_, dy) => onResizeRightBottom(dy)}
          />
        )}
        <div
          className={styles.rightBottom}
          style={{ flex: '0 0 auto', height: panelSizes.rightBottomHeight, minHeight: 0 }}
        >
          <DockZoneContainer zone="right-bottom">
            {rightBottomZone}
          </DockZoneContainer>
        </div>
      </div>
    </div>
  )
}

