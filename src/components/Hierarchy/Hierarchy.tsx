import { useState } from 'react'
import {
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Box,
  Image,
  Grid2X2,
  Sparkles,
  FileCode,
  Volume2,
  Layers
} from 'lucide-react'
import { DockablePanel } from '../shared/DockablePanel'
import { ExpandDownIcon, ExpandRightIcon } from '../shared/ExpandIcons'
import { IconButton } from '../shared/IconButton'
import { ContextMenu, useContextMenu } from '../shared/ContextMenu'
import type { MenuItem } from '../shared/MenuDropdown'
import { useEditorStore } from '../../store/editorStore'
import type { GameObjectType } from '../../types'
import styles from './Hierarchy.module.css'

const typeIcons: Record<GameObjectType, React.ReactNode> = {
  empty: <Layers size={16} />,
  mesh: <Box size={16} />,
  light: <img src="/icons/terrain.svg" alt="Light" width={16} height={16} />,
  camera: <img src="/icons/camera.svg" alt="Camera" width={16} height={16} />,
  audio: <Volume2 size={16} />,
  sprite: <Image size={16} />,
  tilemap: <Grid2X2 size={16} />,
  particle: <Sparkles size={16} />,
  script: <FileCode size={16} />,
}


interface TreeNodeProps {
  objectId: string
  depth: number
}

function TreeNode({ objectId, depth }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { 
    gameObjects, 
    selectedObjectIds, 
    selectObject,
    updateGameObject,
    deleteGameObject,
    duplicateGameObject
  } = useEditorStore()
  
  const contextMenu = useContextMenu()
  
  const obj = gameObjects[objectId]
  if (!obj) return null

  const hasChildren = obj.children.length > 0
  const isSelected = selectedObjectIds.includes(objectId)
  const isWorkspaceRoot = obj.parentId === null && obj.name === 'Workspace'

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Select the object if not already selected
    if (!isSelected) {
      selectObject(objectId, { additive: false, range: false })
    }
    
    contextMenu.openContextMenu(e)
  }

  const contextMenuItems: MenuItem[] = [
    {
      label: 'Rename',
      onClick: () => {
        // TODO: Implement rename functionality
        console.log('Rename', objectId)
      },
      shortcut: 'F2'
    },
    {
      label: 'Duplicate',
      onClick: () => {
        duplicateGameObject(objectId)
      },
      shortcut: '⌘D'
    },
    { divider: true },
    {
      label: 'Copy',
      onClick: () => {
        // TODO: Implement copy functionality
        console.log('Copy', objectId)
      },
      shortcut: '⌘C'
    },
    {
      label: 'Paste',
      onClick: () => {
        // TODO: Implement paste functionality
        console.log('Paste', objectId)
      },
      shortcut: '⌘V'
    },
    { divider: true },
    {
      label: obj.visible ? 'Hide' : 'Show',
      onClick: () => {
        updateGameObject(objectId, { visible: !obj.visible })
      }
    },
    {
      label: obj.locked ? 'Unlock' : 'Lock',
      onClick: () => {
        updateGameObject(objectId, { locked: !obj.locked })
      }
    },
    { divider: true },
    {
      label: 'Delete',
      onClick: () => {
        deleteGameObject(objectId)
      },
      shortcut: 'Del'
    },
  ]

  return (
    <>
      <div
        className={`${styles.treeNode} ${isWorkspaceRoot ? styles.workspaceGroup : ''} ${hasChildren ? styles.hasChildrenGroup : ''}`}
        style={hasChildren ? ({ '--tree-line-left': `${depth * 16 + 16}px` } as React.CSSProperties) : undefined}
      >
        <div
          className={`${styles.nodeRow} ${isSelected ? styles.selected : ''} ${isSelected && hasChildren ? styles.selectedParent : ''} ${isSelected && !hasChildren ? styles.selectedChild : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={(e) => {
            // Don't select if it's a control+click for context menu
            if (e.ctrlKey && e.button === 0) {
              return
            }
            selectObject(objectId, {
              additive: e.ctrlKey || e.metaKey,
              range: e.shiftKey,
            })
          }}
          onContextMenu={handleContextMenu}
          onMouseDown={(e) => {
            // Handle control+click as context menu
            if (e.ctrlKey && e.button === 0) {
              handleContextMenu(e)
            }
          }}
        >
        <button 
          className={`${styles.expandBtn} ${!hasChildren ? styles.hidden : ''}`}
          onClick={toggleExpanded}
        >
          {hasChildren && (isExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />)}
        </button>

        <span className={styles.typeIcon}>
          {obj.parentId === null && obj.name === 'Workspace' ? (
            <img src="/icons/workspace.svg" alt="Workspace" width={16} height={16} />
          ) : obj.name === 'Drops' ? (
            <img src="/icons/folder.svg" alt="Drops" width={16} height={16} />
          ) : (
            typeIcons[obj.type]
          )}
        </span>

        <span className={`${styles.name} ${!obj.visible ? styles.dimmed : ''}`}>
          {obj.name}
        </span>

        <div className={styles.nodeActions}>
          <button 
            className={`${styles.actionBtn} ${!obj.visible ? styles.active : ''}`}
            onClick={toggleVisibility}
          >
            {obj.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button 
            className={`${styles.actionBtn} ${obj.locked ? styles.active : ''}`}
            onClick={toggleLock}
          >
            {obj.locked ? <Lock size={16} /> : <Unlock size={16} />}
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
    
    <ContextMenu
      items={contextMenuItems}
      isOpen={contextMenu.isOpen}
      position={contextMenu.position}
      onClose={contextMenu.closeContextMenu}
    />
  </>
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
    <DockablePanel
      widgetId="explorer"
      title="Explorer"
      icon={<Layers size={16} />}
      actions={
        <div className={styles.createWrapper}>
          <IconButton
            icon={<Plus size={16} />}
            tooltip="Create GameObject"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            size="sm"
            variant="ghost"
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
    </DockablePanel>
  )
}




