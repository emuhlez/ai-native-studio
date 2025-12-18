import { 
  Play, 
  Pause, 
  Square, 
  MousePointer2, 
  Move, 
  RotateCcw, 
  Maximize2,
  Grid3X3,
  Magnet,
  Box,
  Layers,
  Save,
  FolderOpen,
  Settings,
  ChevronDown,
  Search
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { IconButton } from '../shared/IconButton'
import styles from './Toolbar.module.css'
import searchIconImg from '../../../images/search-icon.png'
import annotationIcon from '../../../images/Annotation Icon.png'
import aiAssistantIcon from '../../../images/AI Assistant.png'
import notificationIcon from '../../../images/Small_Notification.png'
import avatar1 from '../../../images/Avatar-1.png'
import avatar2 from '../../../images/Avatar-2.png'
import avatar3 from '../../../images/Avatar-3.png'
import partBlockIcon from '../../../images/Part_Block.png'

// Custom pause icon with wider spacing between bars
function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="5" y="4" width="4" height="16" />
      <rect x="15" y="4" width="4" height="16" />
    </svg>
  )
}

export function Toolbar() {
  const [showTestDropdown, setShowTestDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    isPlaying,
    isPaused,
    activeTool,
    viewMode,
    showGrid,
    snapToGrid,
    play,
    pause,
    stop,
    setActiveTool,
    setViewMode,
    toggleGrid,
    toggleSnap,
  } = useEditorStore()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTestDropdown(false)
      }
    }

    if (showTestDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTestDropdown])

  return (
    <header className={styles.toolbar}>
      <div className={styles.trafficLights}>
        <button className={`${styles.trafficLight} ${styles.red}`} aria-label="Close" />
        <button className={`${styles.trafficLight} ${styles.yellow}`} aria-label="Minimize" />
        <button className={`${styles.trafficLight} ${styles.green}`} aria-label="Maximize" />
      </div>

      <div className={styles.leftSection}>
        <div className={styles.actionIconContainer}>
          <img src="/roblox_dropdown.png" alt="Menu" className={styles.actionIcon} />
        </div>
        
        <div className={styles.divider} />

        <div className={styles.logo}>
          <div className={styles.logoIcon}></div>
          <span className={styles.logoText}>crossy farm</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.testingModeControls} ref={dropdownRef}>
          <button 
            className={styles.testDropdownButton}
            onClick={() => setShowTestDropdown(!showTestDropdown)}
          >
            <span>Test</span>
            <ChevronDown size={14} />
          </button>
          {showTestDropdown && (
            <div className={styles.testDropdownMenu}>
              <button className={styles.dropdownItem}>Play Here</button>
              <button className={styles.dropdownItem}>Run</button>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem}>Test Mode Settings</button>
            </div>
          )}
          <button className={styles.testPlayButton} onClick={play} title="Play Test">
            <Play size={16} fill="currentColor" />
          </button>
          <button className={styles.testPauseButton} onClick={pause} title="Pause Test">
            <img src="/pause-split-toggle.png" alt="Pause" width={16} height={16} />
          </button>
          <button className={styles.testStopButton} onClick={stop} title="Stop Test">
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      </div>

      <div className={styles.searchWrapper}>
        <div className={styles.searchContainer}>
          <img src={searchIconImg} alt="Search" className={styles.searchIcon} width={16} height={16} />
          <input 
            type="text" 
            placeholder="Search Project" 
            className={styles.searchInput}
            aria-label="Search Project"
          />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.group}>
          <img src={annotationIcon} alt="Annotation" width={16} height={16} />
          <img src={aiAssistantIcon} alt="AI Assistant" width={16} height={16} />
          <img src={notificationIcon} alt="Notifications" width={16} height={16} />
        </div>
        <div className={styles.group}>
          <img src={avatar1} alt="Avatar 1" width={16} height={16} />
          <img src={avatar2} alt="Avatar 2" width={16} height={16} />
          <img src={avatar3} alt="Avatar 3" width={16} height={16} />
        </div>
        <button className={styles.testDropdownButton}>
          <img src={partBlockIcon} alt="Part Block" width={16} height={16} />
          <span>Build</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  )
}

