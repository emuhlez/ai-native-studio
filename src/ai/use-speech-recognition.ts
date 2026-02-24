import { useState, useRef, useCallback, useEffect } from 'react'

interface UseSpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onFinalTranscript?: (text: string) => void
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  transcript: string // interim
  finalTranscript: string
  isSupported: boolean
  start: () => void
  stop: () => void
  toggle: () => void
  error: string | null
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useSpeechRecognition(
  options?: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  const SpeechRecognitionClass = getSpeechRecognition()
  const isSupported = SpeechRecognitionClass != null

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onFinalTranscriptRef = useRef(options?.onFinalTranscript)
  onFinalTranscriptRef.current = options?.onFinalTranscript

  const start = useCallback(() => {
    if (!SpeechRecognitionClass || isListening) return

    setError(null)
    setTranscript('')
    setFinalTranscript('')

    const recognition = new SpeechRecognitionClass()
    recognition.lang = options?.language || 'en-US'
    recognition.continuous = options?.continuous ?? false
    recognition.interimResults = options?.interimResults ?? true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (interim) setTranscript(interim)
      if (final) {
        setFinalTranscript(final)
        setTranscript('')
        onFinalTranscriptRef.current?.(final)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return // user-initiated stop
      setError(event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [SpeechRecognitionClass, isListening, options?.language, options?.continuous, options?.interimResults])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }, [isListening, start, stop])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return {
    isListening,
    transcript,
    finalTranscript,
    isSupported,
    start,
    stop,
    toggle,
    error,
  }
}
