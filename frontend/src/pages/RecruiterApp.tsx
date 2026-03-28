import { useState } from 'react'
import type { JobCard, SetupJobResponse } from '../api/hrflow'
import RhHomePage from './RhHomePage'
import RhSetupPage from './RhSetupPage'
import RhQuestionsPage from './RhQuestionsPage'
import RhJobPage from './RhJobPage'
import RhSessionLinkPage from './RhSessionLinkPage'

type Step = 'home' | 'setup' | 'questions' | 'session-link' | 'job'

interface SessionState {
  result: SetupJobResponse
  questions: string[]
}

export default function RecruiterApp() {
  const [step, setStep] = useState<Step>('home')
  const [session, setSession] = useState<SessionState | null>(null)
  const [recentJob, setRecentJob] = useState<JobCard | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null)

  if (step === 'setup') {
    return (
      <RhSetupPage
        onBack={() => setStep('home')}
        onComplete={(result) => {
          setSession({ result, questions: result.questions })
          setStep('questions')
        }}
      />
    )
  }

  if (step === 'questions' && session) {
    return (
      <RhQuestionsPage
        result={session.result}
        onBack={() => setStep('setup')}
        onContinue={(questions) => {
          setSession(prev => prev ? { ...prev, questions } : null)
          setStep('session-link')
        }}
      />
    )
  }

  if (step === 'session-link' && session) {
    return (
      <RhSessionLinkPage
        jobKey={session.result.job_key}
        jobTitle={session.result.job_title}
        onDone={() => {
          setRecentJob({
            key: session.result.job_key,
            reference: session.result.job_reference,
            name: session.result.job_title,
            summary: session.result.job_title,
          })
          setSession(null)
          setStep('home')
        }}
      />
    )
  }

  if (step === 'job' && selectedJob) {
    return (
      <RhJobPage
        job={selectedJob}
        onBack={() => setStep('home')}
      />
    )
  }

  return (
    <RhHomePage
      recentJob={recentJob}
      onNewSession={() => { setRecentJob(null); setStep('setup') }}
      onOpenJob={(job: JobCard) => {
        setSelectedJob(job)
        setStep('job')
      }}
    />
  )
}
