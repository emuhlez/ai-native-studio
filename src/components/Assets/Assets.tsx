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
  X,
} from 'lucide-react'

/* Same filled expand chevrons as Explorer (Hierarchy) */
const ExpandDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6H4Z" />
  </svg>
)
const ExpandRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 4L10 8L6 12V4Z" />
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
            {isExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
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
  { id: 'recent', label: 'Recent', icon: <img src="/icons/recent.svg" alt="Recent" width={16} height={16} /> },
  { id: 'favorites', label: 'Favorites', icon: <img src="/icons/favorites.svg" alt="Favorites" width={16} height={16} /> },
  { id: 'import-queue', label: 'Import Queue', icon: <img src="/icons/import-queue.svg" alt="Import Queue" width={16} height={16} /> },
] as const

/* Nested folders under Assets (replacing Audio, Scripts, Materials, Prefabs as top-level rows) */
const NESTED_ASSET_FOLDERS = [
  { id: 'assets-natural', label: 'Natural' },
  { id: 'assets-architecture', label: 'Architecture' },
  { id: 'assets-npcs', label: "NPC's" },
  { id: 'assets-junk', label: 'Junk' },
] as const

const nestedFolderIcon = <img src="/icons/folder.svg" alt="" width={16} height={16} />

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
  const [assetsExpanded, setAssetsExpanded] = useState(true)
  const [nestedExpanded, setNestedExpanded] = useState<Record<string, boolean>>({})
  const [sideNavWidth, setSideNavWidth] = useState(SIDE_NAV_DEFAULT)
  const resizeStartRef = useRef({ x: 0, w: 0 })

  const setFolderExpanded = (folderName: string, expanded: boolean) => {
    if (folderName === 'Sprites') setAssetsExpanded(expanded)
  }
  const isTopFolderExpanded = (folderName: string) =>
    folderName === 'Sprites' ? assetsExpanded : false
  const toggleNested = (id: string) =>
    setNestedExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const topLevelFolders = assets.filter((a): a is Asset => a.type === 'folder')
  /* Only show Assets (Sprites) in side nav; Audio, Scripts, Materials, Prefabs, Scenes are not in side nav */
  const sideNavTopFolders = topLevelFolders.filter((f) => f.name === 'Sprites')
  const isNestedAssetId = (id: string | null): id is string =>
    id !== null && NESTED_ASSET_FOLDERS.some((n) => n.id === id)
  const isSpecialNavId = (id: string | null): id is string =>
    id !== null && SPECIAL_NAV_ITEMS.some((s) => s.id === id)
  const displayAssets: Asset[] =
    selectedNavId === null
      ? assets
      : isSpecialNavId(selectedNavId) || isNestedAssetId(selectedNavId)
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
              {sideNavTopFolders.map((folder) => {
                const isAssetsRow = folder.name === 'Sprites'
                const topExpanded = isTopFolderExpanded(folder.name)
                return (
                  <div key={folder.id}>
                    <div
                      className={`${styles.sideNavRow} ${styles.sideNavRowWithChevron} ${selectedNavId === folder.id ? styles.sideNavRowSelected : ''}`}
                      style={{ paddingLeft: '8px' }}
                      onClick={() => setSelectedNavId(folder.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(folder.id)}
                    >
                      <span
                        className={styles.sideNavExpand}
                        onClick={(e) => {
                          e.stopPropagation()
                          setFolderExpanded(folder.name, !topExpanded)
                        }}
                        role="button"
                        aria-hidden={false}
                      >
                        {topExpanded ? (
                          <ExpandDownIcon />
                        ) : (
                          <ExpandRightIcon />
                        )}
                      </span>
                      <span className={styles.sideNavIcon}>
                        {isAssetsRow ? (
                          <img src="/icons/folder.svg" alt="Assets" width={16} height={16} />
                        ) : (
                          topLevelFolderIcons[folder.name] ?? <Folder size={16} />
                        )}
                      </span>
                      <span className={styles.sideNavName}>
                        {isAssetsRow ? 'Assets' : folder.name}
                      </span>
                    </div>
                    {isAssetsRow && assetsExpanded &&
                      NESTED_ASSET_FOLDERS.map((nest) => {
                        const nestExpanded = nestedExpanded[nest.id] ?? false
                        return (
                          <div key={nest.id}>
                            <div
                              className={`${styles.sideNavRow} ${styles.sideNavRowWithChevron} ${selectedNavId === nest.id ? styles.sideNavRowSelected : ''}`}
                              style={{ paddingLeft: '26px' }}
                              onClick={() => setSelectedNavId(nest.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(nest.id)}
                            >
                              <span
                                className={styles.sideNavExpand}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleNested(nest.id)
                                }}
                                role="button"
                                aria-hidden={false}
                              >
                                {nestExpanded ? (
                                  <ExpandDownIcon />
                                ) : (
                                  <ExpandRightIcon />
                                )}
                              </span>
                              <span className={styles.sideNavIcon}>{nestedFolderIcon}</span>
                              <span className={styles.sideNavName}>{nest.label}</span>
                            </div>
                            {nestExpanded && (
                              /* placeholder for future sub-children */
                              null
                            )}
                          </div>
                        )
                      })}
                  </div>
                )
              })}
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
          <div className={styles.contentRow}>
            <div className={styles.contentRowSpacer} aria-hidden />
            <div className={styles.contentRowActions}>
              <IconButton icon={<img src="/icons/type.svg" alt="Import Asset" width={24} height={24} />} size="sm" tooltip="Import Asset" />
              <IconButton icon={<img src="/icons/collaborators.svg" alt="Collaborators" width={24} height={24} />} size="sm" tooltip="Collaborators" />
              <IconButton icon={<img src="/icons/sort-by.svg" alt="Sort by" width={24} height={24} />} size="sm" tooltip="Sort by" />
              <IconButton icon={<img src="/icons/grid.svg" alt="Grid" width={24} height={24} />} size="sm" tooltip="Grid" />
            </div>
          </div>
          <div className={styles.contentScroll}>
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
      </div>
    </DockablePanel>
  )
}




