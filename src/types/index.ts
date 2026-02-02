export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Transform {
  position: Vector3
  rotation: Vector3
  scale: Vector3
}

export type GameObjectType = 
  | 'empty'
  | 'mesh'
  | 'light'
  | 'camera'
  | 'audio'
  | 'sprite'
  | 'tilemap'
  | 'particle'
  | 'script'

export interface GameObject {
  id: string
  name: string
  type: GameObjectType
  transform: Transform
  visible: boolean
  locked: boolean
  children: string[]
  parentId: string | null
  components: Component[]
}

export interface Component {
  id: string
  type: string
  enabled: boolean
  properties: Record<string, unknown>
}

export interface Asset {
  id: string
  name: string
  type: 'texture' | 'model' | 'audio' | 'video' | 'script' | 'material' | 'prefab' | 'scene' | 'folder'
  path: string
  thumbnail?: string
  children?: Asset[]
}

export interface ConsoleMessage {
  id: string
  type: 'info' | 'warning' | 'error' | 'log'
  message: string
  timestamp: Date
  source?: string
}

export interface ViewportSelectedAsset {
  name: string
}

export interface EditorState {
  selectedObjectIds: string[]
  selectedAssetId: string | null
  viewportSelectedAssetNames: string[]
  isPlaying: boolean
  isPaused: boolean
  activeTool: 'select' | 'move' | 'rotate' | 'scale'
  viewMode: '2d' | '3d'
  showGrid: boolean
  snapToGrid: boolean
  gridSize: number
}

export type DockZone = 'left' | 'center-top' | 'center-bottom' | 'right-top' | 'right-bottom'

export interface DockedWidget {
  id: string
  zone: DockZone
  order: number
}




