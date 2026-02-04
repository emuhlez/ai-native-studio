import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

interface ModelPreviewProps {
  modelPath: string
  className?: string
  animate?: boolean
  onLoadingChange?: (isLoading: boolean) => void
}

export function ModelPreview({ modelPath, className, animate = false, onLoadingChange }: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  
  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  // Intersection Observer to detect when element is visible
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      {
        rootMargin: '50px', // Start loading slightly before visible
        threshold: 0.1,
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || !isVisible) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
    camera.position.set(3, 2.5, 5)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0) // Transparent
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights - better lighting for model visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6)
    directionalLight1.position.set(5, 5, 5)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
    directionalLight2.position.set(-3, -3, -3)
    scene.add(directionalLight2)

    // Load model
    const loader = new GLTFLoader()
    setIsLoading(true)
    setLoadError(false)
    
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene
        modelRef.current = model

        // Center and scale model to fit view
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 1.5 / maxDim // Slightly smaller scale for better framing
        model.scale.multiplyScalar(scale)
        
        // Recalculate box after scaling
        box.setFromObject(model)
        const scaledCenter = box.getCenter(new THREE.Vector3())
        model.position.sub(scaledCenter)

        scene.add(model)

        // Wait a frame to ensure model is fully added to scene before rendering
        requestAnimationFrame(() => {
          if (rendererRef.current && cameraRef.current && sceneRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current)
          }
          setIsLoading(false)
        })
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error, modelPath)
        setLoadError(true)
        setIsLoading(false)
      }
    )

    // Cleanup
    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current) {
        container.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [modelPath, isVisible])

  // Handle animation on/off
  useEffect(() => {
    if (!animate || !modelRef.current || !sceneRef.current || !rendererRef.current || !cameraRef.current) {
      // Stop animation if it's running
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
      return
    }

    // Start animation loop
    const animateLoop = () => {
      if (!modelRef.current || !sceneRef.current || !rendererRef.current || !cameraRef.current) return
      
      modelRef.current.rotation.y += 0.005
      rendererRef.current.render(sceneRef.current, cameraRef.current)
      animationIdRef.current = requestAnimationFrame(animateLoop)
    }
    animateLoop()

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
    }
  }, [animate])

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loadError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 100, 100, 0.6)',
          fontSize: '9px',
        }}>
          ✕
        </div>
      )}
    </div>
  )
}
