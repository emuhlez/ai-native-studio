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
} from 'lucide-react'

import { ExpandDownIcon, ExpandRightIcon } from '../shared/ExpandIcons'
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
  video: <Video size={14} />,
  script: <FileCode size={14} />,
  material: <Layers size={14} />,
  prefab: <Box size={14} />,
  scene: <Film size={14} />,
}

const SPECIAL_NAV_ITEMS = [
  { id: 'recent', label: 'Import Queue', icon: <img src="/icons/recently-imported.svg" alt="Import Queue" width={16} height={16} /> },
  { id: 'import-queue', label: 'Experience Name', icon: <img src="/icons/experience-folder.svg" alt="Experience Name" width={16} height={16} /> },
] as const

const INVENTORIES_NAV_ID = 'inventories'
const EHOPE_NAV_ID = 'ehopehopehope'

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

/** Accepted file extensions for import (excludes gif, pdf) */
const IMPORT_ACCEPT = '.gltf,.glb,.fbx,.obj,.dae,.mp3,.mp4,.m4a,.wav,.ogg,.aac,.flac,.mov,.webm,.avi,.mkv,.png,.jpg,.jpeg,.webp,.tga,.tif,.tiff,.bmp,.js,.ts,.cjs,.mjs,.mat,.prefab,.scene'

export function Assets() {
  const { assets, importAssets } = useEditorStore()
  const [_viewMode, _setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNavId, setSelectedNavId] = useState<string | null>(null)
  const [projectExpanded, setProjectExpanded] = useState(true)
  const [inventoriesExpanded, setInventoriesExpanded] = useState(true)
  const [assetsExpanded, setAssetsExpanded] = useState(true)
  const [sideNavWidth, setSideNavWidth] = useState(SIDE_NAV_DEFAULT)
  const resizeStartRef = useRef({ x: 0, w: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setFolderExpanded = (folderName: string, expanded: boolean) => {
    if (folderName === 'Sprites') setAssetsExpanded(expanded)
  }
  const isTopFolderExpanded = (folderName: string) =>
    folderName === 'Sprites' ? assetsExpanded : false

  const topLevelFolders = assets.filter((a): a is Asset => a.type === 'folder')
  /* Only show Assets (Sprites) in side nav; Audio, Scripts, Materials, Prefabs, Scenes are not in side nav */
  const sideNavTopFolders = topLevelFolders.filter((f) => f.name === 'Sprites')
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
                    {SPECIAL_NAV_ITEMS.map((item) => {
                      const isExperienceName = item.id === 'import-queue'
                      return (
                        <div
                          key={item.id}
                          className={`${styles.sideNavRow} ${isExperienceName ? styles.sideNavRowWithChevron : ''} ${selectedNavId === item.id ? styles.sideNavRowSelected : ''}`}
                          style={{ paddingLeft: '24px' }}
                          onClick={() => setSelectedNavId(item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(item.id)}
                        >
                          <span className={styles.sideNavExpand} aria-hidden={!isExperienceName}>
                            {isExperienceName ? <ExpandDownIcon /> : null}
                          </span>
                          <span className={styles.sideNavIcon}>{item.icon}</span>
                          <span className={styles.sideNavName}>{item.label}</span>
                        </div>
                      )
                    })}
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
                    {sideNavTopFolders.map((folder) => {
                      const isAssetsRow = folder.name === 'Sprites'
                      const topExpanded = isTopFolderExpanded(folder.name)
                      return (
                        <div
                          key={folder.id}
                          className={`${styles.sideNavRow} ${styles.sideNavRowWithChevron} ${selectedNavId === folder.id ? styles.sideNavRowSelected : ''}`}
                          style={{ paddingLeft: '24px' }}
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
                              <img src="/icons/group-inventory.svg" alt="AlphaStrike" width={16} height={16} />
                            ) : (
                              topLevelFolderIcons[folder.name] ?? <Folder size={16} />
                            )}
                          </span>
                          <span className={styles.sideNavName}>
                            {isAssetsRow ? 'AlphaStrike' : folder.name}
                          </span>
                        </div>
                      )
                    })}
                    <div
                      className={`${styles.sideNavRow} ${styles.sideNavRowWithChevron} ${selectedNavId === EHOPE_NAV_ID ? styles.sideNavRowSelected : ''}`}
                      style={{ paddingLeft: '24px' }}
                      onClick={() => setSelectedNavId(EHOPE_NAV_ID)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedNavId(EHOPE_NAV_ID)}
                    >
                      <span className={styles.sideNavExpand}>
                        <ExpandDownIcon />
                      </span>
                      <span className={styles.sideNavIcon}>
                        <img src="/icons/inventory.svg" alt="ehopehopehope" width={16} height={16} />
                      </span>
                      <span className={styles.sideNavName}>ehopehopehope</span>
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
            <div className={styles.contentRowSpacer} aria-hidden />
            <div className={styles.contentRowActions}>
              <IconButton icon={<img src="/icons/refresh.svg" alt="Import Asset" width={16} height={16} />} size="xs" tooltip="Import Asset" />
              <IconButton icon={<img src="/icons/filter.svg" alt="Filter" width={16} height={16} />} size="xs" tooltip="Filter" />
              <IconButton icon={<img src="/icons/list-view.svg" alt="List view" width={16} height={16} />} size="xs" tooltip="List view" />
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
            <div className={styles.contentTableWrap}>
              <table className={styles.contentTable}>
              <thead>
                <tr>
                  <th className={styles.contentTableTh}>Asset</th>
                  <th className={styles.contentTableTh}>Creator</th>
                  <th className={styles.contentTableTh}>Import Preset</th>
                  <th className={styles.contentTableTh}>File Path</th>
                  <th className={styles.contentTableTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.contentTableEmpty}>
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
          </div>
        </div>
      </div>
    </DockablePanel>
  )
}




