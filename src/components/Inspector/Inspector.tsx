import { useEffect, useRef, useState } from 'react'
import { Settings, Plus } from 'lucide-react'

function toNumericId(seed: string, length: number): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash).toString().padStart(length, '0').slice(-length)
}

function toMeshId(uuid: string): string {
  return toNumericId(uuid, 10)
}

function toTextureId(uuid: string): string {
  return toNumericId(`${uuid}:texture`, 9)
}

function extractFileName(path: string): string {
  if (!path) return path
  const normalized = path.replace(/\\/g, '/')
  return normalized.split('/').pop() ?? path
}

function getSourceFilename(modelName: string): string {
  const match = THREE_SPACE_ASSETS.find((f) => f.replace(/\.glb$/i, '') === modelName)
  return match ?? ''
}

const MESH_ACCEPT = '.glb,.gltf,.obj,.fbx,.dae'
const TEXTURE_ACCEPT = '.png,.jpg,.jpeg,.webp,.tga,.tif,.tiff,.bmp'
import { DockablePanel } from '../shared/DockablePanel'
import { PropertiesLabel } from '../shared/PropertiesLabel'
import { ExpandDownIcon, ExpandRightIcon } from '../shared/ExpandIcons'
import { ModelPreview } from './ModelPreview'
import { TexturePreview } from './TexturePreview'
import { THREE_SPACE_ASSETS } from '../Viewport/threeSpaceAssets'
import { IconButton } from '../shared/IconButton'
import { useEditorStore } from '../../store/editorStore'
import styles from './Inspector.module.css'

export function Inspector() {
  const [transformExpanded, setTransformExpanded] = useState(true)
  const [pivotExpanded, setPivotExpanded] = useState(true)
  const [appearanceExpanded, setAppearanceExpanded] = useState(true)
  const [componentsExpanded, setComponentsExpanded] = useState(true)
  const [textureFilename, setTextureFilename] = useState('—')
  const [textureObjectUrl, setTextureObjectUrl] = useState<string | null>(null)
  const meshFileInputRef = useRef<HTMLInputElement>(null)
  const textureFileInputRef = useRef<HTMLInputElement>(null)

  const {
    selectedObjectIds,
    gameObjects,
    rootObjectIds,
    updateGameObject,
    viewportSelectedAssetNames,
  } = useEditorStore()
  const primaryId = selectedObjectIds.length > 0 ? selectedObjectIds[selectedObjectIds.length - 1] : null
  let selectedObject = primaryId ? gameObjects[primaryId] : null
  const primaryAssetName =
    viewportSelectedAssetNames.length > 0 ? viewportSelectedAssetNames[viewportSelectedAssetNames.length - 1] : null
  const hasMulti = selectedObjectIds.length > 1 || viewportSelectedAssetNames.length > 1

  // Fallback: when viewport selected an asset by name but selectedObjectIds wasn't set,
  // find the game object by name in the workspace tree so we can show transform editing
  if (primaryAssetName && !selectedObject && rootObjectIds.length > 0) {
    const workspace = gameObjects[rootObjectIds[0]]
    const findByName = (ids: string[]): string | null => {
      for (const id of ids) {
        if (gameObjects[id]?.name === primaryAssetName) return id
        const child = gameObjects[id]
        if (child?.children?.length) {
          const found = findByName(child.children)
          if (found) return found
        }
      }
      return null
    }
    const fallbackId = workspace ? findByName(workspace.children) : null
    if (fallbackId) selectedObject = gameObjects[fallbackId] ?? null
  }

  const effectivePrimaryId = selectedObject?.id ?? primaryId ?? null
  const textureId = selectedObject ? toTextureId(selectedObject.id) : toTextureId('texture')

  useEffect(() => {
    if (selectedObject?.texturePath) {
      setTextureFilename(selectedObject.texturePath)
    } else {
      setTextureFilename('—')
    }
    setTextureObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [selectedObject?.id, selectedObject?.texturePath])

  if (!selectedObject && !primaryAssetName) {
    return (
      <DockablePanel widgetId="inspector" title="Properties" icon={<Settings size={16} />} className={styles.propertiesPanel}>
        <div className={styles.empty}>
          <p>Select an object to inspect</p>
        </div>
      </DockablePanel>
    )
  }

  if (primaryAssetName && !selectedObject) {
    return (
      <DockablePanel widgetId="inspector" title="Properties" icon={<Settings size={16} />} className={styles.propertiesPanel}>
        <div className={styles.content}>
          {hasMulti && (
            <p style={{ fontSize: 12, color: 'var(--content-muted)', margin: '8px 12px' }}>
              {selectedObjectIds.length || viewportSelectedAssetNames.length} selected. Inspecting last selected.
            </p>
          )}
          <section className={`${styles.section} ${styles.headerSection}`}>
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
              <ExpandDownIcon />
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
    if (effectivePrimaryId) updateGameObject(effectivePrimaryId, { name: e.target.value })
  }

  const handleMeshFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !effectivePrimaryId) return
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const meshUrl = URL.createObjectURL(file)
    if (selectedObject?.meshUrl) URL.revokeObjectURL(selectedObject.meshUrl)
    updateGameObject(effectivePrimaryId, { name: baseName, meshUrl, meshFilename: file.name })
  }

  const handleTextureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !effectivePrimaryId) return
    updateGameObject(effectivePrimaryId, { texturePath: file.name })
    setTextureFilename(file.name)
    setTextureObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleTransformChange = (
    component: 'position' | 'rotation' | 'scale',
    axis: 'x' | 'y' | 'z',
    value: string
  ) => {
    if (!effectivePrimaryId) return
    const numValue = parseFloat(value) || 0
    updateGameObject(effectivePrimaryId, {
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
    if (!effectivePrimaryId) return
    const pivot = selectedObject.pivot ?? { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }
    const numValue = parseFloat(value) || 0
    updateGameObject(effectivePrimaryId, {
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
      className={styles.propertiesPanel}
    >
      <input
        ref={meshFileInputRef}
        type="file"
        accept={MESH_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleMeshFileChange}
        aria-label="Select mesh file"
      />
      <input
        ref={textureFileInputRef}
        type="file"
        accept={TEXTURE_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleTextureFileChange}
        aria-label="Select texture file"
      />
      <div className={styles.content}>
        {/* Header section */}
        <section className={`${styles.section} ${styles.headerSection}`}>
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
                    effectivePrimaryId && updateGameObject(effectivePrimaryId, { visible: e.target.checked })
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
          <div
            className={styles.sectionHeader}
            role="button"
            tabIndex={0}
            onClick={() => setTransformExpanded((v) => !v)}
            onKeyDown={(e) => e.key === 'Enter' && setTransformExpanded((v) => !v)}
          >
            {transformExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
            <span>Transform</span>
          </div>
          
          {transformExpanded && (
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
          )}
        </section>

        {/* Pivot section */}
        <section className={styles.section}>
          <div
            className={styles.sectionHeader}
            role="button"
            tabIndex={0}
            onClick={() => setPivotExpanded((v) => !v)}
            onKeyDown={(e) => e.key === 'Enter' && setPivotExpanded((v) => !v)}
          >
            {pivotExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
            <span>Pivot</span>
          </div>
          {pivotExpanded && (
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
          )}
        </section>

        <div className={styles.sectionDivider} />

        {/* Appearance section */}
        <section className={styles.section}>
          <div
            className={styles.sectionHeader}
            role="button"
            tabIndex={0}
            onClick={() => setAppearanceExpanded((v) => !v)}
            onKeyDown={(e) => e.key === 'Enter' && setAppearanceExpanded((v) => !v)}
          >
            {appearanceExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
            <span>Appearance</span>
          </div>
          {appearanceExpanded && (
            <div className={styles.transformGrid}>
              <div className={styles.transformRow}>
                <label className={styles.transformLabel}>Mesh ID</label>
                <PropertiesLabel value={toMeshId(selectedObject.id)} />
              </div>
              <div className={styles.previewerContainer}>
                <ModelPreview
                  modelName={selectedObject.name}
                  modelUrl={selectedObject.meshUrl}
                  className={styles.previewImage}
                />
              </div>
              <div className={`${styles.transformRow} ${styles.sourceInputRow}`}>
                <PropertiesLabel value={selectedObject.meshFilename ?? (getSourceFilename(selectedObject.name) || '—')} />
                <button
                  type="button"
                  className={styles.sourceIconButton}
                  onClick={() => meshFileInputRef.current?.click()}
                  title="Select mesh file"
                  aria-label="Select mesh file"
                >
                  <img src="/icons/QuickOpen.svg" alt="" width={16} height={16} className={styles.sourceIcon} />
                </button>
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.transformGrid}>
            <div className={styles.transformRow}>
              <label className={styles.transformLabel}>Texture ID</label>
              <PropertiesLabel value={textureId} />
            </div>
            <div className={styles.previewerContainer}>
              <TexturePreview
                modelName={selectedObject.name}
                className={styles.textureCanvas}
                textureUrl={textureObjectUrl ?? undefined}
                onTextureInfo={(info) => {
                  if (!selectedObject?.texturePath) {
                    setTextureFilename(info?.name ? extractFileName(info.name) : '—')
                  }
                }}
              />
            </div>
            <div className={`${styles.transformRow} ${styles.sourceInputRow}`}>
              <PropertiesLabel value={textureFilename} />
              <button
                type="button"
                className={styles.sourceIconButton}
                onClick={() => textureFileInputRef.current?.click()}
                title="Select texture file"
                aria-label="Select texture file"
              >
                <img src="/icons/QuickOpen.svg" alt="" width={16} height={16} className={styles.sourceIcon} />
              </button>
            </div>
          </div>
        </section>

        {/* Components section */}
        <section className={styles.section}>
          <div
            className={styles.sectionHeader}
            role="button"
            tabIndex={0}
            onClick={() => setComponentsExpanded((v) => !v)}
            onKeyDown={(e) => e.key === 'Enter' && setComponentsExpanded((v) => !v)}
          >
            {componentsExpanded ? <ExpandDownIcon /> : <ExpandRightIcon />}
            <span>Components</span>
            <IconButton
              icon={<Plus size={12} />}
              size="sm"
              tooltip="Add Component"
              className={styles.addBtn}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {componentsExpanded && (selectedObject.components.length === 0 ? (
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
          ))}
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




