import { useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { Viewport3D } from './Viewport3D'
import styles from './Viewport.module.css'

export function Viewport() {
  const canvas3DRef = useRef<HTMLDivElement>(null)
  const {
    showGrid,
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

        {/* Grid overlay */}
        {showGrid && (
          <div className={styles.grid}>
            <svg width="100%" height="100%">
              <defs>
                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path 
                    d="M 20 0 L 0 0 0 20" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.03)" 
                    strokeWidth="0.5"
                  />
                </pattern>
                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#smallGrid)"/>
                  <path 
                    d="M 100 0 L 0 0 0 100" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.06)" 
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        )}

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





