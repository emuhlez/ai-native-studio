import { create } from 'zustand'
import type { DockZone, DockedWidget } from '../types'

export const DEFAULT_LEFT_WIDTH = 280
export const DEFAULT_RIGHT_WIDTH = 320
export const DEFAULT_CENTER_BOTTOM_HEIGHT = 470
export const DEFAULT_RIGHT_BOTTOM_HEIGHT = 470

export type PanelSizeKey = 'leftWidth' | 'rightWidth' | 'centerBottomHeight' | 'rightBottomHeight'

interface PanelSizes {
  leftWidth: number
  rightWidth: number
  centerBottomHeight: number
  rightBottomHeight: number
}

export const LEFT_COLLAPSED_WIDTH = 48

export interface ViewportBounds {
  left: number
  top: number
  width: number
  height: number
}

interface DockingStore {
  widgets: Record<string, DockedWidget>
  panelSizes: PanelSizes
  centerBottomCollapsed: boolean
  leftCollapsed: boolean
  viewportBounds: ViewportBounds | null

  // Actions
  toggleCenterBottomCollapsed: () => void
  toggleLeftCollapsed: () => void
  setLeftCollapsed: (collapsed: boolean) => void
  dockWidget: (widgetId: string, zone: DockZone, order?: number) => void
  undockWidget: (widgetId: string) => void
  moveWidget: (widgetId: string, newZone: DockZone, newOrder: number) => void
  getWidgetsInZone: (zone: DockZone) => DockedWidget[]
  setPanelSize: (key: PanelSizeKey, value: number) => void
  setWidgetPosition: (widgetId: string, x: number, y: number) => void
  getStickyWidgets: () => DockedWidget[]
  setViewportBounds: (bounds: ViewportBounds | null) => void
  /** While dragging a sticky widget, the panel follows the cursor (no separate preview) */
  draggingStickyWidgetId: string | null
  stickyDragPosition: { x: number; y: number } | null
  /** Offset from panel top-left to the point where the user started dragging (so panel doesn't jump) */
  stickyDragOffset: { x: number; y: number } | null
  setStickyDrag: (widgetId: string | null, position: { x: number; y: number } | null, offset?: { x: number; y: number } | null) => void
  /** When true, Properties panel shows only header (no selection) */
  inspectorBodyCollapsed: boolean
  setInspectorBodyCollapsed: (collapsed: boolean) => void
  /** When true, AI Assistant panel shows only header */
  aiAssistantBodyCollapsed: boolean
  setAiAssistantBodyCollapsed: (collapsed: boolean) => void
  /** When true, viewport Cmd+K AI input overlay is open */
  viewportAIInputOpen: boolean
  setViewportAIInputOpen: (open: boolean) => void
  /** Chatbot UI: 'tabs' = conversation tabs, 'dropdown' = Tasks header with dropdown list, 'queue' = queue view */
  chatbotUIMode: 'tabs' | 'dropdown' | 'queue'
  setChatbotUIMode: (mode: 'tabs' | 'dropdown' | 'queue') => void
  /** Dropdown task list status display: 'color' = colored indicators, 'status' = text status, 'none' = no status */
  dropdownTaskListStatusOption: 'color' | 'status' | 'none'
  setDropdownTaskListStatusOption: (option: 'color' | 'status' | 'none') => void
  /** Tabs status display: 'color' = dots, 'status' = checkmark icon, 'none' = only critical indicators */
  tabsStatusOption: 'color' | 'status' | 'none'
  setTabsStatusOption: (option: 'color' | 'status' | 'none') => void
  /** When queue mode: if true, tasks are ephemeral (e.g. not persisted in task list) */
  queueEphemeral: boolean
  setQueueEphemeral: (value: boolean) => void
}

export const useDockingStore = create<DockingStore>((set, get) => ({
  widgets: {
    inspector: { id: 'inspector', zone: 'right-top', order: 0, position: undefined },
    'ai-assistant': { id: 'ai-assistant', zone: 'right-top', order: 1, position: undefined },
    viewport: { id: 'viewport', zone: 'center-top', order: 0 },
  },
  panelSizes: {
    leftWidth: DEFAULT_LEFT_WIDTH,
    rightWidth: DEFAULT_RIGHT_WIDTH,
    centerBottomHeight: DEFAULT_CENTER_BOTTOM_HEIGHT,
    rightBottomHeight: DEFAULT_RIGHT_BOTTOM_HEIGHT,
  },
  centerBottomCollapsed: true,
  leftCollapsed: false,
  viewportBounds: null,

  toggleCenterBottomCollapsed: () => {
    set((state) => ({ centerBottomCollapsed: !state.centerBottomCollapsed }))
  },

  toggleLeftCollapsed: () => {
    set((state) => ({ leftCollapsed: !state.leftCollapsed }))
  },
  setLeftCollapsed: (collapsed) => {
    set({ leftCollapsed: collapsed })
  },

  dockWidget: (widgetId, zone, order) => {
    set((state) => {
      const widgets = { ...state.widgets }
      const existing = widgets[widgetId]

      // If order not specified, add to end of zone
      if (order === undefined) {
        const zoneWidgets = get().getWidgetsInZone(zone)
        order = zoneWidgets.length
      }

      const position = existing?.position

      widgets[widgetId] = { id: widgetId, zone, order, position }
      
      // Reorder widgets in the new zone
      const newZoneWidgets = Object.values(widgets)
        .filter((w) => w.zone === zone)
        .sort((a, b) => a.order - b.order)
      
      newZoneWidgets.forEach((w, index) => {
        widgets[w.id] = { ...w, order: index }
      })
      
      return { widgets }
    })
  },
  
  undockWidget: (widgetId) => {
    set((state) => {
      const widgets = { ...state.widgets }
      delete widgets[widgetId]
      return { widgets }
    })
  },
  
  moveWidget: (widgetId, newZone, newOrder) => {
    set((state) => {
      const widgets = { ...state.widgets }
      const widget = widgets[widgetId]
      if (!widget) return state
      
      // Remove from old zone
      const oldZoneWidgets = Object.values(widgets)
        .filter((w) => w.zone === widget.zone && w.id !== widgetId)
        .sort((a, b) => a.order - b.order)
      
      // Reorder old zone
      oldZoneWidgets.forEach((w, index) => {
        widgets[w.id] = { ...w, order: index }
      })
      
      // Add to new zone
      const newZoneWidgets = Object.values(widgets)
        .filter((w) => w.zone === newZone && w.id !== widgetId)
        .sort((a, b) => a.order - b.order)
      
      // Insert at newOrder position
      newZoneWidgets.splice(newOrder, 0, { ...widget, zone: newZone, order: newOrder })
      
      // Reorder new zone
      newZoneWidgets.forEach((w, index) => {
        widgets[w.id] = { ...w, order: index }
      })
      
      return { widgets }
    })
  },
  
  getWidgetsInZone: (zone) => {
    return Object.values(get().widgets)
      .filter((w) => w.zone === zone)
      .sort((a, b) => a.order - b.order)
  },

  setPanelSize: (key, value) => {
    const min = key === 'leftWidth' ? 220 : key === 'rightWidth' ? 260 : 120
    const clamped = Math.max(min, value)
    set((state) => ({
      panelSizes: { ...state.panelSizes, [key]: clamped },
    }))
  },

  setWidgetPosition: (widgetId, x, y) => {
    set((state) => {
      const w = state.widgets[widgetId]
      if (!w) return state
      return {
        widgets: { ...state.widgets, [widgetId]: { ...w, position: { x, y } } },
      }
    })
  },

  getStickyWidgets: () => {
    return Object.values(get().widgets)
      .filter((w) => w.zone === 'right-top')
      .sort((a, b) => a.order - b.order)
  },

  setViewportBounds: (bounds) => set({ viewportBounds: bounds }),

  draggingStickyWidgetId: null,
  stickyDragPosition: null,
  stickyDragOffset: null,
  setStickyDrag: (widgetId, position, offset) =>
    set((state) => ({
      draggingStickyWidgetId: widgetId,
      stickyDragPosition: position,
      stickyDragOffset: offset !== undefined ? offset : (position === null ? null : state.stickyDragOffset),
    })),

  inspectorBodyCollapsed: false,
  setInspectorBodyCollapsed: (collapsed) => set({ inspectorBodyCollapsed: collapsed }),
  aiAssistantBodyCollapsed: false,
  setAiAssistantBodyCollapsed: (collapsed) => set({ aiAssistantBodyCollapsed: collapsed }),
  viewportAIInputOpen: false,
  setViewportAIInputOpen: (open) => set({ viewportAIInputOpen: open }),
  chatbotUIMode: 'queue',
  setChatbotUIMode: (mode) => set({ chatbotUIMode: mode }),
  dropdownTaskListStatusOption: 'color',
  setDropdownTaskListStatusOption: (option: 'color' | 'status' | 'none') =>
    set({ dropdownTaskListStatusOption: option }),
  tabsStatusOption: 'color',
  setTabsStatusOption: (option: 'color' | 'status' | 'none') =>
    set({ tabsStatusOption: option }),
  queueEphemeral: false,
  setQueueEphemeral: (value) => set({ queueEphemeral: value }),
}))

