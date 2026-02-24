import { useEditorStore } from '../../store/editorStore'
import { useDockingStore } from '../../store/dockingStore'
import type { GameObject } from '../../types'

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
  const workspaceId = store.rootObjectIds[0]

  // Build all updates upfront
  const updates: Partial<GameObject> = {
    primitiveType: args.primitive,
  }

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

  const [px, py, pz] = args.position ?? [0, 0, 0]

  // Single batched store update: create + configure + select + creation effect
  const id = store.createAndConfigureObject(
    'mesh',
    args.name,
    workspaceId,
    updates,
    { x: px, y: py, z: pz },
  )

  // Open Properties panel and request viewport focus (deferred, no store churn)
  useDockingStore.getState().setInspectorBodyCollapsed(false)
  setTimeout(() => {
    useEditorStore.getState().setRequestFocusSelection(true)
  }, 150)

  store.log(`AI: Created "${args.name}" (${args.primitive})`, 'info', 'AI Agent')

  return { id, name: args.name }
}
