import { useState } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import styles from './FilterMenu.module.css'

interface FilterMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { top: number; right: number }
}

export function FilterMenu({ isOpen, onClose, position }: FilterMenuProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Asset Type', 'Source', 'Creator'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const assetTypes = [
    'Animation',
    'Audio',
    'Decal',
    'FontFamily',
    'Image',
    'Mesh',
    'MeshPart',
    'Model',
    'Only Archived',
    'Package',
    'Plugin',
    'Video',
  ]

  const sources = ['Creator Store', 'Shared With Me', 'Uploaded']

  const creators = [
    '212Dasha212',
    '4A6574',
    'APMOfficial',
    'AlreadyPro',
    'Aurarus',
    'BadboyWestern',
    'CousinBeastMLG',
  ]

  if (!isOpen) return null

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.menu} style={{ top: position.top, right: position.right }}>
        <div className={styles.searchContainer}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search all filters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.scrollContent}>
          {/* Asset Type Section */}
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('Asset Type')}
            >
              {expandedSections.has('Asset Type') ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span>Asset Type</span>
            </button>
            {expandedSections.has('Asset Type') && (
              <div className={styles.sectionContent}>
                {assetTypes.map((type) => (
                  <button key={type} className={styles.checkboxLabel}>
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source Section */}
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('Source')}
            >
              {expandedSections.has('Source') ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span>Source</span>
            </button>
            {expandedSections.has('Source') && (
              <div className={styles.sectionContent}>
                {sources.map((source) => (
                  <button key={source} className={styles.checkboxLabel}>
                    <span>{source}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Creator Section */}
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('Creator')}
            >
              {expandedSections.has('Creator') ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span>Creator</span>
            </button>
            {expandedSections.has('Creator') && (
              <div className={styles.sectionContent}>
                {creators.map((creator) => (
                  <button key={creator} className={styles.checkboxLabel}>
                    <span>{creator}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className={styles.resetButton}>Reset Filters</button>
      </div>
    </>
  )
}
