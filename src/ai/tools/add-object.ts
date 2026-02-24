import { useEditorStore } from '../../store/editorStore'
import { useDockingStore } from '../../store/dockingStore'

export interface AddObjectArgs {
  name: string
  primitive: string
  position?: [number, number, number]
  color?: string
  metalness?: number
  roughness?: number
}

export function executeAddObject(args: AddObjectArgs): { id: string; name: string } {
  console.log('[executeAddObject] args:', args)
  const store = useEditorStore.getState()

  // Find the workspace (first root object) to parent new objects under it
  const workspaceId = store.rootObjectIds[0]

  const id = store.createGameObject('mesh', args.name, workspaceId)

  // Build updates from tool args
  const updates: Record<string, unknown> = {}

  // Store the primitive type so the viewport can render the correct geometry
  updates.primitiveType = args.primitive

  if (args.position) {
    updates.transform = {
      position: { x: args.position[0], y: args.position[1], z: args.position[2] },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    }
  }

  if (args.color) {
    updates.color = args.color
  }

  if (args.metalness !== undefined) {
    updates.reflectance = args.metalness
  }

  if (Object.keys(updates).length > 0) {
    store.updateGameObject(id, updates)
  }

  // Select the newly created object
  store.selectObject(id)

  // Open Properties panel and request viewport to focus on the new object
  useDockingStore.getState().setInspectorBodyCollapsed(false)
  setTimeout(() => {
    useEditorStore.getState().setRequestFocusSelection(true)
  }, 150)

  // Trigger particle burst at creation position
  const [px, py, pz] = args.position ?? [0, 0, 0]
  store.setCreationEffectPosition({ x: px, y: py, z: pz })

  store.log(`AI: Created "${args.name}" (${args.primitive})`, 'info', 'AI Agent')

  return { id, name: args.name }
}
