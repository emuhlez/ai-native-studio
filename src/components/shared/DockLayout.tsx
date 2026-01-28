import type { ReactNode } from 'react'
import { useDockingStore } from '../../store/dockingStore'
import type { DockZone } from '../../types'
import styles from './DockLayout.module.css'

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
  
  const hasLeftWidgets = leftWidgets.length > 0
  const hasCenterWidgets = centerTopWidgets.length > 0 || centerBottomWidgets.length > 0
  const hasCenterBottomWidgets = centerBottomWidgets.length > 0
  const hasRightWidgets = rightTopWidgets.length > 0 || rightBottomWidgets.length > 0
  
  return (
    <div className={styles.dockLayout}>
      <div className={`${styles.leftColumn} ${!hasLeftWidgets ? styles.emptyColumn : ''}`}>
        <DockZoneContainer zone="left">
          {leftZone}
        </DockZoneContainer>
      </div>
      
      <div className={`${styles.centerColumn} ${!hasCenterWidgets ? styles.emptyColumn : ''}`}>
        <div className={styles.centerTop}>
          <DockZoneContainer zone="center-top">
            {centerTopZone}
          </DockZoneContainer>
        </div>
        <div className={`${styles.centerBottom} ${!hasCenterBottomWidgets ? styles.centerBottomHidden : ''}`}>
          <DockZoneContainer zone="center-bottom">
            {centerBottomZone}
          </DockZoneContainer>
        </div>
      </div>
      
      <div className={`${styles.rightColumn} ${!hasRightWidgets ? styles.emptyColumn : ''}`}>
        <div className={styles.rightTop}>
          <DockZoneContainer zone="right-top">
            {rightTopZone}
          </DockZoneContainer>
        </div>
        <div className={styles.rightBottom}>
          <DockZoneContainer zone="right-bottom">
            {rightBottomZone}
          </DockZoneContainer>
        </div>
      </div>
    </div>
  )
}

