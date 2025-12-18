import { Toolbar } from './components/Toolbar/Toolbar'
import { Hierarchy } from './components/Hierarchy/Hierarchy'
import { Viewport } from './components/Viewport/Viewport'
import { Inspector } from './components/Inspector/Inspector'
import { Assets } from './components/Assets/Assets'
import { Console } from './components/Console/Console'
import styles from './App.module.css'

function App() {
  return (
    <div className={styles.editor}>
      <Toolbar />
      <div className={styles.main}>
        <div className={styles.leftPanel}>
          <Hierarchy />
        </div>
        <div className={styles.center}>
          <div className={styles.viewport}>
            <Viewport />
          </div>
          <div className={styles.bottom}>
            <Assets />
            <Console />
          </div>
        </div>
        <div className={styles.rightPanel}>
          <Inspector />
        </div>
      </div>
    </div>
  )
}

export default App


