import type { ReactNode } from 'react'
import styles from './Assets.module.css'

export interface AssetTileProps {
  id: string
  /** Display name (can differ from asset name, e.g. "Interior Props") */
  name: string
  /** Type label for sublabel (e.g. "Folder", "Texture") */
  typeLabel: string
  /** Icon shown in the preview area */
  icon: ReactNode
  isSelected: boolean
  onSelect: () => void
}

export function AssetTile({ name, typeLabel, icon, isSelected, onSelect }: AssetTileProps) {
  return (
    <div
      className={`${styles.assetTile} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className={styles.assetTilePreview}>{icon}</div>
      <span className={styles.assetTileLabel} title={name}>
        {name}
      </span>
      <span className={styles.assetTileSublabel}>{typeLabel}</span>
    </div>
  )
}
