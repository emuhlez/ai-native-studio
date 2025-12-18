import { Settings, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Panel } from '../shared/Panel'
import { IconButton } from '../shared/IconButton'
import { useEditorStore } from '../../store/editorStore'
import styles from './Inspector.module.css'

export function Inspector() {
  const { selectedObjectId, gameObjects, updateGameObject, deleteGameObject } = useEditorStore()
  const selectedObject = selectedObjectId ? gameObjects[selectedObjectId] : null

  if (!selectedObject) {
    return (
      <Panel title="Inspector" icon={<Settings size={16} />}>
        <div className={styles.empty}>
          <p>Select an object to inspect</p>
        </div>
      </Panel>
    )
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGameObject(selectedObjectId!, { name: e.target.value })
  }

  const handleTransformChange = (
    component: 'position' | 'rotation' | 'scale',
    axis: 'x' | 'y' | 'z',
    value: string
  ) => {
    const numValue = parseFloat(value) || 0
    updateGameObject(selectedObjectId!, {
      transform: {
        ...selectedObject.transform,
        [component]: {
          ...selectedObject.transform[component],
          [axis]: numValue,
        },
      },
    })
  }

  return (
    <Panel
      title="Inspector"
      icon={<Settings size={16} />}
      actions={
        <IconButton
          icon={<Trash2 size={14} />}
          tooltip="Delete Object"
          size="sm"
          onClick={() => deleteGameObject(selectedObjectId!)}
        />
      }
    >
      <div className={styles.content}>
        {/* Header section */}
        <section className={styles.section}>
          <div className={styles.header}>
            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                checked={selectedObject.visible}
                onChange={(e) =>
                  updateGameObject(selectedObjectId!, { visible: e.target.checked })
                }
                className={styles.checkbox}
              />
            </div>
            <input
              type="text"
              value={selectedObject.name}
              onChange={handleNameChange}
              className={styles.nameInput}
            />
          </div>
          <div className={styles.meta}>
            <span className={styles.tag}>{selectedObject.type}</span>
            <span className={styles.id}>ID: {selectedObject.id.slice(0, 8)}</span>
          </div>
        </section>

        {/* Transform section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <ChevronDown size={14} />
            <span>Transform</span>
          </div>
          
          <div className={styles.transformGrid}>
            <TransformRow
              label="Position"
              values={selectedObject.transform.position}
              onChange={(axis, value) => handleTransformChange('position', axis, value)}
            />
            <TransformRow
              label="Rotation"
              values={selectedObject.transform.rotation}
              onChange={(axis, value) => handleTransformChange('rotation', axis, value)}
            />
            <TransformRow
              label="Scale"
              values={selectedObject.transform.scale}
              onChange={(axis, value) => handleTransformChange('scale', axis, value)}
            />
          </div>
        </section>

        {/* Components section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <ChevronDown size={14} />
            <span>Components</span>
            <IconButton
              icon={<Plus size={12} />}
              size="sm"
              tooltip="Add Component"
              className={styles.addBtn}
            />
          </div>
          
          {selectedObject.components.length === 0 ? (
            <div className={styles.emptyComponents}>
              <p>No components attached</p>
              <button className={styles.addComponentBtn}>
                <Plus size={14} />
                Add Component
              </button>
            </div>
          ) : (
            <div className={styles.componentsList}>
              {selectedObject.components.map((component) => (
                <div key={component.id} className={styles.component}>
                  <span>{component.type}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Panel>
  )
}

interface TransformRowProps {
  label: string
  values: { x: number; y: number; z: number }
  onChange: (axis: 'x' | 'y' | 'z', value: string) => void
}

function TransformRow({ label, values, onChange }: TransformRowProps) {
  return (
    <div className={styles.transformRow}>
      <label className={styles.transformLabel}>{label}</label>
      <div className={styles.transformInputs}>
        <div className={styles.inputGroup}>
          <span className={styles.axisLabel} data-axis="x">X</span>
          <input
            type="number"
            value={values.x}
            onChange={(e) => onChange('x', e.target.value)}
            className={styles.numberInput}
            step="0.1"
          />
        </div>
        <div className={styles.inputGroup}>
          <span className={styles.axisLabel} data-axis="y">Y</span>
          <input
            type="number"
            value={values.y}
            onChange={(e) => onChange('y', e.target.value)}
            className={styles.numberInput}
            step="0.1"
          />
        </div>
        <div className={styles.inputGroup}>
          <span className={styles.axisLabel} data-axis="z">Z</span>
          <input
            type="number"
            value={values.z}
            onChange={(e) => onChange('z', e.target.value)}
            className={styles.numberInput}
            step="0.1"
          />
        </div>
      </div>
    </div>
  )
}


