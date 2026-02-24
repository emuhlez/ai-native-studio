import { useRef, useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useDockingStore } from '../../store/dockingStore'
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore'
import { useAgentChat } from '../../ai/use-agent-chat'
import { PenToolbar } from './PenToolbar'
import { renderAllStrokes, renderStroke, type Stroke, type Point, type DrawingTool } from './drawing-engine'
import styles from './PenToolOverlay.module.css'

export function PenToolOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('freehand')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [isSending, setIsSending] = useState(false)
  const isDrawing = useRef(false)

  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const aiInputOpen = useDockingStore((s) => s.viewportAIInputOpen)
  const { sendMessage, status } = useAgentChat({ mode: 'sketch' })

  // Resize canvas to match container
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      redraw()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [strokes])

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    renderAllStrokes(ctx, strokes)
  }, [strokes])

  const getPoint = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || aiInputOpen) return
    isDrawing.current = true
    canvasRef.current?.setPointerCapture(e.pointerId)
    const point = getPoint(e)
    const stroke: Stroke = {
      tool: drawingTool,
      points: [point],
      color,
      width: strokeWidth,
    }
    setCurrentStroke(stroke)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || !currentStroke) return
    const point = getPoint(e)
    const updated = { ...currentStroke, points: [...currentStroke.points, point] }
    setCurrentStroke(updated)

    // Live preview
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      renderAllStrokes(ctx, strokes)
      renderStroke(ctx, updated)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDrawing.current || !currentStroke) return
    isDrawing.current = false
    setStrokes((prev) => [...prev, currentStroke])
    setCurrentStroke(null)
    // Anchor contextual input (Cmd+/) near this point when opened in pen tool
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      useEditorStore.getState().setPenToolLastDrawnPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleUndo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) renderAllStrokes(ctx, next)
      return next
    })
  }

  const handleClear = () => {
    setStrokes([])
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  }

  const handleCapture = async () => {
    const canvas = canvasRef.current
    if (!canvas || strokes.length === 0) return

    setIsSending(true)
    let taskId: string | null = null
    try {
      let dataUrl: string
      let hasViewport = false

      // Try to composite viewport screenshot with pen strokes
      const captureViewport = useEditorStore.getState().captureViewportScreenshot
      try {
        const viewportDataUrl = captureViewport ? captureViewport() : null

        if (viewportDataUrl) {
          // Composite viewport + pen drawing on an offscreen canvas
          const offscreen = document.createElement('canvas')
          offscreen.width = canvas.width
          offscreen.height = canvas.height
          const offCtx = offscreen.getContext('2d')!

          // Draw viewport screenshot as background
          const viewportImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = viewportDataUrl
          })
          offCtx.drawImage(viewportImg, 0, 0, offscreen.width, offscreen.height)

          // Draw pen strokes on top
          offCtx.drawImage(canvas, 0, 0)

          // Use JPEG at 80% quality to keep the payload reasonable
          dataUrl = offscreen.toDataURL('image/jpeg', 0.8)
          hasViewport = true
        }
      } catch (compositeErr) {
        console.warn('[PenTool] Viewport compositing failed, falling back to drawing-only:', compositeErr)
      }

      // Fallback: drawing-only (same as original behavior)
      if (!hasViewport) {
        dataUrl = canvas.toDataURL('image/png')
      }

      // Compute bounding-box center of all strokes for spatial positioning
      let spatialHint = ''
      const allPoints = strokes.flatMap((s) => s.points)
      if (allPoints.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const p of allPoints) {
          if (p.x < minX) minX = p.x
          if (p.y < minY) minY = p.y
          if (p.x > maxX) maxX = p.x
          if (p.y > maxY) maxY = p.y
        }
        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2
        const screenToWorld = useEditorStore.getState().screenToWorld
        if (screenToWorld) {
          const worldPos = screenToWorld(centerX, centerY)
          if (worldPos) {
            spatialHint = ` The annotations are centered near world position [${worldPos.x}, ${worldPos.y}, ${worldPos.z}].`
          }
        }
      }

      console.log('[PenTool] Sending image to AI, hasViewport:', hasViewport, 'size:', Math.round(dataUrl!.length / 1024), 'KB', 'spatialHint:', spatialHint)

      // Route through the drawer so simple tasks don't open the full chat
      taskId = useBackgroundTaskStore.getState().addRunningTask('Generating from sketch...')

      await sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text' as const,
            text: hasViewport
              ? `Interpret this annotated viewport screenshot. Create new objects from shapes drawn in empty space, and modify/fix existing objects that are annotated.${spatialHint}`
              : 'Create 3D objects in the workspace from this sketch.',
          },
          { type: 'file' as const, mediaType: hasViewport ? 'image/jpeg' as const : 'image/png' as const, url: dataUrl! },
        ],
      })

      if (taskId) useBackgroundTaskStore.getState().completeTask(taskId)
    } catch (e) {
      console.error('[PenTool] Generate failed:', e)
      useEditorStore.getState().log(`Pen tool AI generation failed: ${e}`, 'error', 'PenTool')
      if (taskId) useBackgroundTaskStore.getState().failTask(taskId, String(e))
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setActiveTool('select')
  }

  const isAILoading = status === 'streaming' || status === 'submitted'

  return (
    <div ref={containerRef} className={styles.overlay}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={aiInputOpen ? { pointerEvents: 'none' } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <PenToolbar
        activeTool={drawingTool}
        onToolChange={setDrawingTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={handleUndo}
        onClear={handleClear}
        onCapture={handleCapture}
        onClose={handleClose}
        canUndo={strokes.length > 0}
        isSending={isSending || isAILoading}
      />
    </div>
  )
}
