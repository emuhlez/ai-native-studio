import { useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { InputSegment, PillInputHandle } from '../../types'
import styles from './PillInput.module.css'

interface PillInputProps {
  segments: InputSegment[]
  onSegmentsChange: (segments: InputSegment[]) => void
  onSubmit?: () => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  ariaLabel?: string
  onFocus?: () => void
  onBlur?: () => void
}

/** Box icon SVG string for pill elements (matches lucide-react Box at size 12) */
const BOX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`

function parseDOM(el: HTMLDivElement): InputSegment[] {
  const segments: InputSegment[] = []
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (text) segments.push({ type: 'text', text })
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as HTMLElement
      if (elem.tagName === 'BR') {
        segments.push({ type: 'text', text: '\n' })
      } else if (elem.dataset.pillId) {
        segments.push({ type: 'pill', id: elem.dataset.pillId, label: elem.dataset.pillLabel ?? '' })
      }
    }
  }
  return segments
}

function createPillElement(id: string, label: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.contentEditable = 'false'
  span.className = styles.pill
  span.dataset.pillId = id
  span.dataset.pillLabel = label

  const iconSpan = document.createElement('span')
  iconSpan.innerHTML = BOX_SVG
  iconSpan.style.display = 'inline-flex'
  iconSpan.style.alignItems = 'center'
  span.appendChild(iconSpan)

  const labelSpan = document.createElement('span')
  labelSpan.className = styles.pillLabel
  labelSpan.textContent = label
  span.appendChild(labelSpan)

  return span
}

function renderSegments(el: HTMLDivElement, segments: InputSegment[]) {
  el.innerHTML = ''
  for (const seg of segments) {
    if (seg.type === 'text') {
      if (seg.text === '\n') {
        el.appendChild(document.createElement('br'))
      } else {
        el.appendChild(document.createTextNode(seg.text))
      }
    } else {
      el.appendChild(createPillElement(seg.id, seg.label))
    }
  }
}

export function getTextFromSegments(segments: InputSegment[]): string {
  return segments
    .map((s) => (s.type === 'text' ? s.text : s.label))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const PillInput = forwardRef<PillInputHandle, PillInputProps>(function PillInput(
  { segments, onSegmentsChange, onSubmit, placeholder, disabled = false, autoFocus = false, className, ariaLabel, onFocus, onBlur },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalChange = useRef(false)
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    insertPillsAtCursor(pills) {
      const el = editorRef.current
      if (!el || pills.length === 0) return

      const sel = window.getSelection()
      let insertAtEnd = true

      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        // Check if cursor is inside the editor
        if (el.contains(range.commonAncestorContainer)) {
          range.collapse(false) // collapse to end of selection
          for (const pill of pills) {
            const pillEl = createPillElement(pill.id, pill.label)
            range.insertNode(pillEl)
            // Move cursor after the pill
            range.setStartAfter(pillEl)
            range.collapse(true)
          }
          sel.removeAllRanges()
          sel.addRange(range)
          insertAtEnd = false
        }
      }

      if (insertAtEnd) {
        for (const pill of pills) {
          el.appendChild(createPillElement(pill.id, pill.label))
        }
        // Place cursor at end
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        const sel2 = window.getSelection()
        sel2?.removeAllRanges()
        sel2?.addRange(range)
      }

      // Parse DOM back to segments
      const newSegments = parseDOM(el)
      isInternalChange.current = true
      onSegmentsChange(newSegments)
    },
    focus() {
      editorRef.current?.focus()
    },
    getTextContent() {
      return getTextFromSegments(segmentsRef.current)
    },
  }), [onSegmentsChange])

  // Place cursor after the first node if it's a pill (so cursor is after first pill, not before)
  const placeCursorAfterFirstPillIfNeeded = useCallback((el: HTMLDivElement) => {
    const first = el.firstChild
    if (!first || first.nodeType !== Node.ELEMENT_NODE) return
    const firstEl = first as HTMLElement
    if (!firstEl.dataset?.pillId) return
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    range.setStartAfter(firstEl)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }, [])

  // Sync segments → DOM when segments change externally
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    const el = editorRef.current
    if (!el) return
    renderSegments(el, segments)
    if (segments.length > 0 && segments[0].type === 'pill') {
      const t = setTimeout(() => placeCursorAfterFirstPillIfNeeded(el), 0)
      return () => clearTimeout(t)
    }
  }, [segments, placeCursorAfterFirstPillIfNeeded])

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => editorRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  const handleInput = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const newSegments = parseDOM(el)
    isInternalChange.current = true
    onSegmentsChange(newSegments)
  }, [onSegmentsChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
  }, [onSubmit])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    handleInput()
  }, [handleInput])

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const el = editorRef.current
      if (el && el.firstChild?.nodeType === Node.ELEMENT_NODE && (el.firstChild as HTMLElement).dataset?.pillId) {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          if (!range.collapsed || !el.contains(range.startContainer)) {
            onFocus?.()
            return
          }
          const atStart = document.createRange()
          atStart.setStart(el, 0)
          atStart.setEnd(el, 0)
          const isAtStart = range.compareBoundaryPoints(Range.START_TO_START, atStart) === 0
          if (isAtStart) {
            placeCursorAfterFirstPillIfNeeded(el)
          }
        }
      }
      onFocus?.()
    },
    [onFocus, placeCursorAfterFirstPillIfNeeded],
  )

  return (
    <div
      ref={editorRef}
      className={`${styles.editor} ${className ?? ''}`}
      contentEditable={!disabled}
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={onBlur}
    />
  )
})
