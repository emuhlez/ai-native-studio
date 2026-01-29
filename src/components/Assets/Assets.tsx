import { useCallback, useRef, useState } from 'react'
import {
  Folder,
  FolderOpen,
  Image,
  FileCode,
  Volume2,
  Box,
  Layers,
  Film,
  ChevronRight,
  ChevronDown,
  Plus,
  Grid2X2,
  List,
  X,
  Clock,
  Star,
  Inbox
} from 'lucide-react'

/* Same expand chevrons as Explorer (Hierarchy) */
const ExpandDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6H4Z" />
  </svg>
)
import searchIconImg from '../../../images/search.png'
import { DockablePanel } from '../shared/DockablePanel'
import { IconButton } from '../shared/IconButton'
import { useEditorStore } from '../../store/editorStore'
import type { Asset } from '../../types'
import styles from './Assets.module.css'

const assetIcons: Record<Asset['type'], React.ReactNode> = {
  folder: <Folder size={14} />,
  texture: <Image size={14} />,
  model: <Box size={14} />,
  audio: <Volume2 size={14} />,
  script: <FileCode size={14} />,
  material: <Layers size={14} />,
  prefab: <Box size={14} />,
  scene: <Film size={14} />,
}

interface AssetItemProps {
  asset: Asset
  depth: number
  viewMode: 'list' | 'grid'
}

function AssetItem({ asset, depth, viewMode }: AssetItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { selectedAssetId, selectAsset } = useEditorStore()
  const isSelected = selectedAssetId === asset.id
  const isFolder = asset.type === 'folder'
  const hasChildren = asset.children && asset.children.length > 0

  if (viewMode === 'grid' && !isFolder) {
    return (
      <div
        className={`${styles.gridItem} ${isSelected ? styles.selected : ''}`}
        onClick={() => selectAsset(asset.id)}
      >
        <div className={styles.gridIcon}>{assetIcons[asset.type]}</div>
        <span className={styles.gridName}>{asset.name}</span>
      </div>
    )
  }

  return (
    <div className={styles.assetItem}>
      <div
        className={`${styles.itemRow} ${isSelected ? styles.selected : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => selectAsset(asset.id)}
      >
        {isFolder && (
          <button
            className={styles.expandBtn}
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        {!isFolder && <span className={styles.spacer} />}
        <span className={styles.icon}>
          {isFolder && isExpanded ? <FolderOpen size={14} /> : assetIcons[asset.type]}
        </span>
        <span className={styles.name}>{asset.name}</span>
      </div>

      {isFolder && hasChildren && isExpanded && (
        <div className={styles.children}>
          {asset.children!.map((child) => (
            <AssetItem key={child.id} asset={child} depth={depth + 1} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  )
}

const SPECIAL_NAV_ITEMS = [
  { id: 'recent', label: 'Recent', icon: <Clock size={16} /> },
  { id: 'favorites', label: 'Favorites', icon: <Star size={16} /> },
  { id: 'import-queue', label: 'Import Queue', icon: <Inbox size={16} /> },
] as const

const topLevelFolderIcons: Record<string, React.ReactNode> = {
  Sprites: <Image size={16} />,
  Audio: <Volume2 size={16} />,
  Scripts: <FileCode size={16} />,
  Materials: <Layers size={16} />,
  Prefabs: <Box size={16} />,
  Scenes: <Film size={16} />,
}

const SIDE_NAV_MIN = 220
const SIDE_NAV_MAX = 400
const SIDE_NAV_DEFAULT = 220

export function Assets() {
  const { assets } = useEditorStore()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNavId, setSelectedNavId] = useState<string | null>(null)
  const [sideNavWidth, setSideNavWidth] = useState(SIDE_NAV_DEFAULT)
  const resizeStartRef = useRef({ x: 0, w: 0 })

  const topLevelFolders = assets.filter((a): a is Asset => a.type === 'folder')
  const isSpecialNavId = (id: string | null): id is string =>
    id !== null && SPECIAL_NAV_ITEMS.some((s) => s.id === id)
  const displayAssets: Asset[] =
    selectedNavId === null
      ? assets
      : isSpecialNavId(selectedNavId)
        ? []
        : topLevelFolders.find((f) => f.id === selectedNavId)
          ? [topLevelFolders.find((f) => f.id === selectedNavId)!]
          : assets

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    resizeStartRef.current = { x: e.clientX, w: sideNavWidth }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [sideNavWidth])

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons !== 1) return
      const dx = e.clientX - resizeStartRef.current.x
      const next = Math.max(SIDE_NAV_MIN, Math.min(SIDE_NAV_MAX, resizeStartRef.current.w + dx))
      resizeStartRef.current = { x: e.clientX, w: next }
      setSideNavWidth(next)
    },
    []
  )

  const onResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  return (
    <DockablePanel
      widgetId="assets"
      title="Asset Manager"
      icon={<Folder size={16} />}
      actions={
        <div className={styles.actions}>
          <div className={styles.viewToggle}>
            <IconButton
              icon={<List size={14} />}
              active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              size="sm"
              tooltip="List View"
            />
            <IconButton
              icon={<Grid2X2 size={14} />}
              active={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              size="sm"
              tooltip="Grid View"
            />
          </div>
          <IconButton icon={<Plus size={14} />} size="sm" tooltip="Import Asset" />
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.sideNavWrap} style={{ width: sideNavWidth, minWidth: sideNavWidth }}>
          <div className={styles.sideNavSearch}>
            <div className={styles.sideNavSearchContainer}>
              <img src={searchIconImg} alt="Search" className={styles.sideNavSearchIcon} width={16} height={16} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.sideNavSearchInput}
                aria-label="Search"
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.sideNavSearchClear}
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <nav className={styles.sideNav} aria-label="Asset categories">
            <div className={styles.sideNavTree}>
              <div
                className={`${styles.sideNavRow} ${styles.sideNavRowProject} ${selectedNavId === null ? styles.sideNavRowSelected : ''}`}
                style={{ paddingLeft: '8px' }}
                onClick={() => setSelectedNavId(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(null)}
              >
                <span className={styles.sideNavExpand}>
                  <ExpandDownIcon />
                </span>
                <span className={styles.sideNavIcon} aria-hidden />
                <span className={styles.sideNavName}>Project</span>
              </div>
              {SPECIAL_NAV_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.sideNavRow} ${selectedNavId === item.id ? styles.sideNavRowSelected : ''}`}
                  style={{ paddingLeft: '8px' }}
                  onClick={() => setSelectedNavId(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(item.id)}
                >
                  <span className={styles.sideNavExpand} aria-hidden />
                  <span className={styles.sideNavIcon}>{item.icon}</span>
                  <span className={styles.sideNavName}>{item.label}</span>
                </div>
              ))}
              {topLevelFolders.map((folder) => (
                <div
                  key={folder.id}
                  className={`${styles.sideNavRow} ${selectedNavId === folder.id ? styles.sideNavRowSelected : ''}`}
                  style={{ paddingLeft: '8px' }}
                  onClick={() => setSelectedNavId(folder.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(folder.id)}
                >
                  <span className={styles.sideNavExpand} aria-hidden />
                  <span className={styles.sideNavIcon}>
                    {topLevelFolderIcons[folder.name] ?? <Folder size={16} />}
                  </span>
                  <span className={styles.sideNavName}>{folder.name}</span>
                </div>
              ))}
            </div>
          </nav>
          <div
            role="separator"
            aria-orientation="vertical"
            className={styles.sideNavResizeHandle}
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          />
        </div>
        <div className={styles.content}>
          {viewMode === 'list' ? (
            <div className={styles.tree}>
              {displayAssets.map((asset) => (
                <AssetItem key={asset.id} asset={asset} depth={0} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <div className={styles.grid}>
              {displayAssets.map((asset) => (
                <AssetItem key={asset.id} asset={asset} depth={0} viewMode={viewMode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DockablePanel>
  )
}




