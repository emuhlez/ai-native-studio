import { create } from 'zustand'
import type { DockZone, DockedWidget } from '../types'

export const DEFAULT_LEFT_WIDTH = 280
export const DEFAULT_RIGHT_WIDTH = 320
export const DEFAULT_CENTER_BOTTOM_HEIGHT = 220
export const DEFAULT_RIGHT_BOTTOM_HEIGHT = 220

export type PanelSizeKey = 'leftWidth' | 'rightWidth' | 'centerBottomHeight' | 'rightBottomHeight'

interface PanelSizes {
  leftWidth: number
  rightWidth: number
  centerBottomHeight: number
  rightBottomHeight: number
}

interface DockingStore {
  widgets: Record<string, DockedWidget>
  panelSizes: PanelSizes

  // Actions
  dockWidget: (widgetId: string, zone: DockZone, order?: number) => void
  undockWidget: (widgetId: string) => void
  moveWidget: (widgetId: string, newZone: DockZone, newOrder: number) => void
  getWidgetsInZone: (zone: DockZone) => DockedWidget[]
  setPanelSize: (key: PanelSizeKey, value: number) => void
}

export const useDockingStore = create<DockingStore>((set, get) => ({
  widgets: {
    inspector: { id: 'inspector', zone: 'right-bottom', order: 0 },
    viewport: { id: 'viewport', zone: 'center-top', order: 0 },
    explorer: { id: 'explorer', zone: 'right-top', order: 0 },
    assets: { id: 'assets', zone: 'center-bottom', order: 0 },
    console: { id: 'console', zone: 'right-top', order: 1 },
  },
  panelSizes: {
    leftWidth: DEFAULT_LEFT_WIDTH,
    rightWidth: DEFAULT_RIGHT_WIDTH,
    centerBottomHeight: DEFAULT_CENTER_BOTTOM_HEIGHT,
    rightBottomHeight: DEFAULT_RIGHT_BOTTOM_HEIGHT,
  },
  
  dockWidget: (widgetId, zone, order) => {
    set((state) => {
      const widgets = { ...state.widgets }
      
      // If order not specified, add to end of zone
      if (order === undefined) {
        const zoneWidgets = get().getWidgetsInZone(zone)
        order = zoneWidgets.length
      }
      
      widgets[widgetId] = { id: widgetId, zone, order }
      
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
    const min = key === 'leftWidth' ? 200 : key === 'rightWidth' ? 260 : 120
    const clamped = Math.max(min, value)
    set((state) => ({
      panelSizes: { ...state.panelSizes, [key]: clamped },
    }))
  },
}))

