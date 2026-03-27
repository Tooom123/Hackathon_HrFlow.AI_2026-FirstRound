import { useState } from 'react'
import type { SetupJobResponse } from './api/hrflow'
import RhSetupPage from './pages/RhSetupPage'
import RhQuestionsPage from './pages/RhQuestionsPage'

type Step = 'setup' | 'questions'

interface SessionState {
  result: SetupJobResponse
  questions: string[]
}

export default function App() {
  const [step, setStep] = useState<Step>('setup')
  const [session, setSession] = useState<SessionState | null>(null)

  if (step === 'questions' && session) {
    return (
      <RhQuestionsPage
        result={session.result}
        onBack={() => setStep('setup')}
        onContinue={(questions) => {
          setSession(prev => prev ? { ...prev, questions } : null)
          // prochaine étape à brancher ici
        }}
      />
    )
  }

  return (
    <RhSetupPage
      onComplete={(result) => {
        setSession({ result, questions: result.questions })
        setStep('questions')
      }}
    />
  )
}
