import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

interface ModelPreviewProps {
  modelPath: string
  className?: string
}

export function ModelPreview({ modelPath, className }: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(2, 2, 4)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0) // Transparent
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Load model
    const loader = new GLTFLoader()
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        model.scale.multiplyScalar(scale)
        model.position.sub(center.multiplyScalar(scale))

        scene.add(model)

        // Simple rotation animation
        const animate = () => {
          if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return
          requestAnimationFrame(animate)
          model.rotation.y += 0.005
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
        animate()
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error)
      }
    )

    // Cleanup
    return () => {
      if (rendererRef.current) {
        container.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [modelPath])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}
