import { tool } from 'ai'
import { z } from 'zod'

export const addObjectTool = tool({
  description:
    'Add a new 3D primitive object to the scene. Returns the created object\'s ID and name.',
  inputSchema: z.object({
    name: z
      .string()
      .describe("Display name for the object (e.g., 'Red Cube')"),
    primitive: z
      .enum(['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'])
      .describe('The primitive geometry type'),
    position: z
      .tuple([z.number(), z.number(), z.number()])
      .optional()
      .describe('World position [x, y, z]. Default is [0, 0, 0].'),
    color: z
      .string()
      .optional()
      .describe("Hex color string (e.g., '#ff0000'). Default is gray."),
    metalness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Metalness factor 0-1. Default is 0.'),
    roughness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Roughness factor 0-1. Default is 0.5.'),
  }),
})
