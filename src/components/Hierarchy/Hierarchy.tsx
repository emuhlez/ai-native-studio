import { useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Camera,
  Sun,
  Box,
  Image,
  Grid2X2,
  Sparkles,
  FileCode,
  Volume2,
  Layers
} from 'lucide-react'
import { Panel } from '../shared/Panel'
import { IconButton } from '../shared/IconButton'
import { useEditorStore } from '../../store/editorStore'
import type { GameObject, GameObjectType } from '../../types'
import styles from './Hierarchy.module.css'

const typeIcons: Record<GameObjectType, React.ReactNode> = {
  empty: <Layers size={14} />,
  mesh: <Box size={14} />,
  light: <Sun size={14} />,
  camera: <Camera size={14} />,
  audio: <Volume2 size={14} />,
  sprite: <Image size={14} />,
  tilemap: <Grid2X2 size={14} />,
  particle: <Sparkles size={14} />,
  script: <FileCode size={14} />,
}

interface TreeNodeProps {
  objectId: string
  depth: number
}

function TreeNode({ objectId, depth }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { 
    gameObjects, 
    selectedObjectId, 
    selectObject,
    updateGameObject 
  } = useEditorStore()
  
  const obj = gameObjects[objectId]
  if (!obj) return null

  const hasChildren = obj.children.length > 0
  const isSelected = selectedObjectId === objectId

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateGameObject(objectId, { visible: !obj.visible })
  }

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateGameObject(objectId, { locked: !obj.locked })
  }

  return (
    <div className={styles.treeNode}>
      <div
        className={`${styles.nodeRow} ${isSelected ? styles.selected : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => selectObject(objectId)}
      >
        <button 
          className={`${styles.expandBtn} ${!hasChildren ? styles.hidden : ''}`}
          onClick={toggleExpanded}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>

        <span className={styles.typeIcon}>
          {typeIcons[obj.type]}
        </span>

        <span className={`${styles.name} ${!obj.visible ? styles.dimmed : ''}`}>
          {obj.name}
        </span>

        <div className={styles.nodeActions}>
          <button 
            className={`${styles.actionBtn} ${!obj.visible ? styles.active : ''}`}
            onClick={toggleVisibility}
          >
            {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button 
            className={`${styles.actionBtn} ${obj.locked ? styles.active : ''}`}
            onClick={toggleLock}
          >
            {obj.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className={styles.children}>
          {obj.children.map((childId) => (
            <TreeNode key={childId} objectId={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Hierarchy() {
  const { rootObjectIds, createGameObject } = useEditorStore()
  const [showCreateMenu, setShowCreateMenu] = useState(false)

  const createOptions: { type: GameObjectType; label: string }[] = [
    { type: 'empty', label: 'Empty Object' },
    { type: 'mesh', label: 'Mesh' },
    { type: 'sprite', label: 'Sprite' },
    { type: 'camera', label: 'Camera' },
    { type: 'light', label: 'Light' },
    { type: 'audio', label: 'Audio Source' },
    { type: 'particle', label: 'Particle System' },
    { type: 'tilemap', label: 'Tilemap' },
  ]

  return (
    <Panel
      title="Hierarchy"
      icon={<Layers size={16} />}
      actions={
        <div className={styles.createWrapper}>
          <IconButton
            icon={<Plus size={16} />}
            tooltip="Create GameObject"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            size="sm"
          />
          {showCreateMenu && (
            <div className={styles.createMenu}>
              {createOptions.map((option) => (
                <button
                  key={option.type}
                  className={styles.createOption}
                  onClick={() => {
                    createGameObject(option.type)
                    setShowCreateMenu(false)
                  }}
                >
                  {typeIcons[option.type]}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div className={styles.tree}>
        {rootObjectIds.map((id) => (
          <TreeNode key={id} objectId={id} depth={0} />
        ))}
      </div>
    </Panel>
  )
}


