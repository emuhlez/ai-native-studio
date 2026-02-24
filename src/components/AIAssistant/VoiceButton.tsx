import { useEffect, useState } from 'react'
import { MicOff } from 'lucide-react'
import { useSpeechRecognition } from '../../ai/use-speech-recognition'
import sendIcon from '../../../icons/send.svg'
import micIcon from '../../../icons/microphone.svg'
import styles from './VoiceButton.module.css'
import aiStyles from './AIAssistant.module.css'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  hasText?: boolean
  onSendClick?: () => void
  onListeningTranscript?: (text: string) => void
  /** 'large' for viewport pill (bigger tap target and icon) */
  size?: 'default' | 'large'
  /** Use same look as collapsed AI Assistant row (button + img send/mic) */
  useCollapsedStyle?: boolean
}

export function VoiceButton({ onTranscript, hasText = false, onSendClick, onListeningTranscript, size = 'default', useCollapsedStyle = false }: VoiceButtonProps) {
  const [accumulatedFinal, setAccumulatedFinal] = useState('')

  const {
    isListening,
    transcript,
    isSupported,
    toggle,
    error,
  } = useSpeechRecognition({
    onFinalTranscript: (text) => {
      setAccumulatedFinal((prev) => prev + (prev ? ' ' : '') + text)
    },
  })

  // Reset accumulated when starting to listen; stream dictated text into parent input while listening
  useEffect(() => {
    if (isListening) {
      setAccumulatedFinal('')
    }
  }, [isListening])

  useEffect(() => {
    if (isListening && onListeningTranscript) {
      const displayText = accumulatedFinal + (transcript ? (accumulatedFinal ? ' ' : '') + transcript : '')
      onListeningTranscript(displayText)
    }
  }, [isListening, accumulatedFinal, transcript, onListeningTranscript])

  if (!isSupported) return null

  const showSend = hasText && onSendClick

  const errorMessage =
    error &&
    (error === 'network'
      ? 'Voice unavailable. Check your connection.'
      : error === 'not-allowed'
        ? 'Microphone access was denied.'
        : error === 'no-speech'
          ? 'No speech detected. Try again.'
          : error === 'audio-capture'
            ? 'No microphone found.'
            : `Voice error: ${error}`)

  const handleClick = () => {
    if (showSend) {
      onSendClick?.()
    } else {
      toggle()
    }
  }

  const iconSize = useCollapsedStyle ? 24 : size === 'large' ? 18 : 12
  const isCollapsed = useCollapsedStyle

  const buttonClass = isCollapsed
    ? `${aiStyles.collapsedRowIconWrap} ${aiStyles.collapsedRowVoiceButton} ${isListening && !showSend ? aiStyles.collapsedRowVoiceButtonListening : ''}`
    : `${styles.micButton} ${size === 'large' ? styles.micButtonLarge : ''} ${isListening && !showSend ? styles.listening : ''} ${showSend ? styles.sendButton : ''}`
  const iconClass = isCollapsed ? `${aiStyles.collapsedRowIcon} ${aiStyles.collapsedRowIconLarge}` : ''

  return (
    <div className={isCollapsed ? '' : `${styles.container} ${size === 'large' ? styles.containerLarge : ''}`}>
      <button
        type="button"
        className={buttonClass}
        onClick={handleClick}
        title={showSend ? 'Send' : isListening ? 'Stop listening' : 'Voice input'}
      >
        {showSend ? (
          <img src={sendIcon} alt="" width={iconSize} height={iconSize} className={iconClass || undefined} aria-hidden />
        ) : isListening ? (
          isCollapsed ? (
            <img src={micIcon} alt="" width={iconSize} height={iconSize} className={iconClass || undefined} aria-hidden />
          ) : (
            <MicOff size={iconSize} />
          )
        ) : (
          <img src={micIcon} alt="" width={iconSize} height={iconSize} className={iconClass || undefined} aria-hidden />
        )}
      </button>

      {error && (
        <div className={styles.error}>
          {errorMessage}
        </div>
      )}
    </div>
  )
}
