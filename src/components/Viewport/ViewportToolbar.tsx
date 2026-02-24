import { memo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import type { EditorState } from '../../types'
import styles from './ViewportToolbar.module.css'

type ToolId = NonNullable<EditorState['activeTool']>

const TOOLS: { id: ToolId; icon: React.ReactNode; label: string; title: string }[] = [
  { id: 'select', icon: <img src="/icons/select.svg" alt="" width={16} height={16} className={styles.toolIconImg} />, label: 'Select', title: 'Select (S)' },
  { id: 'move', icon: <img src="/icons/move.svg" alt="" width={16} height={16} className={styles.toolIconImg} />, label: 'Move', title: 'Move (W)' },
  { id: 'rotate', icon: <img src="/icons/rotate.svg" alt="" width={16} height={16} className={styles.toolIconImg} />, label: 'Rotate', title: 'Rotate (E)' },
  { id: 'scale', icon: <img src="/icons/scale.svg" alt="" width={16} height={16} className={styles.toolIconImg} />, label: 'Scale', title: 'Scale (R)' },
  { id: 'transform', icon: <img src="/icons/transform.svg" alt="" width={16} height={16} className={styles.toolIconImg} />, label: 'Transform', title: 'Transform (T)' },
  { id: 'pen', icon: <img src="/icons/pen.svg" alt="" width={16} height={16} className={styles.toolIconImg} />, label: 'Pen', title: 'Pen — Sketch for AI (P)' },
]

export const ViewportToolbar = memo(function ViewportToolbar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Viewport tools">
      <div className={styles.track}>
        {TOOLS.map(({ id, icon, label, title }) => (
          <button
            key={id}
            type="button"
            className={`${styles.toolBtn} ${activeTool === id ? styles.active : ''}`}
            onClick={() => setActiveTool(activeTool === id ? null : id)}
            title={title}
            aria-label={label}
            aria-pressed={activeTool === id}
          >
            {icon}
          </button>
        ))}
        <div className={styles.divider} aria-hidden />
        <button
          type="button"
          className={styles.dotsBtn}
          title="More options"
          aria-label="More options"
        >
          <img
            src="/icons/more.svg"
            alt=""
            width={16}
            height={16}
            className={styles.toolIconImg}
          />
        </button>
      </div>
    </div>
  )
})
