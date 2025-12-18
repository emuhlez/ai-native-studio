import type { ReactNode } from 'react'
import styles from './Panel.module.css'

interface PanelProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
}

interface PanelHeaderProps {
  title: string
  icon?: ReactNode
  actions?: ReactNode
}

export function PanelHeader({ title, icon, actions }: PanelHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titleArea}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}

export function Panel({ title, icon, children, actions, className }: PanelProps) {
  return (
    <>
      <PanelHeader title={title} icon={icon} actions={actions} />
      <div className={`${styles.panel} ${className || ''}`}>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </>
  )
}

