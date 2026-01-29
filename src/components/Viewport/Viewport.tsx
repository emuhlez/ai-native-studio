import { useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { Viewport3D } from './Viewport3D'
import styles from './Viewport.module.css'

export function Viewport() {
  const canvas3DRef = useRef<HTMLDivElement>(null)
  const {
    isPlaying,
    selectedObjectId,
    gameObjects,
    viewportSelectedAsset,
  } = useEditorStore()
  const selectedObject = selectedObjectId ? gameObjects[selectedObjectId] : null
  const displaySelection = viewportSelectedAsset ?? (selectedObject ? { name: selectedObject.name } : null)

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

        {/* Selection info – hierarchy object or viewport 3D asset */}
        {displaySelection && (
          <div className={styles.selectionInfo}>
            <span className={styles.selectionName}>{displaySelection.name}</span>
            {selectedObject && (
              <span className={styles.selectionCoords}>
                ({selectedObject.transform.position.x.toFixed(1)}, 
                {selectedObject.transform.position.y.toFixed(1)}, 
                {selectedObject.transform.position.z.toFixed(1)})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}





