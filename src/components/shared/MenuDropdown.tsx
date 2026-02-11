import { useState, useRef, useEffect } from 'react'
import { ExpandRightIcon } from './ExpandIcons'
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

function SubmenuItem({ item, onClose, isHovered }: { item: MenuItem; onClose: () => void; isHovered: boolean }) {
  const submenuRef = useRef<HTMLDivElement>(null)
  const [shouldFlipLeft, setShouldFlipLeft] = useState(false)

  useEffect(() => {
    if (!isHovered || !submenuRef.current) return

    const submenu = submenuRef.current
    const rect = submenu.getBoundingClientRect()
    const viewportWidth = window.innerWidth

    // Check if submenu overflows right edge
    if (rect.right > viewportWidth) {
      setShouldFlipLeft(true)
    } else {
      setShouldFlipLeft(false)
    }
  }, [isHovered])

  if (!isHovered) return null

  console.log('🎨 Rendering submenu with items:', item.submenu)

  return (
    <div 
      ref={submenuRef}
      className={styles.submenu}
      style={shouldFlipLeft ? { left: 'auto', right: 'calc(100% - 4px)' } : undefined}
    >
      {item.submenu!.map((subItem, subIndex) => {
        if (subItem.divider) {
          return <div key={`subdiv-${subIndex}`} className={styles.dropdownDivider} />
        }
        return (
          <button
            key={subItem.label || `subitem-${subIndex}`}
            className={styles.dropdownItem}
            onClick={(e) => {
              console.log('🎯 SUBMENU ITEM CLICKED:', subItem.label)
              console.log('🎯 Has onClick?', typeof subItem.onClick)
              console.log('🎯 Event:', e)
              e.stopPropagation()
              e.preventDefault()
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
  )
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
            onMouseEnter={() => {
              console.log('🖱️ Mouse enter on:', item.label, 'index:', index, 'hasSubmenu:', hasSubmenu)
              setHoveredIndex(index)
            }}
            onMouseLeave={() => {
              console.log('🖱️ Mouse leave from:', item.label)
              setHoveredIndex(null)
            }}
          >
            <button
              className={styles.dropdownItem}
              onClick={() => {
                console.log('🎯 Parent item clicked:', item.label, 'hasSubmenu:', hasSubmenu)
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
                {hasSubmenu && <ExpandRightIcon />}
              </span>
            </button>
            
            {hasSubmenu && (
              <SubmenuItem item={item} onClose={onClose} isHovered={isHovered} />
            )}
          </div>
        )
      })}
    </div>
  )
}

