import { Settings, ChevronDown, Plus } from 'lucide-react'
import { DockablePanel } from '../shared/DockablePanel'
import { IconButton } from '../shared/IconButton'
import { useEditorStore } from '../../store/editorStore'
import styles from './Inspector.module.css'

export function Inspector() {
  const {
    selectedObjectIds,
    gameObjects,
    updateGameObject,
    viewportSelectedAssetNames,
  } = useEditorStore()
  const primaryId = selectedObjectIds.length > 0 ? selectedObjectIds[selectedObjectIds.length - 1] : null
  const selectedObject = primaryId ? gameObjects[primaryId] : null
  const primaryAssetName =
    viewportSelectedAssetNames.length > 0 ? viewportSelectedAssetNames[viewportSelectedAssetNames.length - 1] : null
  const hasMulti = selectedObjectIds.length > 1 || viewportSelectedAssetNames.length > 1

  if (!selectedObject && !primaryAssetName) {
    return (
      <DockablePanel widgetId="inspector" title="Properties" icon={<Settings size={16} />}>
        <div className={styles.empty}>
          <p>Select an object to inspect</p>
        </div>
      </DockablePanel>
    )
  }

  if (primaryAssetName && !selectedObject) {
    return (
      <DockablePanel widgetId="inspector" title="Properties" icon={<Settings size={16} />}>
        <div className={styles.content}>
          {hasMulti && (
            <p style={{ fontSize: 12, color: 'var(--content-muted)', margin: '8px 12px' }}>
              {selectedObjectIds.length || viewportSelectedAssetNames.length} selected. Inspecting last selected.
            </p>
          )}
          <section className={styles.section}>
            <div className={styles.header}>
              <div className={styles.checkboxWrapper} />
              <input
                type="text"
                value={primaryAssetName}
                readOnly
                className={styles.nameInput}
              />
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <ChevronDown size={14} />
              <span>Transform</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--content-muted)', margin: '8px 0 0' }}>
              Transform editing for viewport assets coming soon.
            </p>
          </section>
        </div>
      </DockablePanel>
    )
  }

  if (!selectedObject) return null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (primaryId) updateGameObject(primaryId, { name: e.target.value })
  }

  const handleTransformChange = (
    component: 'position' | 'rotation' | 'scale',
    axis: 'x' | 'y' | 'z',
    value: string
  ) => {
    if (!primaryId) return
    const numValue = parseFloat(value) || 0
    updateGameObject(primaryId, {
      transform: {
        ...selectedObject.transform,
        [component]: {
          ...selectedObject.transform[component],
          [axis]: numValue,
        },
      },
    })
  }

  const handlePivotChange = (
    component: 'position' | 'rotation',
    axis: 'x' | 'y' | 'z',
    value: string
  ) => {
    if (!primaryId) return
    const pivot = selectedObject.pivot ?? { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }
    const numValue = parseFloat(value) || 0
    updateGameObject(primaryId, {
      pivot: {
        ...pivot,
        [component]: {
          ...pivot[component],
          [axis]: numValue,
        },
      },
    })
  }

  return (
    <DockablePanel
      widgetId="inspector"
      title="Properties"
      icon={<Settings size={16} />}
    >
      <div className={styles.content}>
        {/* Header section */}
        <section className={styles.section}>
            {hasMulti && (
              <p style={{ fontSize: 12, color: 'var(--content-muted)', margin: '8px 12px' }}>
                {selectedObjectIds.length} selected. Inspecting last selected.
              </p>
            )}
            <div className={styles.header}>
              <div className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  checked={selectedObject.visible}
                  onChange={(e) =>
                    primaryId && updateGameObject(primaryId, { visible: e.target.checked })
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
              label="Orientation"
              values={selectedObject.transform.rotation}
              onChange={(axis, value) => handleTransformChange('rotation', axis, value)}
              unit="degrees"
            />
            <TransformRow
              label="Size"
              values={selectedObject.transform.scale}
              onChange={(axis, value) => handleTransformChange('scale', axis, value)}
            />
          </div>
        </section>

        {/* Pivot section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <ChevronDown size={14} />
            <span>Pivot</span>
          </div>
          <div className={styles.transformGrid}>
            <TransformRow
              label="Position"
              values={selectedObject.pivot?.position ?? { x: 0, y: 0, z: 0 }}
              onChange={(axis, value) => handlePivotChange('position', axis, value)}
            />
            <TransformRow
              label="Orientation"
              values={selectedObject.pivot?.rotation ?? { x: 0, y: 0, z: 0 }}
              onChange={(axis, value) => handlePivotChange('rotation', axis, value)}
              unit="degrees"
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
    </DockablePanel>
  )
}

interface TransformRowProps {
  label: string
  values: { x: number; y: number; z: number }
  onChange: (axis: 'x' | 'y' | 'z', value: string) => void
  /** When 'degrees', use step 1 for whole-degree input */
  unit?: 'number' | 'degrees'
}

function TransformRow({ label, values, onChange, unit = 'number' }: TransformRowProps) {
  const step = unit === 'degrees' ? '1' : '0.1'
  const inputWidth = (v: number) => Math.max(3, String(v).length + 1)

  return (
    <div className={styles.transformRow}>
      <label className={styles.transformLabel}>{label}</label>
      <div className={styles.transformInputs}>
        <div className={styles.inputGroup} data-axis="x">
          <span className={styles.axisLine} aria-hidden />
          <div className={`${styles.inputWithUnit} ${unit === 'degrees' ? styles.inputWithDegrees : ''}`}>
            <input
              type="number"
              value={values.x}
              onChange={(e) => onChange('x', e.target.value)}
              className={styles.numberInput}
              step={step}
              style={unit === 'degrees' ? { width: `${inputWidth(values.x)}ch` } : undefined}
            />
            {unit === 'degrees' && <span className={styles.unitSuffix}>°</span>}
          </div>
        </div>
        <div className={styles.inputGroup} data-axis="y">
          <span className={styles.axisLine} aria-hidden />
          <div className={`${styles.inputWithUnit} ${unit === 'degrees' ? styles.inputWithDegrees : ''}`}>
            <input
              type="number"
              value={values.y}
              onChange={(e) => onChange('y', e.target.value)}
              className={styles.numberInput}
              step={step}
              style={unit === 'degrees' ? { width: `${inputWidth(values.y)}ch` } : undefined}
            />
            {unit === 'degrees' && <span className={styles.unitSuffix}>°</span>}
          </div>
        </div>
        <div className={styles.inputGroup} data-axis="z">
          <span className={styles.axisLine} aria-hidden />
          <div className={`${styles.inputWithUnit} ${unit === 'degrees' ? styles.inputWithDegrees : ''}`}>
            <input
              type="number"
              value={values.z}
              onChange={(e) => onChange('z', e.target.value)}
              className={styles.numberInput}
              step={step}
              style={unit === 'degrees' ? { width: `${inputWidth(values.z)}ch` } : undefined}
            />
            {unit === 'degrees' && <span className={styles.unitSuffix}>°</span>}
          </div>
        </div>
      </div>
    </div>
  )
}




