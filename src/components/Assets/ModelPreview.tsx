import { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

interface ModelPreviewProps {
  modelPath: string
  className?: string
  animate?: boolean
  onLoadingChange?: (isLoading: boolean) => void
}

// Shared resources to minimize WebGL context usage
class SharedRendererPool {
  private static instance: SharedRendererPool | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private refCount = 0
  private canvas: HTMLCanvasElement | null = null

  static getInstance(): SharedRendererPool {
    if (!SharedRendererPool.instance) {
      SharedRendererPool.instance = new SharedRendererPool()
    }
    return SharedRendererPool.instance
  }

  acquire(): { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
    this.refCount++
    
    if (!this.renderer) {
      // Create offscreen canvas for rendering
      this.canvas = document.createElement('canvas')
      this.canvas.width = 256
      this.canvas.height = 256
      
      const renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas,
        antialias: false, // Disable for performance
        alpha: true,
        preserveDrawingBuffer: true // Needed for toDataURL
      })
      renderer.setClearColor(0x000000, 0)
      renderer.setSize(256, 256, false)
      renderer.setPixelRatio(1) // Fixed pixel ratio for consistency
      this.renderer = renderer

      const scene = new THREE.Scene()
      this.scene = scene

      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000)
      camera.position.set(3, 2.5, 5)
      camera.lookAt(0, 0, 0)
      this.camera = camera

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
      scene.add(ambientLight)
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6)
      directionalLight1.position.set(5, 5, 5)
      scene.add(directionalLight1)
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
      directionalLight2.position.set(-3, -3, -3)
      scene.add(directionalLight2)
    }

    return {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
    }
  }

  release() {
    this.refCount--
    if (this.refCount <= 0) {
      this.cleanup()
    }
  }

  cleanup() {
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }
    this.scene = null
    this.camera = null
    this.canvas = null
    this.refCount = 0
  }
}

export function ModelPreview({ modelPath, className, animate = false, onLoadingChange }: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const rotationRef = useRef(0)
  
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
          setIsVisible(entry.isIntersecting)
        })
      },
      {
        rootMargin: '100px', // Start loading earlier
        threshold: 0.01,
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Load model and generate thumbnail
  useEffect(() => {
    if (!isVisible) return

    const pool = SharedRendererPool.getInstance()
    const { renderer, scene, camera } = pool.acquire()
    
    const loader = new GLTFLoader()
    setIsLoading(true)
    setLoadError(false)
    
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene
        modelRef.current = model

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 1.5 / maxDim
        model.scale.multiplyScalar(scale)
        
        box.setFromObject(model)
        const scaledCenter = box.getCenter(new THREE.Vector3())
        model.position.sub(scaledCenter)

        scene.add(model)

        // Render to generate thumbnail
        try {
          renderer.render(scene, camera)
          const dataUrl = renderer.domElement.toDataURL('image/png')
          setThumbnail(dataUrl)
        } catch (err) {
          console.error('Error generating thumbnail:', err)
          setLoadError(true)
        }

        scene.remove(model)
        setIsLoading(false)
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error, modelPath)
        setLoadError(true)
        setIsLoading(false)
      }
    )

    return () => {
      if (modelRef.current) {
        scene.remove(modelRef.current)
        modelRef.current = null
      }
      pool.release()
    }
  }, [modelPath, isVisible])

  // Handle animation for grid view
  useEffect(() => {
    if (!animate || !thumbnail || !imgRef.current) {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
      rotationRef.current = 0
      if (imgRef.current) {
        imgRef.current.style.transform = 'rotateY(0deg)'
      }
      return
    }

    // CSS-based rotation animation (much more performant than WebGL)
    const animateRotation = () => {
      if (!imgRef.current) return
      rotationRef.current += 1
      imgRef.current.style.transform = `rotateY(${rotationRef.current}deg)`
      animationIdRef.current = requestAnimationFrame(animateRotation)
    }
    animateRotation()

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
    }
  }, [animate, thumbnail])

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {thumbnail && (
        <img
          ref={imgRef}
          src={thumbnail}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit',
            transition: animate ? 'none' : 'transform 0.3s ease',
          }}
        />
      )}
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
