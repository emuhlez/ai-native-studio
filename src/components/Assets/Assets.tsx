import { useCallback, useRef, useState } from 'react'
import {
  Folder,
  Image,
  FileCode,
  Volume2,
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
import { useEditorStore } from '../../store/editorStore'
import type { Asset } from '../../types'
import { AssetTile } from './AssetTile'
import styles from './Assets.module.css'

const assetIcons: Record<Asset['type'], React.ReactNode> = {
  folder: <Folder size={14} />,
  texture: <Image size={14} />,
  model: <Box size={14} />,
  audio: <Volume2 size={14} />,
  video: <Video size={14} />,
  script: <FileCode size={14} />,
  material: <Layers size={14} />,
  prefab: <Box size={14} />,
  scene: <Film size={14} />,
}

const SPECIAL_NAV_ITEMS = [
  { id: 'recent', label: 'Import Queue', icon: <img src="/icons/recently-imported.svg" alt="Import Queue" width={16} height={16} /> },
  { id: 'import-queue', label: 'Crossy Farm', icon: <img src="/icons/experience-folder.svg" alt="Crossy Farm" width={16} height={16} /> },
] as const

const INVENTORIES_NAV_ID = 'inventories'
const EHOPE_NAV_ID = 'ehopehopehope'

const SIDE_NAV_MIN = 220
const SIDE_NAV_MAX = 400
const SIDE_NAV_DEFAULT = 220

/** Accepted file extensions for import (excludes gif, pdf) */
const IMPORT_ACCEPT = '.gltf,.glb,.fbx,.obj,.dae,.mp3,.mp4,.m4a,.wav,.ogg,.aac,.flac,.mov,.webm,.avi,.mkv,.png,.jpg,.jpeg,.webp,.tga,.tif,.tiff,.bmp,.js,.ts,.cjs,.mjs,.mat,.prefab,.scene'

export function Assets() {
  const { assets, selectedAssetIds, selectAsset, importAssets } = useEditorStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNavId, setSelectedNavId] = useState<string | null>(null)
  const [projectExpanded, setProjectExpanded] = useState(true)
  const [crossyFarmExpanded, setCrossyFarmExpanded] = useState(true)
  const [inventoriesExpanded, setInventoriesExpanded] = useState(true)
  const [sideNavWidth, setSideNavWidth] = useState(SIDE_NAV_DEFAULT)
  const [assetViewMode, setAssetViewMode] = useState<'grid' | 'list'>('grid')
  const resizeStartRef = useRef({ x: 0, w: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const topLevelFolders = assets.filter((a): a is Asset => a.type === 'folder')
  const isSpecialNavId = (id: string | null): id is string =>
    id !== null && (SPECIAL_NAV_ITEMS.some((s) => s.id === id) || id === INVENTORIES_NAV_ID || id === EHOPE_NAV_ID)
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
  const assetsForGrid: Asset[] =
    selectedNavId === 'import-queue'
      ? assets
      : displayAssets.length === 1 && displayAssets[0].type === 'folder'
        ? displayAssets[0].children ?? []
        : displayAssets

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
                              onClick={() => setSelectedNavId(folder.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(folder.id)}
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
                {inventoriesExpanded && null}
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
            <div className={styles.contentRowSpacer} aria-hidden />
            <div className={styles.contentRowActions}>
              <IconButton icon={<img src="/icons/refresh.svg" alt="Import Asset" width={16} height={16} />} size="xs" tooltip="Import Asset" />
              <IconButton icon={<img src="/icons/filter.svg" alt="Filter" width={16} height={16} />} size="xs" tooltip="Filter" />
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={IMPORT_ACCEPT}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  if (files.length) importAssets(files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className={styles.importButton}
                title="Import"
                aria-label="Import"
                onClick={() => fileInputRef.current?.click()}
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
                      <th className={styles.contentTableTh}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayAssets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.contentTableEmpty}>
                          No assets
                        </td>
                      </tr>
                    ) : (
                      displayAssets.map((asset) => {
                        const isFolder = asset.type === 'folder'
                        const icon = isFolder ? <img src="/icons/folder.svg" alt="" width={16} height={16} /> : assetIcons[asset.type]
                        const displayName = asset.name === 'Sprites' ? 'Interior Props' : asset.name
                        return (
                          <tr key={asset.id} className={styles.contentTableRow}>
                            <td className={styles.contentTableTd}>
                              <span className={styles.contentTableAssetIcon}>{icon}</span>
                              <span>{displayName}</span>
                            </td>
                            <td className={styles.contentTableTd}>{isFolder ? '—' : asset.assetId}</td>
                            <td className={styles.contentTableTd}>—</td>
                            <td className={styles.contentTableTd}>—</td>
                            <td className={styles.contentTableTd}>—</td>
                            <td className={styles.contentTableTd}>—</td>
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
                        return (
                          <tr
                            key={asset.id}
                            className={`${styles.contentTableRow} ${isSelected ? styles.contentTableRowSelected : ''}`}
                            onClick={(e) => selectAsset(asset.id, { range: e.shiftKey, additive: e.metaKey || e.ctrlKey })}
                            onDoubleClick={isFolder ? () => setSelectedNavId(asset.id) : undefined}
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
                                viewMode="list"
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
                    const modelPath = asset.type === 'model' ? asset.path : undefined
                    const handleDoubleClick = asset.type === 'folder' ? () => setSelectedNavId(asset.id) : undefined
                    const isSelected = selectedAssetIds.includes(asset.id)
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
                        onSelect={(e) => selectAsset(asset.id, { range: e?.shiftKey, additive: e?.metaKey || e?.ctrlKey })}
                        onDoubleClick={handleDoubleClick}
                      />
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DockablePanel>
  )
}




