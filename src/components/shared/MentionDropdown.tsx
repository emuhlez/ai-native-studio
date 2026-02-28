import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Wrench, Mountain, Trash2, Move, Palette, ClipboardList, ChevronRight, FileCode, Play, Bug, Variable, Camera, Lightbulb, Volume2, Image, Sparkles } from 'lucide-react'
import type { MentionQuery, PillInputHandle, PillKind } from '../../types'
import styles from './MentionDropdown.module.css'

export interface MentionItem {
  id: string
  label: string
  kind: PillKind
  category: 'collaborator' | 'object' | 'tool' | 'scripting'
  /** For scene objects: the GameObject type or primitiveType, used to pick the right icon */
  objectType?: string
}

interface MentionDropdownProps {
  mention: MentionQuery | null
  items: MentionItem[]
  pillInputRef: React.RefObject<PillInputHandle | null>
  onClose: () => void
}

type CategoryKey = 'collaborator' | 'object' | 'tool' | 'scripting'

const CATEGORY_ORDER: CategoryKey[] = ['collaborator', 'object', 'tool', 'scripting']
const CATEGORY_LABELS: Record<string, string> = {
  collaborator: 'Collaborators',
  object: 'Scene Objects',
  tool: 'Tools',
  scripting: 'Scripting',
}

const TOOL_ICONS: Record<string, typeof Box> = {
  addObject: Box,
  removeObject: Trash2,
  transformObject: Move,
  setMaterial: Palette,
  createTerrain: Mountain,
  createPlan: ClipboardList,
  createScript: FileCode,
}

const SCRIPTING_ICONS: Record<string, typeof Box> = {
  'Create Script': FileCode,
  'Run Script': Play,
  'Debug Script': Bug,
  'Variables': Variable,
}

/** Figma asset icons for scene object types */
const FIGMA_OBJECT_ICONS: Record<string, string> = {
  /** Figma AI-Native-Studio node 1187-39702 (Small Terrain) */
  terrain: 'https://www.figma.com/api/mcp/asset/86b903ca-adc7-44c5-b51e-f55050eb1a3f',
  /** Figma AI-Native-Studio node 1187-39700 (Camera) */
  camera: 'https://www.figma.com/api/mcp/asset/86b903ca-adc7-44c5-b51e-f55050eb1a3f',
}

/** Lucide fallback icons per scene-object type / primitiveType */
const OBJECT_TYPE_ICONS: Record<string, typeof Box> = {
  camera: Camera,
  light: Lightbulb,
  audio: Volume2,
  sprite: Image,
  particle: Sparkles,
  terrain: Mountain,
  script: FileCode,
}

/** Figma Avatar variants (AI-Native-Studio) – different images per collaborator */
const FIGMA_AVATAR_VARIANTS: Record<string, string> = {
  robot: 'https://www.figma.com/api/mcp/asset/b2058951-c6b8-4ef4-b712-d2ce97dba0c6',
  anton: 'https://www.figma.com/api/mcp/asset/1c3e2716-5369-4393-af04-538f9a622618',
  leslie: 'https://www.figma.com/api/mcp/asset/1c3e2716-5369-4393-af04-538f9a622618',
}
const DEFAULT_AVATAR_VARIANT = 'leslie'

/** Map collaborator name -> Figma avatar variant key (e.g. David -> robot, Jim -> anton) */
const COLLABORATOR_AVATAR_VARIANT: Record<string, string> = {
  david: 'robot',
  jim: 'anton',
  robot: 'robot',
}

function getAvatarVariantForLabel(label: string): string {
  const key = label.trim().toLowerCase()
  return COLLABORATOR_AVATAR_VARIANT[key] ?? DEFAULT_AVATAR_VARIANT
}

/** Small avatar for collaborators – Figma AI-Native-Studio Avatar: circular, variant image or initial fallback */
function CollaboratorAvatar({ label }: { label: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const variant = getAvatarVariantForLabel(label)
  const imageUrl = FIGMA_AVATAR_VARIANTS[variant] ?? FIGMA_AVATAR_VARIANTS[DEFAULT_AVATAR_VARIANT]
  const initial = (label || '?').charAt(0).toUpperCase()
  return (
    <span className={styles.avatar} aria-hidden title={label}>
      {!imgFailed && imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className={styles.avatarImg}
          onError={() => setImgFailed(true)}
        />
      )}
      <span className={styles.avatarInitial} aria-hidden style={{ visibility: imgFailed || !imageUrl ? 'visible' : 'hidden' }}>
        {initial}
      </span>
    </span>
  )
}

/** Scene Objects icon – design ref: Figma AI-Native-Studio node 1187-39700 */
function ItemIcon({ item }: { item: MentionItem }) {
  if (item.category === 'collaborator') {
    return <CollaboratorAvatar label={item.label} />
  }
  if (item.category === 'object') {
    const ot = item.objectType
    if (ot) {
      const figmaUrl = FIGMA_OBJECT_ICONS[ot]
      if (figmaUrl) {
        return <img src={figmaUrl} alt="" width={14} height={14} className={styles.submenuIconImg} />
      }
      const Icon = OBJECT_TYPE_ICONS[ot]
      if (Icon) return <Icon size={14} />
    }
    return <Box size={14} />
  }
  if (item.category === 'tool') {
    const Icon = TOOL_ICONS[item.label] ?? Wrench
    return <Icon size={14} />
  }
  if (item.category === 'scripting') {
    const Icon = SCRIPTING_ICONS[item.label] ?? FileCode
    return <Icon size={14} />
  }
  return <Box size={14} />
}

const SUBMENU_HOVER_DELAY_MS = 120

export function MentionDropdown({ mention, items, pillInputRef, onClose }: MentionDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const subMenuRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef(0)
  const closeSubMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null)

  const clearCloseSubMenuTimeout = useCallback(() => {
    if (closeSubMenuTimeoutRef.current !== null) {
      clearTimeout(closeSubMenuTimeoutRef.current)
      closeSubMenuTimeoutRef.current = null
    }
  }, [])

  const scheduleCloseSubMenu = useCallback(() => {
    clearCloseSubMenuTimeout()
    closeSubMenuTimeoutRef.current = setTimeout(() => {
      closeSubMenuTimeoutRef.current = null
      setExpandedCategory(null)
    }, SUBMENU_HOVER_DELAY_MS)
  }, [clearCloseSubMenuTimeout])

  const hasQuery = mention ? mention.query.length > 0 : false

  const filtered = useMemo(() => {
    if (!mention) return []
    const q = mention.query.toLowerCase()
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [mention, items])

  // When no query: group all items for sub-menus. When query: group filtered items for inline list.
  const groups = useMemo(() => {
    const source = hasQuery ? filtered : items
    const map = new Map<string, MentionItem[]>()
    for (const item of source) {
      const arr = map.get(item.category) ?? []
      arr.push(item)
      map.set(item.category, arr)
    }
    return CATEGORY_ORDER
      .filter((cat) => map.has(cat))
      .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], items: map.get(cat)! }))
  }, [hasQuery, filtered, items])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Reset selection when query changes
  useEffect(() => {
    selectedRef.current = 0
    setExpandedCategory(null)
    clearCloseSubMenuTimeout()
  }, [mention?.query, clearCloseSubMenuTimeout])

  // Clear close timeout on unmount
  useEffect(() => {
    return () => clearCloseSubMenuTimeout()
  }, [clearCloseSubMenuTimeout])

  const selectItem = useCallback(
    (item: MentionItem) => {
      pillInputRef.current?.replaceMentionWithPill({
        id: item.id,
        label: item.label,
        kind: item.kind,
      })
      setExpandedCategory(null)
      onClose()
    },
    [pillInputRef, onClose],
  )

  // Close sub-menu on click outside
  useEffect(() => {
    if (expandedCategory === null) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current?.contains(target) ||
        subMenuRef.current?.contains(target)
      ) return
      setExpandedCategory(null)
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    return () => document.removeEventListener('mousedown', handleMouseDown, true)
  }, [expandedCategory])

  // Keyboard: when no query, move over categories and Enter opens sub-menu; when query, move over items
  useEffect(() => {
    if (!mention) return
    const handler = (e: KeyboardEvent) => {
      if (hasQuery) {
        if (flatItems.length === 0) return
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          selectedRef.current = Math.min(selectedRef.current + 1, flatItems.length - 1)
          updateHighlight()
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          selectedRef.current = Math.max(selectedRef.current - 1, 0)
          updateHighlight()
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          if (flatItems[selectedRef.current]) {
            e.preventDefault()
            e.stopPropagation()
            selectItem(flatItems[selectedRef.current])
          }
        }
      } else {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          selectedRef.current = Math.min(selectedRef.current + 1, groups.length - 1)
          updateHighlight()
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          selectedRef.current = Math.max(selectedRef.current - 1, 0)
          updateHighlight()
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          const group = groups[selectedRef.current]
          if (group) {
            e.preventDefault()
            e.stopPropagation()
            setExpandedCategory(group.category)
          }
        } else if (e.key === 'Escape') {
          if (expandedCategory !== null) {
            e.preventDefault()
            setExpandedCategory(null)
          }
        }
      }
    }
    const updateHighlight = () => {
      const options = menuRef.current?.querySelectorAll('[role="option"]')
      options?.forEach((el, i) => {
        ;(el as HTMLElement).dataset.selected = String(i === selectedRef.current)
      })
      options?.[selectedRef.current]?.scrollIntoView({ block: 'nearest' })
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [mention, hasQuery, flatItems, groups, selectItem, expandedCategory])

  // No mention, or with query but no matches: hide
  if (!mention) return null
  if (hasQuery && flatItems.length === 0) return null
  // No query: show only if we have at least one category with items
  if (!hasQuery && groups.length === 0) return null

  const { rect } = mention
  const mainStyle: React.CSSProperties = {
    left: rect.left,
    top: rect.top - 6,
    transform: 'translateY(-100%)',
  }

  // No query: only category rows (sub-menus on hover or click)
  if (!hasQuery) {
    const dropdown = (
      <>
        <div
          ref={menuRef}
          className={styles.dropdown}
          style={mainStyle}
          role="listbox"
          aria-label="Mention"
          data-node-id="1181:1558"
        >
          {groups.map((group, i) => (
            <div
              key={group.category}
              className={styles.categoryRow}
              role="option"
              data-selected={String(i === selectedRef.current)}
              aria-selected={i === selectedRef.current}
              onMouseEnter={() => {
                clearCloseSubMenuTimeout()
                setExpandedCategory(group.category)
              }}
              onMouseLeave={scheduleCloseSubMenu}
              onMouseDown={(e) => {
                e.preventDefault()
                setExpandedCategory((prev) => (prev === group.category ? null : group.category))
              }}
            >
              <span className={styles.categoryLabel}>{group.label}</span>
              <ChevronRight size={14} className={styles.categoryChevron} />
            </div>
          ))}
        </div>
        {expandedCategory !== null && (() => {
          const group = groups.find((g) => g.category === expandedCategory)
          if (!group || group.items.length === 0) return null
          const subRect = menuRef.current?.getBoundingClientRect()
          const subLeft = subRect ? subRect.right + 4 : rect.left + 224
          const subTop = subRect ? subRect.top : rect.top - 6
          return createPortal(
            <div
              ref={subMenuRef}
              className={styles.subMenu}
              style={{ left: subLeft, top: subTop }}
              role="listbox"
              aria-label={group.label}
              onMouseEnter={clearCloseSubMenuTimeout}
              onMouseLeave={scheduleCloseSubMenu}
            >
              {group.items.map((item, i) => (
                <div
                  key={item.id}
                  className={styles.option}
                  role="option"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectItem(item)
                  }}
                >
                  <span className={styles.icon}>
                    <ItemIcon item={item} />
                  </span>
                  <span className={styles.label}>{item.label}</span>
                </div>
              ))}
            </div>,
            document.body
          )
        })()}
      </>
    )
    return createPortal(dropdown, document.body)
  }

  // Has query: categories with items inline (current behavior)
  let flatIdx = 0
  const dropdown = (
    <div
      ref={menuRef}
      className={styles.dropdown}
      style={mainStyle}
      role="listbox"
      aria-label="Mention"
      data-node-id="1181:1558"
    >
      {groups.map((group) => (
        <div key={group.category} className={styles.section}>
          <div className={styles.categoryHeader} aria-hidden>
            <span className={styles.categoryLabel}>{group.label}</span>
          </div>
          {group.items.map((item) => {
            const i = flatIdx++
            return (
              <div
                key={item.id}
                className={styles.option}
                role="option"
                data-selected={String(i === selectedRef.current)}
                aria-selected={i === selectedRef.current}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectItem(item)
                }}
              >
                <span className={styles.icon}>
                  <ItemIcon item={item} />
                </span>
                <span className={styles.label}>{item.label}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  return createPortal(dropdown, document.body)
}
