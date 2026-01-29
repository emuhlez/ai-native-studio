import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import styles from './MenuDropdown.module.css'

export interface MenuDropdownProps {
  items: MenuItem[]
  isOpen: boolean
  onClose: () => void
}

export interface MenuItem {
  label?: string
  onClick?: () => void
  divider?: boolean
  shortcut?: string
  submenu?: MenuItem[]
}

export function MenuDropdown({ items, isOpen, onClose }: MenuDropdownProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!isOpen) return null

  return (
    <div className={styles.menuDropdown}>
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={`divider-${index}`} className={styles.dropdownDivider} />
        }
        
        const hasSubmenu = item.submenu && item.submenu.length > 0
        const isHovered = hoveredIndex === index

        return (
          <div
            key={item.label || `item-${index}`}
            className={styles.menuItemWrapper}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <button
              className={styles.dropdownItem}
              onClick={() => {
                if (!hasSubmenu) {
                  item.onClick?.()
                  onClose()
                }
              }}
            >
              <span>{item.label}</span>
              <span className={styles.shortcutGroup}>
                {item.shortcut && (
                  <span className={styles.shortcut}>{item.shortcut}</span>
                )}
                {hasSubmenu && <ChevronRight size={16} />}
              </span>
            </button>
            
            {hasSubmenu && isHovered && (
              <div className={styles.submenu}>
                {item.submenu!.map((subItem, subIndex) => {
                  if (subItem.divider) {
                    return <div key={`subdiv-${subIndex}`} className={styles.dropdownDivider} />
                  }
                  return (
                    <button
                      key={subItem.label || `subitem-${subIndex}`}
                      className={styles.dropdownItem}
                      onClick={() => {
                        subItem.onClick?.()
                        onClose()
                      }}
                    >
                      <span>{subItem.label}</span>
                      {subItem.shortcut && (
                        <span className={styles.shortcut}>{subItem.shortcut}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

