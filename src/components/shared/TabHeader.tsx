import type { ReactNode } from 'react'
import styles from './TabHeader.module.css'

export interface Tab {
  id: string
  title: string
  icon?: ReactNode
  actions?: ReactNode
}

interface TabHeaderProps {
  tabs: Tab[]
  activeTabId: string
  onTabSelect: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  title?: string
  className?: string
}

export function TabHeader({ 
  tabs, 
  activeTabId, 
  onTabSelect, 
  onTabClose: _onTabClose,
  title,
  className 
}: TabHeaderProps) {
  if (tabs.length <= 1) {
    // Single tab - show as regular header
    const tab = tabs[0]
    return (
      <div className={`${styles.header} ${className || ''}`}>
        {title && <span className={styles.zoneTitle}>{title}</span>}
        <div className={styles.titleArea}>
          <h2 className={styles.title}>{tab.title}</h2>
        </div>
        {tab.actions && <div className={styles.actions}>{tab.actions}</div>}
      </div>
    )
  }

  // Multiple tabs - show tab interface
  return (
    <div className={`${styles.tabContainer} ${className || ''}`}>
      {title && <span className={styles.zoneTitle}>{title}</span>}
      <div className={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => onTabSelect(tab.id)}
              title={tab.title}
            >
              <span className={styles.tabTitle}>{tab.title}</span>
            </button>
          )
        })}
      </div>
      {tabs.find(t => t.id === activeTabId)?.actions && (
        <div className={styles.actions}>
          {tabs.find(t => t.id === activeTabId)?.actions}
        </div>
      )}
    </div>
  )
}


