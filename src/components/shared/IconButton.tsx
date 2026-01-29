import type { ReactNode, ButtonHTMLAttributes } from 'react'
import styles from './IconButton.module.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'accent'
  tooltip?: string
}

export function IconButton({ 
  icon, 
  active, 
  size = 'md', 
  variant = 'default',
  tooltip,
  className,
  ...props 
}: IconButtonProps) {
  return (
    <button
      className={`
        ${styles.button} 
        ${styles[size]} 
        ${styles[variant]}
        ${active ? styles.active : ''} 
        ${className || ''}
      `}
      title={tooltip}
      {...props}
    >
      {icon}
    </button>
  )
}





