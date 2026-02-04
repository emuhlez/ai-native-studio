import { useState, type ReactNode } from 'react'
import styles from './Assets.module.css'
import { ModelPreview } from './ModelPreview'

export interface AssetTileProps {
  id: string
  /** Display name (can differ from asset name, e.g. "Interior Props") */
  name: string
  /** Type label for sublabel (e.g. "Folder", "Texture") */
  typeLabel: string
  /** Icon shown in the preview area when no texture image or on image error */
  icon: ReactNode
  /** Image URL for texture assets – required for textures; shown in preview. Empty string for non-textures. */
  previewImageUrl: string
  /** Path to 3D model file for live preview */
  modelPath?: string
  isSelected: boolean
  onSelect: () => void
}

export function AssetTile({ name, typeLabel, icon, previewImageUrl, modelPath, isSelected, onSelect }: AssetTileProps) {
  const [imageError, setImageError] = useState(false)
  const showTexture = previewImageUrl.length > 0 && !imageError
  const showModel = modelPath && modelPath.length > 0

  return (
    <div
      className={`${styles.assetTile} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className={styles.assetTilePreview}>
        {showModel ? (
          <ModelPreview modelPath={modelPath} className={styles.assetTilePreviewTexture} />
        ) : showTexture ? (
          <img
            src={previewImageUrl}
            alt=""
            className={styles.assetTilePreviewTexture}
            onError={() => setImageError(true)}
          />
        ) : (
          icon
        )}
      </div>
      <span className={styles.assetTileLabel} title={name}>
        {name}
      </span>
      <span className={styles.assetTileSublabel}>{typeLabel}</span>
    </div>
  )
}
