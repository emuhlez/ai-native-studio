import { tool } from 'ai'
import { z } from 'zod'

export const createPlanTool = tool({
  description:
    'Create a structured plan with to-do items for a complex request. You MUST call this tool BEFORE any other tools when the user asks for something that requires multiple steps (e.g. "build an obby", "help me build a game", "design a level", "create a forest scene"). After calling this tool, STOP and wait for user approval — do NOT call addObject or any other scene tools.',
  inputSchema: z.object({
    todos: z
      .array(
        z.object({
          label: z.string().describe('Short description of the task'),
          category: z
            .string()
            .optional()
            .describe('Category prefix (e.g. "World", "Logic", "Items")'),
        })
      )
      .describe('The list of to-do items in execution order'),
  }),
})
