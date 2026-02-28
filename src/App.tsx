import { Component, useMemo, useEffect } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useEditorStore } from './store/editorStore'
import { useDockingStore } from './store/dockingStore'
import { useConversationStore } from './store/conversationStore'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Hierarchy } from './components/Hierarchy/Hierarchy'
import { Viewport } from './components/Viewport/Viewport'
import { Inspector } from './components/Inspector/Inspector'
import { Assets } from './components/Assets/Assets'
import { Console } from './components/Console/Console'
import { AIAssistant } from './components/AIAssistant/AIAssistant'
import { Comments } from './components/Comments/Comments'
import { ComponentGallery } from './components/ComponentGallery/ComponentGallery'
import { DockLayout } from './components/shared/DockLayout'
import { DockZoneRenderer } from './components/shared/DockZoneRenderer'
import { DockablePanel } from './components/shared/DockablePanel'
import { Monitor } from 'lucide-react'
import styles from './App.module.css'

function App() {
  // Global hotkeys - capture phase so we handle them before browser/other listeners
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Escape — close AI input first if open, then clear area circle on a second press
      if (key === 'escape') {
        const { viewportAIInputOpen, setViewportAIInputOpen } = useDockingStore.getState()
        if (viewportAIInputOpen) {
          e.preventDefault()
          e.stopPropagation()
          setViewportAIInputOpen(false)
          return
        }
        const editor = useEditorStore.getState()
        if (editor.areaSelectionCircle) {
          e.preventDefault()
          e.stopPropagation()
          editor.setAreaSelectionCircle(null)
        }
        return
      }

      // Cmd+N / Ctrl+N — new chat in the main composer
      if ((e.metaKey || e.ctrlKey) && key === 'n') {
        e.preventDefault()
        e.stopPropagation()
        const { createConversation } = useConversationStore.getState()
        createConversation()
        return
      }

      // Cmd+K / Ctrl+K — toggle main AI assistant panel
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        const dock = useDockingStore.getState()
        const isVisible = !!dock.widgets['ai-assistant']
        if (isVisible) {
          dock.undockWidget('ai-assistant')
        } else {
          dock.dockWidget('ai-assistant', 'right-top')
          dock.setAiAssistantBodyCollapsed(false)
        }
        return
      }

      // Cmd+/ / Ctrl+/ — toggle viewport AI input (global, works even when focus is in an input)
      if ((e.metaKey || e.ctrlKey) && key === '/') {
        e.preventDefault()
        e.stopPropagation()
        const { viewportAIInputOpen, setViewportAIInputOpen } = useDockingStore.getState()
        const editor = useEditorStore.getState()
        if (!viewportAIInputOpen) {
          if (editor.areaSelectionCircle) {
            const c = editor.areaSelectionCircle
            editor.setAIInputAnchorPosition({ x: c.centerX, y: c.centerY + c.radius + 24 })
          } else if (editor.activeTool === 'pen' && editor.penToolLastDrawnPosition) {
            // Keep pen tool active — don't switch to select while drawing
            editor.setAIInputAnchorPosition(editor.penToolLastDrawnPosition)
          } else if (editor.selectedObjectIds.length > 0 && editor.activeTool !== 'select') {
            editor.setActiveTool('select')
          }
        }
        setViewportAIInputOpen(!viewportAIInputOpen)
        return
      }

      const inInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      if (inInput) return

      // Viewport tools: S Select, W Move, E Rotate, R Scale, T Transform, P Pen (toggle)
      const toolKeys: Record<string, 'select' | 'move' | 'rotate' | 'scale' | 'transform' | 'pen'> = {
        s: 'select',
        w: 'move',
        e: 'rotate',
        r: 'scale',
        t: 'transform',
        p: 'pen',
      }
      if (toolKeys[key]) {
        const { activeTool, setActiveTool } = useEditorStore.getState()
        if (key === 'p') {
          setActiveTool(activeTool === 'pen' ? 'select' : 'pen')
        } else {
          setActiveTool(toolKeys[key]!)
        }
        e.preventDefault()
        e.stopPropagation()
        return
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  // Memoize widgetMap to prevent unnecessary remounts when docking layout changes
  const widgetMap = useMemo(() => ({
    inspector: <Inspector />,
    viewport: (
      <DockablePanel widgetId="viewport" title="Viewport" icon={<Monitor size={16} />} hideCloseButton contentFills>
        <Viewport />
      </DockablePanel>
    ),
    assets: <Assets />,
    console: <Console />,
    'ai-assistant': <AIAssistant />,
    comments: <Comments />,
    explorer: <Hierarchy />,
    componentGallery: <ComponentGallery />,
  }), [])

  return (
    <div className={styles.editor}>
      <Toolbar />
      <DockLayout
        leftZone={<DockZoneRenderer zone="left" widgetMap={widgetMap} />}
        centerTopZone={<DockZoneRenderer zone="center-top" widgetMap={widgetMap} />}
        centerBottomZone={<DockZoneRenderer zone="center-bottom" widgetMap={widgetMap} />}
        rightTopPanels={{
          inspector: widgetMap.inspector,
          'ai-assistant': widgetMap['ai-assistant'],
        }}
        rightBottomZone={<DockZoneRenderer zone="right-bottom" widgetMap={widgetMap} />}
      />
    </div>
  )
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#ff6b6b', background: '#1a1a1e', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ margin: '0 0 12px' }}>Something crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, opacity: 0.7, marginTop: 8 }}>{this.state.error.stack}</pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppWithBoundary() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  )
}

export default AppWithBoundary




