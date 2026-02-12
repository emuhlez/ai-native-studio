import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Folder,
  Image,
  FileCode,
  Box,
  Layers,
  Film,
  Video,
  X,
  ChevronDown,
} from 'lucide-react'

import { ExpandDownIcon, ExpandRightIcon } from '../shared/ExpandIcons'
import searchIconImg from '../../../images/search.png'
import { DockablePanel } from '../shared/DockablePanel'
import { IconButton } from '../shared/IconButton'
import { ContextMenu, useContextMenu } from '../shared/ContextMenu'
import { MenuDropdown, type MenuItem } from '../shared/MenuDropdown'
import { useEditorStore } from '../../store/editorStore'
import type { Asset } from '../../types'
import { AssetTile } from './AssetTile'
import { MoveDialog } from './MoveDialog'
import { FilterMenu } from './FilterMenu'
import styles from './Assets.module.css'

const assetIcons: Record<Asset['type'], React.ReactNode> = {
  folder: <Folder size={14} />,
  texture: <Image size={14} />,
  model: <img src="/icons/model.svg" alt="Model" width={14} height={14} />,
  audio: <img src="/icons/audio.svg" alt="Audio" width={14} height={14} />,
  video: <Video size={14} />,
  script: <FileCode size={14} />,
  material: <Layers size={14} />,
  prefab: <Box size={14} />,
  scene: <Film size={14} />,
  animation: <img src="/icons/animation.svg" alt="Animation" width={14} height={14} />,
}

const SPECIAL_NAV_ITEMS = [
  { id: 'recent', label: 'Import Queue', icon: <img src="/icons/recently-imported.svg" alt="Import Queue" width={16} height={16} /> },
  { id: 'import-queue', label: 'Crossy Farm', icon: <img src="/icons/experience-folder.svg" alt="Crossy Farm" width={16} height={16} /> },
] as const

const INVENTORIES_NAV_ID = 'inventories'
const EHOPE_NAV_ID = 'ehopehopehope'
const ALPHA_STRIKE_NAV_ID = 'alpha-strike'

const SIDE_NAV_MIN = 220
const SIDE_NAV_MAX = 400
const SIDE_NAV_DEFAULT = 220

/** Accepted file extensions for import (excludes gif, pdf) */
const IMPORT_ACCEPT = '.gltf,.glb,.fbx,.obj,.dae,.mp3,.mp4,.m4a,.wav,.ogg,.aac,.flac,.mov,.webm,.avi,.mkv,.png,.jpg,.jpeg,.webp,.tga,.tif,.tiff,.bmp,.js,.ts,.cjs,.mjs,.mat,.prefab,.scene,.anim,.animset'

export function Assets() {
  const { assets, selectedAssetIds, selectAsset, addToImportQueue, importQueue, clearImportQueue, processImportQueue, updateImportQueueItem, renameAsset, createFolder, moveAssetToFolder } = useEditorStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [queueSearchQuery, setQueueSearchQuery] = useState('')
  const [selectedNavId, setSelectedNavId] = useState<string | null>(null)
  const [projectExpanded, setProjectExpanded] = useState(true)
  const [crossyFarmExpanded, setCrossyFarmExpanded] = useState(true)
  const [inventoriesExpanded, setInventoriesExpanded] = useState(true)
  const [sideNavWidth, setSideNavWidth] = useState(SIDE_NAV_DEFAULT)
  const [assetViewMode, setAssetViewMode] = useState<'grid' | 'list'>('grid')
  const resizeStartRef = useRef({ x: 0, w: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queueFileInputRef = useRef<HTMLInputElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const contextMenu = useContextMenu()
  const [contextMenuAssetId, setContextMenuAssetId] = useState<string | null>(null)
  const [lastOpenedFolderId, setLastOpenedFolderId] = useState<string | null>(null)
  const [renamingAssetId, setRenamingAssetId] = useState<string | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [, setMoveDialogAssetId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [progressFrame, setProgressFrame] = useState(1)
  const [openCreatorDropdown, setOpenCreatorDropdown] = useState<string | null>(null)
  const [openPresetDropdown, setOpenPresetDropdown] = useState<string | null>(null)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [filterMenuPosition, setFilterMenuPosition] = useState({ top: 0, right: 0 })

  const topLevelFolders = assets.filter((a): a is Asset => a.type === 'folder')
  const isSpecialNavId = (id: string | null): id is string =>
    id !== null && (SPECIAL_NAV_ITEMS.some((s) => s.id === id) || id === INVENTORIES_NAV_ID || id === EHOPE_NAV_ID || id === ALPHA_STRIKE_NAV_ID)
  const displayAssets: Asset[] =
    selectedNavId === null
      ? assets
      : isSpecialNavId(selectedNavId)
        ? []
        : topLevelFolders.find((f) => f.id === selectedNavId)
          ? [topLevelFolders.find((f) => f.id === selectedNavId)!]
          : assets

  /** Table (Import Queue columns) only for Import Queue; Crossy Farm and others show asset tiles */
  const isImportQueueView = selectedNavId === 'recent'
  const assetsForGrid: Asset[] = (
    selectedNavId === 'import-queue'
      ? assets
      : displayAssets.length === 1 && displayAssets[0].type === 'folder'
        ? displayAssets[0].children ?? []
        : displayAssets
  ).sort((a, b) => a.name.localeCompare(b.name))
  
  // Extract visible asset IDs in display order for range selection
  const visibleAssetIds = assetsForGrid.map(a => a.id)

  const getTypeLabel = (a: Asset): string =>
    a.type === 'folder' ? 'Folder' : a.type.charAt(0).toUpperCase() + a.type.slice(1)

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

  const handleAssetContextMenu = useCallback((assetId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Select the asset if not already selected
    if (!selectedAssetIds.includes(assetId)) {
      selectAsset(assetId, { additive: false, range: false })
    }
    
    setContextMenuAssetId(assetId)
    contextMenu.openContextMenu(e)
  }, [selectedAssetIds, selectAsset, contextMenu])

  const closeContextMenu = useCallback(() => {
    contextMenu.closeContextMenu()
    setContextMenuAssetId(null)
  }, [contextMenu])

  const handleFilterClick = useCallback(() => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setFilterMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setIsFilterMenuOpen(!isFilterMenuOpen)
  }, [isFilterMenuOpen])

  const handleRenameAsset = useCallback((assetId: string) => {
    setRenamingAssetId(assetId)
  }, [])

  const handleConfirmRename = useCallback((assetId: string, newName: string) => {
    if (newName.trim() && newName !== assets.find(a => a.id === assetId)?.name) {
      renameAsset(assetId, newName.trim())
    }
    setRenamingAssetId(null)
  }, [assets, renameAsset])

  const handleCancelRename = useCallback(() => {
    setRenamingAssetId(null)
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((assetId: string) => {
    // If dragging an unselected asset, select only that asset
    if (!selectedAssetIds.includes(assetId)) {
      selectAsset(assetId, { additive: false, range: false })
    }
  }, [selectedAssetIds, selectAsset])

  const handleDragOver = useCallback((e: React.DragEvent, targetAssetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const targetAsset = assets.find(a => a.id === targetAssetId) || 
                        assets.flatMap(a => a.children || []).find(c => c.id === targetAssetId)
    
    // Only allow dropping on folders
    if (targetAsset?.type === 'folder') {
      setDragOverFolderId(targetAssetId)
    }
  }, [assets])

  const handleDragLeave = useCallback(() => {
    setDragOverFolderId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetAssetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)

    const targetAsset = assets.find(a => a.id === targetAssetId) || 
                        assets.flatMap(a => a.children || []).find(c => c.id === targetAssetId)
    
    // Only allow dropping on folders
    if (targetAsset?.type === 'folder') {
      // Move all selected assets to the target folder
      selectedAssetIds.forEach(assetId => {
        // Don't move an asset into itself
        if (assetId !== targetAssetId) {
          moveAssetToFolder(assetId, targetAssetId)
        }
      })
    }
  }, [assets, selectedAssetIds, moveAssetToFolder])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Return/Enter key on selected asset to rename
      if (e.key === 'Enter' && selectedAssetIds.length === 1 && !renamingAssetId) {
        e.preventDefault()
        handleRenameAsset(selectedAssetIds[0])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedAssetIds, renamingAssetId, handleRenameAsset])

  // Animate progress circle when importing
  useEffect(() => {
    const hasImporting = importQueue.some(item => item.status === 'importing')
    if (!hasImporting) return

    const interval = setInterval(() => {
      setProgressFrame(prev => prev >= 4 ? 1 : prev + 1)
    }, 500) // Change frame every 500ms

    return () => clearInterval(interval)
  }, [importQueue])

  const contextMenuAsset = contextMenuAssetId ? assets.find(a => a.id === contextMenuAssetId) : null
  const lastOpenedFolder = lastOpenedFolderId ? topLevelFolders.find(f => f.id === lastOpenedFolderId) : null
  const lastOpenedFolderDisplayName = lastOpenedFolder 
    ? (lastOpenedFolder.name === 'Sprites' ? 'Interior Props' : lastOpenedFolder.name)
    : null

  const contextMenuItems: MenuItem[] = contextMenuAsset ? [
    {
      label: 'Rename',
      onClick: () => {
        if (contextMenuAssetId) {
          handleRenameAsset(contextMenuAssetId)
        }
      },
      shortcut: '↵',
    },
    {
      label: 'Move',
      onClick: () => {
        if (contextMenuAssetId) {
          setMoveDialogAssetId(contextMenuAssetId)
          setShowMoveDialog(true)
        }
      },
    },
    ...(lastOpenedFolderDisplayName && lastOpenedFolderId ? [{
      label: `Move to ${lastOpenedFolderDisplayName}`,
      onClick: () => {
        if (contextMenuAssetId && lastOpenedFolderId) {
          moveAssetToFolder(contextMenuAssetId, lastOpenedFolderId)
        }
      },
    }] : []),
    { divider: true },
    {
      label: 'Create Folder',
      onClick: () => {
        const folderId = createFolder('New Folder')
        setLastOpenedFolderId(folderId)
        selectAsset(folderId)
        // Delay rename to ensure folder is selected first
        setTimeout(() => handleRenameAsset(folderId), 0)
      },
    },
    { divider: true },
    {
      label: 'Insert Asset',
      submenu: [
        {
          label: 'Insert',
          onClick: () => {
            console.log('Insert asset', contextMenuAssetId)
          },
        },
        {
          label: 'Insert with Location',
          onClick: () => {
            console.log('Insert with location', contextMenuAssetId)
          },
        },
      ],
    },
    {
      label: 'Edit Asset',
      onClick: () => {
        // TODO: Implement edit asset functionality
        console.log('Edit asset', contextMenuAssetId)
      },
    },
    {
      label: 'Share Asset',
      onClick: () => {
        // TODO: Implement share asset functionality
        console.log('Share asset', contextMenuAssetId)
      },
    },
    { divider: true },
    {
      label: 'Replace selected in workspace',
      onClick: () => {
        // TODO: Implement replace selected functionality
        console.log('Replace selected in workspace', contextMenuAssetId)
      },
    },
    {
      label: 'See references',
      onClick: () => {
        // TODO: Implement see references functionality
        console.log('See references', contextMenuAssetId)
      },
    },
    { divider: true },
    {
      label: 'Copy Asset ID',
      onClick: () => {
        // TODO: Implement copy asset ID functionality
        if (contextMenuAsset?.assetId) {
          navigator.clipboard.writeText(contextMenuAsset.assetId)
          console.log('Copied asset ID:', contextMenuAsset.assetId)
        }
      },
    },
    { divider: true },
    {
      label: 'View in Browser',
      onClick: () => {
        // TODO: Implement view in browser functionality
        console.log('View in browser', contextMenuAssetId)
      },
    },
  ] : []

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
              <div>
                <div
                  className={`${styles.sideNavRow} ${styles.sideNavRowProject}`}
                  style={{ paddingLeft: '8px' }}
                  onClick={() => setProjectExpanded(!projectExpanded)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setProjectExpanded((p) => !p)}
                >
                  <span className={styles.sideNavExpand} aria-hidden={false}>
                    {projectExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
                  </span>
                  <span className={styles.sideNavIcon} aria-hidden />
                  <span className={styles.sideNavName}>Project</span>
                </div>
                {projectExpanded && (
                  <>
                    <div
                      className={`${styles.sideNavRow} ${selectedNavId === 'recent' ? styles.sideNavRowSelected : ''}`}
                      style={{ paddingLeft: '24px' }}
                      onClick={() => setSelectedNavId('recent')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId('recent')}
                    >
                      <span className={styles.sideNavExpand} aria-hidden>
                        {null}
                      </span>
                      <span className={styles.sideNavIcon}>
                        <img src="/icons/recently-imported.svg" alt="Import Queue" width={16} height={16} />
                      </span>
                      <span className={styles.sideNavName}>Import Queue</span>
                    </div>
                    <div>
                      <div
                        className={`${styles.sideNavRow} ${styles.sideNavRowWithChevron} ${selectedNavId === 'import-queue' ? styles.sideNavRowSelected : ''}`}
                        style={{ paddingLeft: '24px' }}
                        onClick={() => setSelectedNavId('import-queue')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId('import-queue')}
                      >
                        <span
                          className={styles.sideNavExpand}
                          onClick={(e) => {
                            e.stopPropagation()
                            setCrossyFarmExpanded(!crossyFarmExpanded)
                          }}
                          role="button"
                          aria-hidden={false}
                        >
                          {crossyFarmExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
                        </span>
                        <span className={styles.sideNavIcon}>
                          <img src="/icons/experience-folder.svg" alt="Crossy Farm" width={16} height={16} />
                        </span>
                        <span className={styles.sideNavName}>Crossy Farm</span>
                      </div>
                      {crossyFarmExpanded &&
                        topLevelFolders.map((folder) => {
                          const displayName = folder.name === 'Sprites' ? 'Interior Props' : folder.name
                          return (
                            <div
                              key={folder.id}
                              className={`${styles.sideNavRow} ${styles.sideNavRowWithChevron} ${selectedNavId === folder.id ? styles.sideNavRowSelected : ''}`}
                              style={{ paddingLeft: '40px' }}
                              onClick={() => {
                                setSelectedNavId(folder.id)
                                setLastOpenedFolderId(folder.id)
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setSelectedNavId(folder.id)
                                  setLastOpenedFolderId(folder.id)
                                }
                              }}
                            >
                              <span className={styles.sideNavExpand} aria-hidden={false}>
                                <ExpandRightIcon />
                              </span>
                              <span className={styles.sideNavIcon}>
                                <img src="/icons/folder.svg" alt="" width={16} height={16} />
                              </span>
                              <span className={styles.sideNavName}>{displayName}</span>
                            </div>
                          )
                        })}
                    </div>
                  </>
                )}
              </div>
              <div>
                <div
                  className={`${styles.sideNavRow} ${styles.sideNavRowProject}`}
                  style={{ paddingLeft: '8px' }}
                  onClick={() => setInventoriesExpanded(!inventoriesExpanded)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setInventoriesExpanded((i) => !i)}
                >
                  <span className={styles.sideNavExpand} aria-hidden={false}>
                    {inventoriesExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
                  </span>
                  <span className={styles.sideNavIcon} aria-hidden />
                  <span className={styles.sideNavName}>Inventories</span>
                </div>
                {inventoriesExpanded && (
                  <>
                    <div
                      className={`${styles.sideNavRow} ${selectedNavId === EHOPE_NAV_ID ? styles.sideNavRowSelected : ''}`}
                      style={{ paddingLeft: '24px' }}
                      onClick={() => setSelectedNavId(EHOPE_NAV_ID)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(EHOPE_NAV_ID)}
                    >
                      <span className={styles.sideNavExpand} aria-hidden={false}>
                        <ExpandRightIcon />
                      </span>
                      <span className={styles.sideNavIcon}>
                        <img src="/icons/inventory.svg" alt="Inventory" width={16} height={16} />
                      </span>
                      <span className={styles.sideNavName}>ehopehopehope</span>
                    </div>
                    <div
                      className={`${styles.sideNavRow} ${selectedNavId === ALPHA_STRIKE_NAV_ID ? styles.sideNavRowSelected : ''}`}
                      style={{ paddingLeft: '24px' }}
                      onClick={() => setSelectedNavId(ALPHA_STRIKE_NAV_ID)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(ALPHA_STRIKE_NAV_ID)}
                    >
                      <span className={styles.sideNavExpand} aria-hidden={false}>
                        <ExpandRightIcon />
                      </span>
                      <span className={styles.sideNavIcon}>
                        <img src="/icons/group-inventory.svg" alt="Group Inventory" width={16} height={16} />
                      </span>
                      <span className={styles.sideNavName}>alpha strike</span>
                    </div>
                  </>
                )}
              </div>
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
            {isImportQueueView ? (
              <>
                <div className={styles.queueLeftActions}>
                  <input
                    ref={queueFileInputRef}
                    type="file"
                    multiple
                    accept={IMPORT_ACCEPT}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : []
                      if (files.length) addToImportQueue(files)
                      e.target.value = ''
                    }}
                  />
                  <IconButton 
                    icon={<img src="/icons/Open.svg" alt="Open" width={16} height={16} />} 
                    size="sm" 
                    tooltip="Open" 
                    onClick={() => queueFileInputRef.current?.click()}
                  />
                  <IconButton 
                    icon={<img src="/icons/Cleanup.svg" alt="Cleanup" width={16} height={16} />} 
                    size="sm" 
                    tooltip="Clear Queue" 
                    onClick={clearImportQueue}
                  />
                </div>
                <div className={styles.contentRowSpacer} aria-hidden />
                <div className={styles.queueSearchContainer}>
                  <img src={searchIconImg} alt="Search" className={styles.queueSearchIcon} width={16} height={16} />
                  <input
                    type="text"
                    placeholder="Search queue"
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    className={styles.queueSearchInput}
                    aria-label="Search import queue"
                  />
                  {queueSearchQuery && (
                    <button
                      type="button"
                      className={styles.queueSearchClear}
                      onClick={() => setQueueSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className={styles.contentRowSpacer} aria-hidden />
              </>
            ) : (
              <div className={styles.contentRowSpacer} aria-hidden />
            )}
            <div className={styles.contentRowActions}>
              {!isImportQueueView && (
                <>
                  <IconButton icon={<img src="/icons/refresh.svg" alt="Import Asset" width={16} height={16} />} size="xs" tooltip="Import Asset" />
                  <IconButton
                    ref={filterButtonRef}
                    icon={<img src="/icons/filter.svg" alt="Filter" width={16} height={16} />}
                    size="xs"
                    tooltip="Filter"
                    onClick={handleFilterClick}
                    active={isFilterMenuOpen}
                  />
                  <IconButton
                    icon={
                      assetViewMode === 'grid' ? (
                        <img src="/icons/grid-view.svg" alt="Grid view" width={16} height={16} />
                      ) : (
                        <img src="/icons/list-view.svg" alt="List view" width={16} height={16} />
                      )
                    }
                    size="xs"
                    tooltip={assetViewMode === 'grid' ? 'Grid view' : 'List view'}
                    onClick={() => setAssetViewMode((m) => (m === 'grid' ? 'list' : 'grid'))}
                  />
                  <div className={styles.contentRowSeparator} aria-hidden />
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={IMPORT_ACCEPT}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  if (files.length) {
                    addToImportQueue(files)
                    // Auto-process after adding to queue
                    setTimeout(() => processImportQueue(), 100)
                  }
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className={styles.importButton}
                title="Import"
                aria-label="Import"
                onClick={() => {
                  if (isImportQueueView) {
                    processImportQueue()
                  } else {
                    fileInputRef.current?.click()
                  }
                }}
              >
                <span>Import</span>
              </button>
            </div>
          </div>
          <div className={styles.contentScroll}>
            {isImportQueueView ? (
              <div className={styles.contentTableWrap}>
                <table className={styles.contentTable}>
                  <thead>
                    <tr>
                      <th className={`${styles.contentTableTh} ${styles.contentTableThCheckbox}`} aria-hidden="true"></th>
                      <th className={`${styles.contentTableTh} ${styles.contentTableThQueue}`}>
                        Asset
                        <span className={styles.contentTableThDivider} aria-hidden />
                      </th>
                      <th className={styles.contentTableTh}>
                        Creator
                        <span className={styles.contentTableThDivider} aria-hidden />
                      </th>
                      <th className={styles.contentTableTh}>
                        Import Preset
                        <span className={styles.contentTableThDivider} aria-hidden />
                      </th>
                      <th className={styles.contentTableTh}>
                        File Path
                        <span className={styles.contentTableThDivider} aria-hidden />
                      </th>
                      <th className={`${styles.contentTableTh} ${styles.contentTableThStatus}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importQueue.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.contentTableEmpty}>
                        </td>
                      </tr>
                    ) : (
                      importQueue.map((item) => {
                        const icon = assetIcons[item.assetType]
                        const statusClass = item.status === 'success' ? styles.statusSuccess : item.status === 'error' ? styles.statusError : item.status === 'importing' ? styles.statusImporting : styles.statusPending
                        return (
                          <tr key={item.id} className={styles.contentTableRow}>
                            <td className={`${styles.contentTableTd} ${styles.contentTableTdCheckbox}`}>
                              <img src="/icons/checkbox-on.svg" alt="Selected" width={14} height={14} className={styles.tableCheckboxIcon} />
                            </td>
                            <td className={styles.contentTableTd}>
                              <span className={styles.contentTableAssetIcon}>{icon}</span>
                              <span>{item.fileName}</span>
                            </td>
                            <td className={styles.contentTableTd}>
                              <div style={{ position: 'relative' }}>
                                <button
                                  className={styles.importPresetSelect}
                                  onClick={() => setOpenCreatorDropdown(openCreatorDropdown === item.id ? null : item.id)}
                                >
                                  <span>{item.creator}</span>
                                  <ExpandDownIcon />
                                </button>
                                <MenuDropdown
                                  items={[
                                    { label: 'ehopehopehope', onClick: () => updateImportQueueItem(item.id, { creator: 'ehopehopehope' }) },
                                    { label: 'alpha strike', onClick: () => updateImportQueueItem(item.id, { creator: 'alpha strike' }) },
                                  ]}
                                  isOpen={openCreatorDropdown === item.id}
                                  onClose={() => setOpenCreatorDropdown(null)}
                                />
                              </div>
                            </td>
                            <td className={styles.contentTableTd}>
                              <div style={{ position: 'relative' }}>
                                <button
                                  className={styles.importPresetSelect}
                                  onClick={() => setOpenPresetDropdown(openPresetDropdown === item.id ? null : item.id)}
                                >
                                  <span>{item.importPreset}</span>
                                  <ExpandDownIcon />
                                </button>
                                <MenuDropdown
                                  items={[
                                    { label: 'Default', onClick: () => updateImportQueueItem(item.id, { importPreset: 'Default' }) },
                                    { label: 'High Quality', onClick: () => updateImportQueueItem(item.id, { importPreset: 'High Quality' }) },
                                    { label: 'Optimized', onClick: () => updateImportQueueItem(item.id, { importPreset: 'Optimized' }) },
                                  ]}
                                  isOpen={openPresetDropdown === item.id}
                                  onClose={() => setOpenPresetDropdown(null)}
                                />
                              </div>
                            </td>
                            <td className={`${styles.contentTableTd} ${styles.contentTableTdFilePath}`} title={item.filePath}>
                              {item.filePath.length > 50 ? `...${item.filePath.slice(-47)}` : item.filePath}
                            </td>
                            <td className={`${styles.contentTableTd} ${styles.contentTableTdStatus} ${statusClass}`}>
                              {item.status === 'importing' && (
                                <img src={`/icons/ProgressCircle-${progressFrame}.svg`} alt="Importing" width={16} height={16} className={styles.progressCircle} />
                              )}
                              {item.status === 'success' && (
                                <img src="/icons/success.svg" alt="Success" width={16} height={16} />
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : assetViewMode === 'list' ? (
              <div className={styles.contentTableWrap}>
                <table className={styles.contentTable}>
                  <thead>
                    <tr>
                      <th className={styles.contentTableTh}>
                        <span className={styles.contentTableThDropdown}>
                          Name
                          <ChevronDown size={12} className={styles.contentTableThDropdownIcon} />
                        </span>
                        <span className={styles.contentTableThDivider} aria-hidden />
                      </th>
                      <th className={styles.contentTableTh}>
                        ID
                        <span className={styles.contentTableThDivider} aria-hidden />
                      </th>
                      <th className={styles.contentTableTh}>
                        Type
                        <span className={styles.contentTableThDivider} aria-hidden />
                      </th>
                      <th className={styles.contentTableTh}>
                        Date Modified
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetsForGrid.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.contentTableEmpty}>
                          No assets
                        </td>
                      </tr>
                    ) : (
                      assetsForGrid.map((asset) => {
                        const icon = asset.type === 'folder' ? <img src="/icons/folder.svg" alt="" width={16} height={16} /> : assetIcons[asset.type]
                        const displayName = asset.name === 'Sprites' ? 'Interior Props' : asset.name
                        const isFolder = asset.type === 'folder'
                        const previewImageUrl =
                          asset.type === 'texture' || asset.type === 'material'
                            ? (asset.thumbnail ?? asset.path)
                            : ''
                        const modelPath = asset.type === 'model' ? asset.path : undefined
                        const isSelected = selectedAssetIds.includes(asset.id)
                        const isDragOver = dragOverFolderId === asset.id
                        return (
                          <tr
                            key={asset.id}
                            className={`${styles.contentTableRow} ${isSelected ? styles.contentTableRowSelected : ''} ${isDragOver ? styles.dragOver : ''}`}
                            draggable={renamingAssetId !== asset.id}
                            onClick={(e) => selectAsset(asset.id, { range: e.shiftKey, additive: e.metaKey || e.ctrlKey, visibleAssetIds })}
                            onDoubleClick={isFolder ? () => setSelectedNavId(asset.id) : undefined}
                            onContextMenu={(e) => handleAssetContextMenu(asset.id, e)}
                            onMouseDown={(e) => {
                              // Handle control+click as context menu
                              if (e.ctrlKey && e.button === 0) {
                                handleAssetContextMenu(asset.id, e)
                              }
                            }}
                            onDragStart={(e) => {
                              if (renamingAssetId !== asset.id) {
                                handleDragStart(asset.id)
                                e.dataTransfer.effectAllowed = 'move'
                                e.dataTransfer.setData('text/plain', displayName)
                              }
                            }}
                            onDragOver={(e) => {
                              if (isFolder) {
                                handleDragOver(e, asset.id)
                              }
                            }}
                            onDragLeave={() => {
                              if (isFolder) {
                                handleDragLeave()
                              }
                            }}
                            onDrop={(e) => {
                              if (isFolder) {
                                handleDrop(e, asset.id)
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                selectAsset(asset.id)
                              }
                            }}
                            aria-pressed={isSelected}
                          >
                            <td className={styles.contentTableTd}>
                              <AssetTile
                                id={asset.id}
                                name={displayName}
                                typeLabel={getTypeLabel(asset)}
                                icon={icon}
                                previewImageUrl={previewImageUrl}
                                modelPath={modelPath}
                                isSelected={isSelected}
                                onSelect={() => {}}
                                onContextMenu={(e) => {
                                  e.stopPropagation()
                                  handleAssetContextMenu(asset.id, e)
                                }}
                                viewMode="list"
                                isRenaming={renamingAssetId === asset.id}
                                onRename={(newName) => handleConfirmRename(asset.id, newName)}
                                onCancelRename={handleCancelRename}
                                isFolder={isFolder}
                                isDragOver={isDragOver}
                              />
                            </td>
                            <td className={styles.contentTableTd}>{isFolder ? '—' : asset.assetId}</td>
                            <td className={styles.contentTableTd}>{getTypeLabel(asset)}</td>
                            <td className={styles.contentTableTd}>{asset.dateModified || '—'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.gridView}>
                {assetsForGrid.length === 0 ? (
                  <div className={styles.contentTableEmpty}>No assets</div>
                ) : (
                  assetsForGrid.map((asset) => {
                    const icon = asset.type === 'folder' ? <img src="/icons/folder.svg" alt="" width={16} height={16} /> : assetIcons[asset.type]
                    const displayName = asset.name === 'Sprites' ? 'Interior Props' : asset.name
                    const previewImageUrl =
                      asset.type === 'texture' || asset.type === 'material'
                        ? (asset.thumbnail ?? asset.path)
                        : ''
                    // Only pass modelPath for visible assets to reduce rendering load
                    const modelPath = asset.type === 'model' ? asset.path : undefined
                    const handleDoubleClick = asset.type === 'folder' ? () => setSelectedNavId(asset.id) : undefined
                    const isSelected = selectedAssetIds.includes(asset.id)
                    const isFolder = asset.type === 'folder'
                    const isDragOver = dragOverFolderId === asset.id
                    return (
                      <AssetTile
                        key={asset.id}
                        id={asset.id}
                        name={displayName}
                        typeLabel={getTypeLabel(asset)}
                        icon={icon}
                        previewImageUrl={previewImageUrl}
                        modelPath={modelPath}
                        isSelected={isSelected}
                        onSelect={(e) => selectAsset(asset.id, { range: e?.shiftKey, additive: e?.metaKey || e?.ctrlKey, visibleAssetIds })}
                        onDoubleClick={handleDoubleClick}
                        onContextMenu={(e) => handleAssetContextMenu(asset.id, e)}
                        isRenaming={renamingAssetId === asset.id}
                        onRename={(newName) => handleConfirmRename(asset.id, newName)}
                        onCancelRename={handleCancelRename}
                        isFolder={isFolder}
                        isDragOver={isDragOver}
                        onDragStart={() => handleDragStart(asset.id)}
                        onDragOver={(e) => handleDragOver(e, asset.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, asset.id)}
                      />
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ContextMenu
        items={contextMenuItems}
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
      />
      
      <MoveDialog
        isOpen={showMoveDialog}
        assetCount={selectedAssetIds.length}
        folders={topLevelFolders}
        onMove={(targetFolderId) => {
          selectedAssetIds.forEach(assetId => {
            moveAssetToFolder(assetId, targetFolderId)
          })
          setShowMoveDialog(false)
          setMoveDialogAssetId(null)
        }}
        onCancel={() => {
          setShowMoveDialog(false)
          setMoveDialogAssetId(null)
        }}
      />

      <FilterMenu
        isOpen={isFilterMenuOpen}
        onClose={() => setIsFilterMenuOpen(false)}
        position={filterMenuPosition}
      />
    </DockablePanel>
  )
}




