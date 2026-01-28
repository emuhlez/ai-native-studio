import { create } from 'zustand'
import type { DockZone, DockedWidget } from '../types'

interface DockingStore {
  widgets: Record<string, DockedWidget>
  
  // Actions
  dockWidget: (widgetId: string, zone: DockZone, order?: number) => void
  undockWidget: (widgetId: string) => void
  moveWidget: (widgetId: string, newZone: DockZone, newOrder: number) => void
  getWidgetsInZone: (zone: DockZone) => DockedWidget[]
}

export const useDockingStore = create<DockingStore>((set, get) => ({
  widgets: {
    inspector: { id: 'inspector', zone: 'right-bottom', order: 0 },
    viewport: { id: 'viewport', zone: 'center-top', order: 0 },
    explorer: { id: 'explorer', zone: 'right-top', order: 0 },
    assets: { id: 'assets', zone: 'center-bottom', order: 0 },
    console: { id: 'console', zone: 'right-top', order: 1 },
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
}))

