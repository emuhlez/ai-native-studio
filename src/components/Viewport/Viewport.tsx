import { useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { Viewport3D } from './Viewport3D'
import styles from './Viewport.module.css'

export function Viewport() {
  const canvas3DRef = useRef<HTMLDivElement>(null)
  const {
    isPlaying,
    selectedObjectIds,
    gameObjects,
    viewportSelectedAssetNames,
  } = useEditorStore()
  const primaryId = selectedObjectIds.length > 0 ? selectedObjectIds[selectedObjectIds.length - 1] : null
  const selectedObject = primaryId ? gameObjects[primaryId] : null
  const primaryName =
    viewportSelectedAssetNames.length > 0
      ? viewportSelectedAssetNames[viewportSelectedAssetNames.length - 1]
      : selectedObject?.name ?? null
  const hasMulti = selectedObjectIds.length > 1 || viewportSelectedAssetNames.length > 1
  const displaySelection =
    primaryName != null
      ? { name: primaryName, count: hasMulti ? Math.max(selectedObjectIds.length, viewportSelectedAssetNames.length) : 1 }
      : null

  return (
    <div className={styles.viewport}>
      <div className={styles.canvas}>
        {/* 3D workspace – assets from /3d-space */}
        <div ref={canvas3DRef} className={styles.canvas3D} aria-hidden />
        <Viewport3D containerRef={canvas3DRef} />

        {/* Center crosshair */}
        <div className={styles.origin}>
          <div className={styles.originX} />
          <div className={styles.originY} />
        </div>

        {isPlaying && (
          <div className={styles.info}>
            <span className={styles.playingBadge}>▶ Playing</span>
          </div>
        )}
      </div>
    </div>
  )
}





