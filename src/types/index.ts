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
  pivot?: { position: Vector3; rotation: Vector3 }
  visible: boolean
  locked: boolean
  children: string[]
  parentId: string | null
  components: Component[]
  /** Override texture source filename (e.g. from file picker) */
  texturePath?: string
  /** Object URL for user-selected mesh file (replaces asset from /3d-space) */
  meshUrl?: string
  /** Filename of user-selected mesh (e.g. "MyModel.glb") for display */
  meshFilename?: string
  /** Render fidelity: Automatic | Low | Medium | High */
  renderFidelity?: 'Automatic' | 'Low' | 'Medium' | 'High'
  /** Render both sides of mesh faces */
  doubleSided?: boolean
  /** Tint color (hex, e.g. #ffffff) */
  color?: string
  /** Material name (e.g. Plastic) */
  material?: string
  /** Reflectance 0–1 */
  reflectance?: number
  /** Transparency 0–1 */
  transparency?: number
  /** Cast shadow */
  castShadow?: boolean
  /** Physics: anchored */
  anchored?: boolean
  /** Physics: can collide */
  canCollide?: boolean
  /** Physics: can touch */
  canTouch?: boolean
  /** Physics: collision group */
  collisionGroup?: string
  /** Physics: fluid forces */
  fluidForces?: boolean
  /** Physics: massless */
  massless?: boolean
  /** Import: source path */
  importPath?: string
  /** Import only as model */
  importOnlyAsModel?: boolean
  /** Upload to Roblox */
  uploadToRoblox?: boolean
  /** Import as package */
  importAsPackage?: boolean
  /** Rig type */
  rigType?: string
  /** World forward axis */
  worldForward?: string
  /** World up axis */
  worldUp?: string
  /** Scale unit */
  scaleUnit?: string
  /** Merge meshes */
  mergeMeshes?: boolean
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
  assetId?: string
  dateModified?: string
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




