import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { GameObject, Asset, ConsoleMessage, EditorState, GameObjectType, ViewportSelectedAsset } from '../types'

interface EditorStore extends EditorState {
  // Scene hierarchy
  gameObjects: Record<string, GameObject>
  rootObjectIds: string[]
  
  // Assets
  assets: Asset[]
  
  // Console
  consoleMessages: ConsoleMessage[]
  
  // Actions - Selection
  selectObject: (id: string | null) => void
  selectAsset: (id: string | null) => void
  setViewportSelectedAsset: (asset: ViewportSelectedAsset | null) => void
  
  // Actions - Scene
  createGameObject: (type: GameObjectType, name?: string, parentId?: string | null) => string
  addWorkspaceModel: (name: string) => string
  deleteGameObject: (id: string) => void
  updateGameObject: (id: string, updates: Partial<GameObject>) => void
  duplicateGameObject: (id: string) => void
  reparentGameObject: (id: string, newParentId: string | null) => void
  
  // Actions - Playmode
  play: () => void
  pause: () => void
  stop: () => void
  
  // Actions - Tools
  setActiveTool: (tool: EditorState['activeTool']) => void
  setViewMode: (mode: EditorState['viewMode']) => void
  toggleGrid: () => void
  toggleSnap: () => void
  
  // Actions - Console
  log: (message: string, type?: ConsoleMessage['type'], source?: string) => void
  clearConsole: () => void
}

const createDefaultTransform = () => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
})

const getDefaultName = (type: GameObjectType) => {
  const names: Record<GameObjectType, string> = {
    empty: 'Empty Object',
    mesh: 'Mesh',
    light: 'Light',
    camera: 'Camera',
    audio: 'Audio Source',
    sprite: 'Sprite',
    tilemap: 'Tilemap',
    particle: 'Particle System',
    script: 'Script',
  }
  return names[type]
}

// Initial demo scene
const createInitialScene = (): { objects: Record<string, GameObject>, rootIds: string[] } => {
  const workspaceId = uuid()
  const cameraId = uuid()
  const lightId = uuid()
  const environmentId = uuid()
  const groundId = uuid()
  const platformId = uuid()

  const objects: Record<string, GameObject> = {
    [workspaceId]: {
      id: workspaceId,
      name: 'Workspace',
      type: 'empty',
      transform: createDefaultTransform(),
      visible: true,
      locked: false,
      children: [cameraId, lightId, environmentId],
      parentId: null,
      components: [],
    },
    [cameraId]: {
      id: cameraId,
      name: 'Camera',
      type: 'camera',
      transform: { ...createDefaultTransform(), position: { x: 0, y: 0, z: -10 } },
      visible: true,
      locked: false,
      children: [],
      parentId: workspaceId,
      components: [],
    },
    [lightId]: {
      id: lightId,
      name: 'Terrain',
      type: 'light',
      transform: { ...createDefaultTransform(), rotation: { x: 50, y: -30, z: 0 } },
      visible: true,
      locked: false,
      children: [],
      parentId: workspaceId,
      components: [],
    },
    [environmentId]: {
      id: environmentId,
      name: 'Drops',
      type: 'empty',
      transform: createDefaultTransform(),
      visible: true,
      locked: false,
      children: [groundId, platformId],
      parentId: workspaceId,
      components: [],
    },
    [groundId]: {
      id: groundId,
      name: 'Ground',
      type: 'tilemap',
      transform: { ...createDefaultTransform(), position: { x: 0, y: -3, z: 0 } },
      visible: true,
      locked: false,
      children: [],
      parentId: environmentId,
      components: [],
    },
    [platformId]: {
      id: platformId,
      name: 'Platform',
      type: 'mesh',
      transform: { ...createDefaultTransform(), position: { x: 3, y: 1, z: 0 } },
      visible: true,
      locked: false,
      children: [],
      parentId: environmentId,
      components: [],
    },
  }

  return {
    objects,
    rootIds: [workspaceId],
  }
}

const initialScene = createInitialScene()

// Initial demo assets
const initialAssets: Asset[] = [
  {
    id: uuid(),
    name: 'Sprites',
    type: 'folder',
    path: '/Sprites',
    children: [
      { id: uuid(), name: 'player_idle.png', type: 'texture', path: '/Sprites/player_idle.png' },
      { id: uuid(), name: 'player_run.png', type: 'texture', path: '/Sprites/player_run.png' },
      { id: uuid(), name: 'enemy.png', type: 'texture', path: '/Sprites/enemy.png' },
    ],
  },
  {
    id: uuid(),
    name: 'Audio',
    type: 'folder',
    path: '/Audio',
    children: [
      { id: uuid(), name: 'jump.wav', type: 'audio', path: '/Audio/jump.wav' },
      { id: uuid(), name: 'background.mp3', type: 'audio', path: '/Audio/background.mp3' },
    ],
  },
  {
    id: uuid(),
    name: 'Scripts',
    type: 'folder',
    path: '/Scripts',
    children: [
      { id: uuid(), name: 'PlayerController.ts', type: 'script', path: '/Scripts/PlayerController.ts' },
      { id: uuid(), name: 'EnemyAI.ts', type: 'script', path: '/Scripts/EnemyAI.ts' },
    ],
  },
  {
    id: uuid(),
    name: 'Materials',
    type: 'folder',
    path: '/Materials',
    children: [
      { id: uuid(), name: 'Ground.mat', type: 'material', path: '/Materials/Ground.mat' },
    ],
  },
  {
    id: uuid(),
    name: 'Prefabs',
    type: 'folder',
    path: '/Prefabs',
    children: [
      { id: uuid(), name: 'Enemy.prefab', type: 'prefab', path: '/Prefabs/Enemy.prefab' },
      { id: uuid(), name: 'Coin.prefab', type: 'prefab', path: '/Prefabs/Coin.prefab' },
    ],
  },
  {
    id: uuid(),
    name: 'Scenes',
    type: 'folder',
    path: '/Scenes',
    children: [
      { id: uuid(), name: 'MainMenu.scene', type: 'scene', path: '/Scenes/MainMenu.scene' },
      { id: uuid(), name: 'Level1.scene', type: 'scene', path: '/Scenes/Level1.scene' },
    ],
  },
]

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  selectedObjectId: null,
  selectedAssetId: null,
  viewportSelectedAsset: null,
  isPlaying: false,
  isPaused: false,
  activeTool: 'select',
  viewMode: '3d',
  showGrid: true,
  snapToGrid: true,
  gridSize: 1,
  
  gameObjects: initialScene.objects,
  rootObjectIds: initialScene.rootIds,
  assets: initialAssets,
  consoleMessages: [],
  
  // Selection
  selectObject: (id) => set({ selectedObjectId: id, viewportSelectedAsset: null }),
  selectAsset: (id) => set({ selectedAssetId: id }),
  setViewportSelectedAsset: (asset) => {
    if (!asset) {
      set({ viewportSelectedAsset: null, selectedObjectId: null })
      return
    }
    const state = get()
    const workspaceId = state.rootObjectIds[0]
    const workspace = state.gameObjects[workspaceId]
    const matchingId = workspace?.children.find((id) => state.gameObjects[id]?.name === asset.name) ?? null
    set({ viewportSelectedAsset: asset, selectedObjectId: matchingId })
  },
  
  // Scene manipulation
  createGameObject: (type, name, parentId = null) => {
    const id = uuid()
    const gameObject: GameObject = {
      id,
      name: name || getDefaultName(type),
      type,
      transform: createDefaultTransform(),
      visible: true,
      locked: false,
      children: [],
      parentId,
      components: [],
    }
    
    set((state) => {
      const newObjects = { ...state.gameObjects, [id]: gameObject }
      let newRootIds = state.rootObjectIds
      
      if (parentId) {
        const parent = newObjects[parentId]
        if (parent) {
          newObjects[parentId] = {
            ...parent,
            children: [...parent.children, id],
          }
        }
      } else {
        newRootIds = [...state.rootObjectIds, id]
      }
      
      return { gameObjects: newObjects, rootObjectIds: newRootIds, selectedObjectId: id }
    })
    
    get().log(`Created ${gameObject.name}`, 'info')
    return id
  },

  addWorkspaceModel: (name) => {
    const state = get()
    const workspaceId = state.rootObjectIds[0]
    const workspace = state.gameObjects[workspaceId]
    if (!workspace) return ''
    const existing = workspace.children.find((id) => state.gameObjects[id]?.name === name)
    if (existing) return existing
    return get().createGameObject('mesh', name, workspaceId)
  },

  deleteGameObject: (id) => {
    const state = get()
    const obj = state.gameObjects[id]
    if (!obj) return
    
    // Recursively collect all children to delete
    const collectChildren = (objId: string): string[] => {
      const object = state.gameObjects[objId]
      if (!object) return []
      return [objId, ...object.children.flatMap(collectChildren)]
    }
    
    const toDelete = collectChildren(id)
    
    set((state) => {
      const newObjects = { ...state.gameObjects }
      toDelete.forEach((deleteId) => delete newObjects[deleteId])
      
      // Remove from parent's children
      if (obj.parentId && newObjects[obj.parentId]) {
        newObjects[obj.parentId] = {
          ...newObjects[obj.parentId],
          children: newObjects[obj.parentId].children.filter((childId) => childId !== id),
        }
      }
      
      // Remove from root if it was a root object
      const newRootIds = state.rootObjectIds.filter((rootId) => rootId !== id)
      
      return {
        gameObjects: newObjects,
        rootObjectIds: newRootIds,
        selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
      }
    })
    
    get().log(`Deleted ${obj.name}`, 'info')
  },
  
  updateGameObject: (id, updates) => {
    set((state) => ({
      gameObjects: {
        ...state.gameObjects,
        [id]: { ...state.gameObjects[id], ...updates },
      },
    }))
  },
  
  duplicateGameObject: (id) => {
    const state = get()
    const obj = state.gameObjects[id]
    if (!obj) return
    
    const newId = state.createGameObject(obj.type, `${obj.name} (Copy)`, obj.parentId)
    state.updateGameObject(newId, {
      transform: { ...obj.transform },
      visible: obj.visible,
      components: [...obj.components],
    })
  },
  
  reparentGameObject: (id, newParentId) => {
    set((state) => {
      const obj = state.gameObjects[id]
      if (!obj) return state
      
      const newObjects = { ...state.gameObjects }
      
      // Remove from old parent
      if (obj.parentId && newObjects[obj.parentId]) {
        newObjects[obj.parentId] = {
          ...newObjects[obj.parentId],
          children: newObjects[obj.parentId].children.filter((childId) => childId !== id),
        }
      }
      
      // Update root IDs
      let newRootIds = state.rootObjectIds.filter((rootId) => rootId !== id)
      
      // Add to new parent
      if (newParentId && newObjects[newParentId]) {
        newObjects[newParentId] = {
          ...newObjects[newParentId],
          children: [...newObjects[newParentId].children, id],
        }
      } else {
        newRootIds = [...newRootIds, id]
      }
      
      // Update object's parent reference
      newObjects[id] = { ...obj, parentId: newParentId }
      
      return { gameObjects: newObjects, rootObjectIds: newRootIds }
    })
  },
  
  // Playmode
  play: () => {
    set({ isPlaying: true, isPaused: false })
    get().log('Entered Play Mode', 'info', 'Editor')
  },
  pause: () => {
    set({ isPaused: true })
    get().log('Paused', 'info', 'Editor')
  },
  stop: () => {
    set({ isPlaying: false, isPaused: false })
    get().log('Stopped Play Mode', 'info', 'Editor')
  },
  
  // Tools
  setActiveTool: (tool) => set({ activeTool: tool }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleSnap: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  
  // Console
  log: (message, type = 'log', source) => {
    set((state) => ({
      consoleMessages: [
        ...state.consoleMessages,
        {
          id: uuid(),
          type,
          message,
          timestamp: new Date(),
          source,
        },
      ],
    }))
  },
  clearConsole: () => set({ consoleMessages: [] }),
}))





