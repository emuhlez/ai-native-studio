import { Router } from 'express'
import { streamText, convertToModelMessages } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildSystemPrompt } from '../../src/ai/system-prompt'
import { toolRegistry } from '../tools'
import type { ConversationMode } from '../../src/types'

export const chatRouter = Router()

chatRouter.post('/chat', async (req, res) => {
  const msgCount = req.body?.messages?.length ?? 0
  const mode = req.body?.mode
  const bodySize = JSON.stringify(req.body).length
  console.log(`[chat] Received request: ${msgCount} messages, mode=${mode}, body=${Math.round(bodySize / 1024)}KB`)

  try {
    const { messages, sceneContext, selectionContext, cameraContext } = req.body

    const systemPrompt = buildSystemPrompt({
      sceneContext: sceneContext ?? 'The scene is currently empty.',
      selectionContext: selectionContext ?? undefined,
      mode: (mode as ConversationMode) ?? undefined,
      cameraContext: cameraContext ?? undefined,
    })

    const modelMessages = await convertToModelMessages(messages)
    console.log('[chat] Converted', modelMessages.length, 'model messages, mode:', mode)

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: modelMessages,
      tools: toolRegistry.getTools(),
      maxSteps: 5,
    })

    result.pipeUIMessageStreamToResponse(res)
  } catch (error) {
    console.error('[chat] Error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: String(error) })
    }
  }
})
