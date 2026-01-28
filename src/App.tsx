import { Toolbar } from './components/Toolbar/Toolbar'
import { Hierarchy } from './components/Hierarchy/Hierarchy'
import { Viewport } from './components/Viewport/Viewport'
import { Inspector } from './components/Inspector/Inspector'
import { Assets } from './components/Assets/Assets'
import { Console } from './components/Console/Console'
import { DockLayout } from './components/shared/DockLayout'
import { DockZoneRenderer } from './components/shared/DockZoneRenderer'
import { DockablePanel } from './components/shared/DockablePanel'
import { Monitor } from 'lucide-react'
import styles from './App.module.css'

function App() {
  const widgetMap = {
    inspector: <Inspector />,
    viewport: (
      <DockablePanel widgetId="viewport" title="Viewport" icon={<Monitor size={16} />}>
        <Viewport />
      </DockablePanel>
    ),
    assets: <Assets />,
    console: <Console />,
    explorer: <Hierarchy />,
  }

  return (
    <div className={styles.editor}>
      <Toolbar />
      <DockLayout
        leftZone={<DockZoneRenderer zone="left" widgetMap={widgetMap} />}
        centerTopZone={<DockZoneRenderer zone="center-top" widgetMap={widgetMap} />}
        centerBottomZone={<DockZoneRenderer zone="center-bottom" widgetMap={widgetMap} />}
        rightTopZone={<DockZoneRenderer zone="right-top" widgetMap={widgetMap} />}
        rightBottomZone={<DockZoneRenderer zone="right-bottom" widgetMap={widgetMap} />}
      />
    </div>
  )
}

export default App




