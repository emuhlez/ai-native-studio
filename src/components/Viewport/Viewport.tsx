import { useEditorStore } from '../../store/editorStore'
import styles from './Viewport.module.css'

export function Viewport() {
  const { viewMode, showGrid, isPlaying, selectedObjectId, gameObjects } = useEditorStore()
  const selectedObject = selectedObjectId ? gameObjects[selectedObjectId] : null

  return (
    <div className={styles.viewport}>
      <div className={styles.canvas}>
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

        {/* Demo objects visualization */}
        <div className={styles.sceneObjects}>
          <div className={styles.demoPlayer} style={{ transform: 'translate(0, 0)' }}>
            <div className={styles.objectMarker} data-selected={selectedObject?.name === 'Player'}>
              <span>Player</span>
            </div>
          </div>
          
          <div className={styles.demoGround}>
            <div className={styles.groundTiles} />
          </div>
          
          <div className={styles.demoPlatform}>
            <div className={styles.objectMarker} data-selected={selectedObject?.name === 'Platform'}>
              <span>Platform</span>
            </div>
          </div>
        </div>

        {/* Viewport info overlay */}
        <div className={styles.info}>
          <span className={styles.viewLabel}>{viewMode.toUpperCase()} View</span>
          {isPlaying && <span className={styles.playingBadge}>▶ Playing</span>}
        </div>

        {/* Gizmo hint */}
        <div className={styles.gizmoHint}>
          <div className={styles.axisIndicator}>
            <div className={styles.axisX}>X</div>
            <div className={styles.axisY}>Y</div>
            {viewMode === '3d' && <div className={styles.axisZ}>Z</div>}
          </div>
        </div>

        {/* Selection info */}
        {selectedObject && (
          <div className={styles.selectionInfo}>
            <span className={styles.selectionName}>{selectedObject.name}</span>
            <span className={styles.selectionCoords}>
              ({selectedObject.transform.position.x.toFixed(1)}, 
              {selectedObject.transform.position.y.toFixed(1)}, 
              {selectedObject.transform.position.z.toFixed(1)})
            </span>
          </div>
        )}
      </div>
    </div>
  )
}


