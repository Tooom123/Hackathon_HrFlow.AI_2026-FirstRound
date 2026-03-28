import { Routes, Route } from 'react-router-dom'
import RecruiterApp from './pages/RecruiterApp'
import CandidateUploadPage from './pages/CandidateUploadPage'
import CandidateInterviewPage from './pages/CandidateInterviewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RecruiterApp />} />
      <Route path="/session/:sessionId" element={<CandidateUploadPage />} />
      <Route path="/session/:sessionId/interview" element={<CandidateInterviewPage />} />
    </Routes>
  )
}
