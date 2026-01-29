import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { useEditorStore } from '../../store/editorStore'
import {
  THREE_SPACE_ASSETS,
  assetUrl,
} from './threeSpaceAssets'
import styles from './Viewport.module.css'

const GRID_COLS = 6
const CELL_SPACING = 4
const MODEL_SCALE = 2
const CAMERA_FAR = 2000
const CAMERA_NEAR = 0.1
const CAMERA_FOV = 50
const SELECTION_EMISSIVE = 0xee8833
const SELECTION_EMISSIVE_INTENSITY = 0.4

const ORBIT_SENSITIVITY = 0.004
const ZOOM_SENSITIVITY = 0.001
/** macOS/iOS use "natural" scroll; invert vertical orbit so drag-up = tilt view up */
const VERTICAL_ORBIT_INVERTED =
  typeof navigator !== 'undefined' &&
  (/Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
    (navigator as { userAgentData?: { platform: string } }).userAgentData?.platform === 'macOS')
const MIN_RADIUS = 8
const MAX_RADIUS = 400
const MIN_PHI = 0.05
const MAX_PHI = Math.PI - 0.05
const DRAG_THRESHOLD_PX = 4
const PAN_SPEED = 0.35
const PAN_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r'])
const INITIAL_TARGET = new THREE.Vector3(0, 0, 0)
const INITIAL_RADIUS = Math.sqrt(40 * 40 + 35 * 35 + 40 * 40)
const INITIAL_THETA = Math.atan2(40, 40)
const INITIAL_PHI = Math.acos(Math.max(-1, Math.min(1, 35 / INITIAL_RADIUS)))

function getAssetDisplayName(filename: string): string {
  return filename.replace(/\.glb$/i, '')
}

function findRootWithAssetName(obj: THREE.Object3D, modelsGroup: THREE.Group): THREE.Object3D | null {
  let current: THREE.Object3D | null = obj
  while (current) {
    if (current.userData.assetName != null) return current
    if (current.parent === modelsGroup) return current
    current = current.parent
  }
  return null
}

function setHighlight(root: THREE.Object3D, on: boolean) {
  root.traverse((node: THREE.Object3D) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      if (mat && (mat as THREE.MeshStandardMaterial).emissive != null) {
        const m = mat as THREE.MeshStandardMaterial
        if (on) {
          m.emissive.setHex(SELECTION_EMISSIVE)
          m.emissiveIntensity = SELECTION_EMISSIVE_INTENSITY
        } else {
          m.emissive.setHex(0x000000)
          m.emissiveIntensity = 0
        }
      }
    }
  })
}

export function Viewport3D({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const modelsGroupRef = useRef<THREE.Group | null>(null)
  const frameRef = useRef<number>(0)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const resetViewRef = useRef(false)

  const viewportSelectedAssetNames = useEditorStore((s) => s.viewportSelectedAssetNames)
  const setViewportSelectedAsset = useEditorStore((s) => s.setViewportSelectedAsset)
  const addWorkspaceModel = useEditorStore((s) => s.addWorkspaceModel)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, CAMERA_NEAR, CAMERA_FAR)
    camera.position.set(40, 35, 40)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const target = new THREE.Vector3(0, 0, 0)
    let radius = camera.position.distanceTo(target)
    let theta = Math.atan2(camera.position.x - target.x, camera.position.z - target.z)
    let phi = Math.acos(Math.max(-1, Math.min(1, (camera.position.y - target.y) / radius)))

    const updateCameraFromOrbit = () => {
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta)
      camera.position.y = target.y + radius * Math.cos(phi)
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta)
      camera.lookAt(target)
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const canvas = renderer.domElement
    canvas.className = styles.viewport3dCanvas
    canvas.style.pointerEvents = 'auto'
    canvas.setAttribute('tabindex', '0')

    const keysPressed = new Set<string>()
    let lastPanTime = performance.now()

    const wrapper = document.createElement('div')
    wrapper.className = styles.canvas3DInner
    wrapper.style.pointerEvents = 'none'
    wrapper.appendChild(canvas)
    container.appendChild(wrapper)
    ;(canvas as HTMLCanvasElement).style.pointerEvents = 'auto'
    ;(canvas as HTMLCanvasElement).style.cursor = 'grab'

    const enforceCanvasLock = () => {
      canvas.style.setProperty('inset', '0', 'important')
    }
    enforceCanvasLock()

    rendererRef.current = renderer

    // Lights – brighter setup so assets are well lit
    const ambient = new THREE.AmbientLight(0xa0a0b8, 0.95)
    scene.add(ambient)
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x8888aa, 0.55)
    scene.add(hemisphere)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4)
    dirLight.position.set(25, 45, 25)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 200
    dirLight.shadow.camera.left = -50
    dirLight.shadow.camera.right = 50
    dirLight.shadow.camera.top = 50
    dirLight.shadow.camera.bottom = -50
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5)
    fillLight.position.set(-20, 15, 10)
    scene.add(fillLight)

    // Floor grid to simulate 3D workspace (XZ plane at y=0)
    const gridSize = 120
    const gridDivisions = 60
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444466, 0x2a2a35)
    gridHelper.position.y = 0
    scene.add(gridHelper)

    const loader = new GLTFLoader()
    const modelsGroup = new THREE.Group()
    scene.add(modelsGroup)
    modelsGroupRef.current = modelsGroup

    function placeModel(index: number): { x: number; z: number } {
      const col = index % GRID_COLS
      const row = Math.floor(index / GRID_COLS)
      const x = (col - (GRID_COLS - 1) / 2) * CELL_SPACING
      const z = row * CELL_SPACING
      return { x, z }
    }

    function fitScale(obj: THREE.Object3D): number {
      const box = new THREE.Box3().setFromObject(obj)
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim <= 0) return 1
      return MODEL_SCALE / maxDim
    }

    THREE_SPACE_ASSETS.forEach((filename, index) => {
      const url = assetUrl(filename)
      loader.load(
        url,
        (gltf: { scene: THREE.Group }) => {
          const root = gltf.scene
          const displayName = getAssetDisplayName(filename)
          root.userData.assetName = displayName
          addWorkspaceModel(displayName)
          root.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
              (node as THREE.Mesh).castShadow = true
              ;(node as THREE.Mesh).receiveShadow = true
            }
          })
          const scale = fitScale(root)
          root.scale.setScalar(scale)
          const { x, z } = placeModel(index)
          root.position.set(x, 0, z)
          modelsGroup.add(root)
        },
        undefined,
        () => {}
      )
    })

    const raycaster = raycasterRef.current
    const mouse = mouseRef.current

    let isOrbiting = false
    let dragStartX = 0
    let dragStartY = 0

    const performPick = (clientX: number, clientY: number, additive: boolean) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(modelsGroup.children, true)
      if (hits.length > 0) {
        const root = findRootWithAssetName(hits[0].object, modelsGroup)
        const name = root?.userData.assetName as string | undefined
        if (name) setViewportSelectedAsset({ name }, { additive })
      } else if (!additive) {
        setViewportSelectedAsset(null)
      }
    }

    const onPointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      ;(canvas as HTMLCanvasElement).focus()
      dragStartX = e.clientX
      dragStartY = e.clientY
      isOrbiting = false
    }

    const onPointerMove = (e: MouseEvent) => {
      if (e.buttons !== 1) return
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY
      if (!isOrbiting && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
        isOrbiting = true
        canvas.style.cursor = 'grabbing'
      }
      if (isOrbiting) {
        theta -= dx * ORBIT_SENSITIVITY
        const orbitDy = VERTICAL_ORBIT_INVERTED ? -dy : dy
        phi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi - orbitDy * ORBIT_SENSITIVITY))
        updateCameraFromOrbit()
        dragStartX = e.clientX
        dragStartY = e.clientY
      }
    }

    const onPointerUp = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (!isOrbiting) {
        performPick(e.clientX, e.clientY, e.ctrlKey || e.metaKey || e.shiftKey)
      }
      isOrbiting = false
      canvas.style.cursor = 'grab'
    }

    const onPointerEnter = () => {
      canvas.style.cursor = 'grab'
    }

    const onPointerLeave = () => {
      isOrbiting = false
      canvas.style.cursor = 'default'
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = 1 - e.deltaY * ZOOM_SENSITIVITY
      radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radius * factor))
      updateCameraFromOrbit()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerenter', onPointerEnter)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (PAN_KEYS.has(key) && document.activeElement === canvas) {
        if (key === 'r') {
          resetViewRef.current = true
        } else {
          keysPressed.add(key)
        }
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const delta = (now - lastPanTime) / 1000
      lastPanTime = now

      if (resetViewRef.current && cameraRef.current) {
        resetViewRef.current = false
        target.copy(INITIAL_TARGET)
        radius = INITIAL_RADIUS
        theta = INITIAL_THETA
        phi = INITIAL_PHI
        updateCameraFromOrbit()
      }

      if (keysPressed.size > 0 && cameraRef.current) {
        const speed = PAN_SPEED * (delta * 60)
        const forward = new THREE.Vector3()
          .subVectors(camera.position, target)
          .setY(0)
        if (forward.lengthSq() > 1e-6) {
          forward.normalize()
          const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
          if (keysPressed.has('w')) target.addScaledVector(forward, -speed)
          if (keysPressed.has('s')) target.addScaledVector(forward, speed)
          if (keysPressed.has('a')) target.addScaledVector(right, -speed)
          if (keysPressed.has('d')) target.addScaledVector(right, speed)
        }
        if (keysPressed.has('e')) target.y += speed
        if (keysPressed.has('q')) target.y -= speed
        updateCameraFromOrbit()
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    const onResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
      enforceCanvasLock()
    }
    window.addEventListener('resize', onResize)

    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerenter', onPointerEnter)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel, { passive: false })
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (containerRef.current && wrapper.parentNode === containerRef.current) {
        containerRef.current.removeChild(wrapper)
      }
      rendererRef.current?.dispose()
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      modelsGroupRef.current = null
    }
  }, [containerRef, setViewportSelectedAsset, addWorkspaceModel])

  // Highlight selected assets
  useEffect(() => {
    const group = modelsGroupRef.current
    if (!group) return
    const names = new Set(viewportSelectedAssetNames)
    group.children.forEach((root) => {
      const name = root.userData.assetName as string | undefined
      setHighlight(root, !!name && names.has(name))
    })
  }, [viewportSelectedAssetNames])

  return null
}
