import { useDockingStore } from '../../store/dockingStore'
import { useWidgetMetadataStore } from '../../store/widgetMetadataStore'
import { TabbedPanel } from './TabbedPanel'
import type { DockZone } from '../../types'
import type { ReactNode } from 'react'

interface DockZoneRendererProps {
  zone: DockZone
  widgetMap: Record<string, ReactNode>
}

export function DockZoneRenderer({ zone, widgetMap }: DockZoneRendererProps) {
  const widgets = useDockingStore((state) => state.getWidgetsInZone(zone))
  const getTab = useWidgetMetadataStore((state) => state.getTab)
  
  if (widgets.length === 0) {
    return null
  }
  
  // If multiple widgets, group them in a tabbed panel
  if (widgets.length > 1) {
    const tabs = widgets
      .map((widget) => getTab(widget.id))
      .filter((tab): tab is NonNullable<typeof tab> => tab !== null)
    
    // If we don't have metadata yet, render widgets normally until metadata is available
    if (tabs.length === 0) {
      return (
        <>
          {widgets.map((widget) => (
            <div key={widget.id} style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
              {widgetMap[widget.id]}
            </div>
          ))}
        </>
      )
    }
    
    const tabContents: Record<string, ReactNode> = {}
    widgets.forEach((widget) => {
      tabContents[widget.id] = widgetMap[widget.id]
    })
    
    const zoneTitle = zone === 'right-top' ? 'Explorer' : undefined

    return (
      <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <TabbedPanel tabs={tabs} tabContents={tabContents} zone={zone} title={zoneTitle} />
      </div>
    )
  }
  
  // Single widget - render normally
  return (
    <div key={widgets[0].id} style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
      {widgetMap[widgets[0].id]}
    </div>
  )
}

