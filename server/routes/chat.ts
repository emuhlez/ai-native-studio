import { Router } from 'express'
import { streamText, convertToModelMessages } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildSystemPrompt } from '../../src/ai/system-prompt'
import { toolRegistry } from '../tools'
import type { ConversationMode } from '../../src/types'

export const chatRouter = Router()

/**
 * Extract the text content from the last user message.
 * AI SDK v6 UIMessages use `parts` arrays, not a `content` string.
 */
function extractUserText(msg: Record<string, unknown>): string {
  // AI SDK v6 format: { role, parts: [{ type: 'text', text: '...' }] }
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: Record<string, unknown>) => p.type === 'text')
      .map((p: Record<string, unknown>) => p.text as string)
      .join(' ')
  }
  // Fallback: plain content string
  if (typeof msg.content === 'string') {
    return msg.content
  }
  // Fallback: content as array of parts
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p: Record<string, unknown>) => p.type === 'text')
      .map((p: Record<string, unknown>) => p.text as string)
      .join(' ')
  }
  return ''
}

/**
 * Detect if the latest user message is a complex/creative request that
 * should trigger a plan before any scene tools are called.
 */
function shouldForcePlan(messages: Array<Record<string, unknown>>): boolean {
  // Only force plan on the first user message (no prior assistant tool calls)
  const hasAssistantReply = messages.some((m) => m.role === 'assistant')
  if (hasAssistantReply) return false

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUserMsg) return false

  let text = extractUserText(lastUserMsg).toLowerCase()
  console.log('[chat] shouldForcePlan check, text:', JSON.stringify(text))

  if (!text) return false

  // Strip [Context: ...] brackets added by the viewport contextual input.
  // Use greedy .* to handle nested brackets like [1.52, 0, -4.85] inside the context.
  text = text.replace(/^\[context:.*\]\s*/i, '').trim()
  if (!text) return false

  // Pattern: "build/create/design/make" + something that isn't a single simple object
  const creativeVerbs = /\b(build|create|design|make|help me build|help me create|help me make|help me design)\b/
  const simpleObjects = /^(a |an |the )?(red |blue |green |big |small )?(cube|box|sphere|ball|cylinder|cone|torus|plane)\s*$/
  const cleaned = text.replace(creativeVerbs, '').trim()

  const result = creativeVerbs.test(text) && !simpleObjects.test(cleaned)
  console.log('[chat] shouldForcePlan result:', result)
  return result
}

chatRouter.post('/chat', async (req, res) => {
  const msgCount = req.body?.messages?.length ?? 0
  const mode = req.body?.mode
  const bodySize = JSON.stringify(req.body).length
  console.log(`[chat] Received request: ${msgCount} messages, mode=${mode}, body=${Math.round(bodySize / 1024)}KB`)

  try {
    const { messages, sceneContext, selectionContext, cameraContext, background } = req.body

    const systemPrompt = buildSystemPrompt({
      sceneContext: sceneContext ?? 'The scene is currently empty.',
      selectionContext: selectionContext ?? undefined,
      mode: (mode as ConversationMode) ?? undefined,
      cameraContext: cameraContext ?? undefined,
    })

    const modelMessages = await convertToModelMessages(messages)
    console.log('[chat] Converted', modelMessages.length, 'model messages, mode:', mode)

    const forcePlan = shouldForcePlan(messages)
    if (forcePlan) {
      console.log('[chat] Forcing createPlan tool for complex request')
    }

    // Use Haiku for background tasks (fast tool execution), Sonnet for conversations
    const model = background
      ? anthropic('claude-3-5-haiku-20241022')
      : anthropic('claude-sonnet-4-20250514')

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools: toolRegistry.getTools(),
      maxSteps: 5,
      maxTokens: background ? 512 : 1024,
      toolChoice: forcePlan ? { type: 'tool', toolName: 'createPlan' } : undefined,
    })

    result.pipeUIMessageStreamToResponse(res)
  } catch (error) {
    console.error('[chat] Error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: String(error) })
    }
  }
})
