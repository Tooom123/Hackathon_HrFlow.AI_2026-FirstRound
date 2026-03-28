import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { buildWsUrl } from '../api/hrflow'

type SessionState = 'connecting' | 'ready' | 'asking' | 'listening' | 'processing' | 'done' | 'error'

interface Answer {
  question: string
  transcript: string
  score: number | null
  evaluation: string | null
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5" />
          <path d="M8 5v3.5l2 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-sm font-semibold tracking-tight text-zinc-100">
        First<span className="text-brand">Round</span>
      </span>
    </div>
  )
}

function StateBadge({ state }: { state: SessionState }) {
  const config: Record<SessionState, { label: string; color: string }> = {
    connecting: { label: 'Connexion…', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    ready: { label: 'Prêt', color: 'bg-brand/10 text-brand border-brand/20' },
    asking: { label: 'Question en cours', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    listening: { label: 'À vous de parler', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    processing: { label: 'Analyse…', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    done: { label: 'Terminé', color: 'bg-brand/10 text-brand border-brand/20' },
    error: { label: 'Erreur', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }
  const { label, color } = config[state]
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function PulsingDot({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
    </span>
  )
}

export default function CandidateInterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  const [state, setState] = useState<SessionState>('connecting')
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [globalScore, setGlobalScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const stopMicrophone = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    mediaStreamRef.current = null
  }, [])

  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 24000, channelCount: 1 } })
      mediaStreamRef.current = stream

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }
      const ctx = audioContextRef.current
      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return
        const float32 = e.inputBuffer.getChannelData(0)
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]))
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        wsRef.current.send(int16.buffer)
      }

      source.connect(processor)
      processor.connect(ctx.destination)
    } catch {
      setError('Impossible d\'accéder au microphone. Vérifiez les permissions.')
      setState('error')
    }
  }, [])

  // Playback audio chunks
  const playAudioChunk = useCallback((base64: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
    }
    const ctx = audioContextRef.current
    const raw = atob(base64)
    const int16 = new Int16Array(raw.length / 2)
    for (let i = 0; i < int16.length; i++) {
      int16[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8)
    }
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x8000
    }
    const buffer = ctx.createBuffer(1, float32.length, 24000)
    buffer.copyToChannel(float32, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const ws = new WebSocket(buildWsUrl(sessionId))
    wsRef.current = ws

    ws.onopen = () => {
      setState('ready')
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'state_change': {
          const newState = msg.state as SessionState
          setState(newState)

          if (newState === 'listening') {
            startMicrophone()
          } else {
            stopMicrophone()
          }

          if (newState === 'done' && msg.global_score != null) {
            setGlobalScore(msg.global_score)
          }
          break
        }
        case 'question_text':
          setCurrentQuestion(msg.text)
          setTranscript(null)
          break
        case 'audio_chunk':
          playAudioChunk(msg.audio)
          break
        case 'transcript':
          setTranscript(msg.text)
          break
        case 'error':
          setError(msg.message)
          setState('error')
          break
      }
    }

    ws.onclose = () => {
      stopMicrophone()
      if (state !== 'done' && state !== 'error') {
        setState('error')
        setError('Connexion perdue')
      }
    }

    ws.onerror = () => {
      setState('error')
      setError('Erreur de connexion WebSocket')
    }

    return () => {
      stopMicrophone()
      ws.close()
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 backdrop-blur-md">
        <Logo />
        <StateBadge state={state} />
        <div className="flex items-center gap-2">
          <PulsingDot active={state === 'listening'} />
          {state === 'listening' && <span className="text-xs text-green-400">Micro actif</span>}
        </div>
      </header>

      <main className="flex min-h-screen items-start justify-center px-4 pb-16 pt-24">
        <div className="w-full max-w-2xl space-y-6">

          {/* Current question */}
          {currentQuestion && state !== 'done' && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6" style={{
              background: 'linear-gradient(135deg, rgba(39,39,42,0.95) 0%, rgba(24,24,27,0.98) 100%)',
              boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.3)',
            }}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <p className="text-xs font-medium text-brand mb-3">Question</p>
              <p className="text-base leading-relaxed text-zinc-100">{currentQuestion}</p>
            </div>
          )}

          {/* Listening indicator */}
          {state === 'listening' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-green-400"
                    style={{
                      animation: `audio-bar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <p className="text-sm text-zinc-400">Parlez maintenant…</p>
              {transcript && (
                <p className="text-sm text-zinc-500 italic max-w-md text-center">"{transcript}"</p>
              )}
            </div>
          )}

          {/* Processing */}
          {state === 'processing' && (
            <div className="flex items-center justify-center gap-3 py-8">
              <svg className="h-5 w-5 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-zinc-400">Analyse de votre réponse…</span>
            </div>
          )}

          {/* Done */}
          {state === 'done' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                  <svg viewBox="0 0 16 16" fill="none" className="h-8 w-8 text-brand">
                    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-zinc-100">Entretien terminé</h2>
                <p className="text-sm text-zinc-400">
                  Merci pour votre participation. Le recruteur recevra vos résultats.
                </p>
                {globalScore != null && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2">
                    <span className="text-sm font-medium text-zinc-300">Score global</span>
                    <span className="text-lg font-bold text-brand">{globalScore.toFixed(1)}/10</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && state === 'error' && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm mt-px">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Connecting */}
          {state === 'connecting' && (
            <div className="flex items-center justify-center gap-3 py-16">
              <svg className="h-5 w-5 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-zinc-400">Connexion à l'entretien…</span>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
