import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { setActiveComponent } from '../../utils/componentTracker'
import styles from './IconButton.module.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  active?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
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
  onClick,
  ...props 
}: IconButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Track component usage
    setActiveComponent('IconButton', 'src/components/shared/IconButton.tsx')
    
    // Call original onClick if provided
    onClick?.(e)
  }

  return (
    <button
      data-component="IconButton"
      className={`
        ${styles.button} 
        ${styles[size]} 
        ${styles[variant]}
        ${active ? styles.active : ''} 
        ${className || ''}
      `}
      title={tooltip}
      onClick={handleClick}
      {...props}
    >
      {icon}
    </button>
  )
}





