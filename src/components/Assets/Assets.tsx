import { useState } from 'react'
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
  Search,
  Grid2X2,
  List
} from 'lucide-react'
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

export function Assets() {
  const { assets } = useEditorStore()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <DockablePanel
      widgetId="assets"
      title="Assets"
      icon={<Folder size={16} />}
      actions={
        <div className={styles.actions}>
          <div className={styles.searchWrapper}>
            <Search size={12} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
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
      <div className={styles.content}>
        {viewMode === 'list' ? (
          <div className={styles.tree}>
            {assets.map((asset) => (
              <AssetItem key={asset.id} asset={asset} depth={0} viewMode={viewMode} />
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {assets.map((asset) => (
              <AssetItem key={asset.id} asset={asset} depth={0} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </DockablePanel>
  )
}




