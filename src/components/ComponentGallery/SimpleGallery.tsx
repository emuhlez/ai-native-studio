import { useState, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, Package, Zap } from 'lucide-react'
import { onActiveComponentChange, getActiveComponent, type ActiveComponentInfo } from '../../utils/componentTracker'
import styles from './ComponentGallery.module.css'

export function SimpleGallery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeComponent, setActiveComponent] = useState<ActiveComponentInfo | null>(null)

  useEffect(() => {
    // Get initial active component
    setActiveComponent(getActiveComponent())
    
    // Listen for changes
    const cleanup = onActiveComponentChange((info) => {
      setActiveComponent(info)
      console.log('Active component changed:', info)
    })
    
    return cleanup
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-darkest)' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '2px solid var(--bg-panel)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        background: 'var(--bg-dark)'
      }}>
        <Package size={24} color="var(--accent-primary)" />
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Studio Shell Component Library
        </h1>
      </div>

      <div className={styles.gallery}>
        {/* Search Bar */}
        <div className={styles.searchBar}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Active Component Indicator */}
        {activeComponent && (
          <div style={{ 
            margin: '0 0 16px 0',
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            border: '2px solid var(--accent-primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Zap size={20} color="var(--accent-primary)" />
            <div>
              <div style={{ 
                color: 'var(--text-primary)', 
                fontWeight: 600,
                fontSize: '14px',
                marginBottom: '4px'
              }}>
                Currently Active: {activeComponent.name}
              </div>
              <div style={{ 
                color: 'var(--text-muted)', 
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {activeComponent.location}
              </div>
            </div>
          </div>
        )}

        {/* Simple Content */}
        <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
          <h2>Welcome to the Component Library</h2>
          <p>Component gallery is loading...</p>
          <p>Search query: {searchQuery || 'none'}</p>
          
          {!activeComponent && (
            <div style={{ 
              marginTop: '20px',
              padding: '16px',
              background: 'var(--bg-surface)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              💡 <strong>Tip:</strong> Click any component in the main editor (like an IconButton) and watch this panel light up!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
