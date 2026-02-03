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
  selectObject: (id: string | null, options?: { additive?: boolean; range?: boolean }) => void
  selectAsset: (id: string | null) => void
  setViewportSelectedAsset: (asset: ViewportSelectedAsset | null, options?: { additive?: boolean }) => void
  
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

  // Actions - Assets
  importAssets: (files: File[]) => void
}

const createDefaultTransform = () => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
})

const createDefaultPivot = () => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
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
      pivot: createDefaultPivot(),
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
      pivot: createDefaultPivot(),
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
      pivot: createDefaultPivot(),
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
      pivot: createDefaultPivot(),
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
      pivot: createDefaultPivot(),
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
      pivot: createDefaultPivot(),
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
  selectedObjectIds: [],
  selectedAssetId: null,
  viewportSelectedAssetNames: [],
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
  selectObject: (id, options) => {
    if (id == null) {
      set({ selectedObjectIds: [], viewportSelectedAssetNames: [] })
      return
    }
    const state = get()
    const workspaceId = state.rootObjectIds[0]
    const workspace = state.gameObjects[workspaceId]

    const getFlatTreeOrder = (): string[] => {
      const order: string[] = []
      const walk = (ids: string[]) => {
        ids.forEach((objId) => {
          order.push(objId)
          const obj = state.gameObjects[objId]
          if (obj?.children.length) walk(obj.children)
        })
      }
      walk(state.rootObjectIds)
      return order
    }

    const idsToNames = (ids: string[]) =>
      ids
        .map((objId) => workspace?.children.includes(objId) ? state.gameObjects[objId]?.name : null)
        .filter((n): n is string => n != null)

    const namesToIds = (names: string[]) =>
      names
        .map((name) => workspace?.children.find((cid) => state.gameObjects[cid]?.name === name))
        .filter((id): id is string => id != null)

    if (options?.range && state.selectedObjectIds.length > 0) {
      const flat = getFlatTreeOrder()
      const lastId = state.selectedObjectIds[state.selectedObjectIds.length - 1]
      const lastIdx = flat.indexOf(lastId)
      const clickIdx = flat.indexOf(id)
      if (lastIdx === -1 || clickIdx === -1) {
        set({ selectedObjectIds: [id], viewportSelectedAssetNames: idsToNames([id]) })
        return
      }
      const [lo, hi] = lastIdx < clickIdx ? [lastIdx, clickIdx] : [clickIdx, lastIdx]
      const rangeIds = flat.slice(lo, hi + 1)
      set({ selectedObjectIds: rangeIds, viewportSelectedAssetNames: idsToNames(rangeIds) })
      return
    }

    if (options?.additive) {
      const has = state.selectedObjectIds.includes(id)
      const newIds = has
        ? state.selectedObjectIds.filter((x) => x !== id)
        : [...state.selectedObjectIds, id]
      set({ selectedObjectIds: newIds, viewportSelectedAssetNames: idsToNames(newIds) })
      return
    }

    set({ selectedObjectIds: [id], viewportSelectedAssetNames: idsToNames([id]) })
  },
  selectAsset: (id) => set({ selectedAssetId: id }),
  setViewportSelectedAsset: (asset, options) => {
    if (!asset) {
      set({ viewportSelectedAssetNames: [], selectedObjectIds: [] })
      return
    }
    const state = get()
    const workspaceId = state.rootObjectIds[0]
    const workspace = state.gameObjects[workspaceId]
    const matchingId = workspace?.children.find((cid) => state.gameObjects[cid]?.name === asset.name) ?? null

    const namesToIds = (names: string[]) =>
      names
        .map((name) => workspace?.children.find((cid) => state.gameObjects[cid]?.name === name))
        .filter((id): id is string => id != null)

    const idsToNames = (ids: string[]) =>
      ids
        .map((objId) => workspace?.children.includes(objId) ? state.gameObjects[objId]?.name : null)
        .filter((n): n is string => n != null)

    if (options?.additive) {
      const has = state.viewportSelectedAssetNames.includes(asset.name)
      const newNames = has
        ? state.viewportSelectedAssetNames.filter((n) => n !== asset.name)
        : [...state.viewportSelectedAssetNames, asset.name]
      const newIds = namesToIds(newNames)
      set({ viewportSelectedAssetNames: newNames, selectedObjectIds: newIds })
      return
    }

    set({
      viewportSelectedAssetNames: [asset.name],
      selectedObjectIds: matchingId ? [matchingId] : [],
    })
  },
  
  // Scene manipulation
  createGameObject: (type, name, parentId = null) => {
    const id = uuid()
    const gameObject: GameObject = {
      id,
      name: name || getDefaultName(type),
      type,
      transform: createDefaultTransform(),
      pivot: createDefaultPivot(),
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
      
      return { gameObjects: newObjects, rootObjectIds: newRootIds, selectedObjectIds: [id] }
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
        selectedObjectIds: state.selectedObjectIds.filter((x) => x !== id),
      }
    })
    
    get().log(`Deleted ${obj.name}`, 'info')
  },
  
  updateGameObject: (id, updates) => {
    set((state) => {
      const next = {
        gameObjects: {
          ...state.gameObjects,
          [id]: { ...state.gameObjects[id], ...updates },
        },
      }
      if (updates.name != null) {
        const oldName = state.gameObjects[id]?.name
        if (oldName && state.viewportSelectedAssetNames.includes(oldName)) {
          next.viewportSelectedAssetNames = state.viewportSelectedAssetNames.map(
            (n) => (n === oldName ? updates.name as string : n)
          )
        }
      }
      return next
    })
  },
  
  duplicateGameObject: (id) => {
    const state = get()
    const obj = state.gameObjects[id]
    if (!obj) return
    
    const newId = state.createGameObject(obj.type, `${obj.name} (Copy)`, obj.parentId)
    state.updateGameObject(newId, {
      transform: { ...obj.transform },
      pivot: obj.pivot ? { ...obj.pivot } : createDefaultPivot(),
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

  // Assets
  importAssets: (files) => {
    const EXCLUDED_EXT = new Set(['.gif', '.pdf'])
    const EXT_TO_TYPE: Record<string, Asset['type']> = {
      '.gltf': 'model', '.glb': 'model', '.fbx': 'model', '.obj': 'model', '.dae': 'model',
      '.mp3': 'audio', '.mp4': 'audio', '.m4a': 'audio', '.wav': 'audio', '.ogg': 'audio', '.aac': 'audio', '.flac': 'audio',
      '.mov': 'video', '.webm': 'video', '.avi': 'video', '.mkv': 'video',
      '.png': 'texture', '.jpg': 'texture', '.jpeg': 'texture', '.webp': 'texture', '.tga': 'texture', '.tif': 'texture', '.tiff': 'texture', '.bmp': 'texture',
      '.js': 'script', '.ts': 'script', '.cjs': 'script', '.mjs': 'script',
      '.mat': 'material',
      '.prefab': 'prefab',
      '.scene': 'scene',
    }
    const TYPE_TO_FOLDER: Record<Asset['type'], string> = {
      texture: 'Sprites', model: 'Models', audio: 'Audio', video: 'Videos',
      script: 'Scripts', material: 'Materials', prefab: 'Prefabs', scene: 'Scenes', folder: 'Sprites',
    }

    const toAdd: { file: File; type: Asset['type'] }[] = []
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase() ?? ''
      if (EXCLUDED_EXT.has(ext)) continue
      const type = EXT_TO_TYPE[ext]
      if (!type) continue
      toAdd.push({ file, type })
    }
    if (toAdd.length === 0) return

    set((state) => {
      const assets = state.assets.map((a) => ({ ...a, children: a.children ? [...a.children] : [] }))
      const ensureFolder = (name: string): Asset => {
        let folder = assets.find((a) => a.type === 'folder' && a.name === name)
        if (!folder) {
          folder = { id: uuid(), name, type: 'folder', path: `/${name}`, children: [] }
          assets.push(folder)
        }
        return folder
      }

      for (const { file, type } of toAdd) {
        const folderName = TYPE_TO_FOLDER[type]
        const folder = ensureFolder(folderName)
        const path = `${folder.path}/${file.name}`
        const child: Asset = {
          id: uuid(),
          name: file.name,
          type,
          path,
        }
        folder.children = [...(folder.children ?? []), child]
      }
      return { assets }
    })
  },
}))





