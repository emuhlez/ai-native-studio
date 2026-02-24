import { executeAddObject, type AddObjectArgs } from './tools/add-object'
import { executeRemoveObject, type RemoveObjectArgs } from './tools/remove-object'
import { executeTransformObject, type TransformObjectArgs } from './tools/transform-object'
import { executeSetMaterial, type SetMaterialArgs } from './tools/set-material'
import { usePlanStore } from '../store/planStore'
import type { PlanTodo } from '../types'

interface CreatePlanArgs {
  todos: PlanTodo[]
}

export function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  toolCallId?: string
): unknown {
  switch (toolName) {
    case 'addObject':
      return executeAddObject(args as unknown as AddObjectArgs)
    case 'removeObject':
      return executeRemoveObject(args as unknown as RemoveObjectArgs)
    case 'transformObject':
      return executeTransformObject(args as unknown as TransformObjectArgs)
    case 'setMaterial':
      return executeSetMaterial(args as unknown as SetMaterialArgs)
    case 'createPlan': {
      const planArgs = args as unknown as CreatePlanArgs
      const id = toolCallId || `plan-${Date.now()}`
      usePlanStore.getState().setPlan(id, { todos: planArgs.todos })
      return { status: 'plan_created', todoCount: planArgs.todos.length }
    }
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}
