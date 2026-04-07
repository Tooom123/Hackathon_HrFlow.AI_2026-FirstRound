import poulpeLogo from '../../poulpelogo.png'
import { useEffect, useState, useMemo } from 'react'
import { listJobs, getProfilesForJob, type JobCard } from '../api/hrflow'

const LS_ARCHIVED  = 'fr_archived_jobs'
const LS_SEEN      = 'fr_seen_counts'
const LS_LAYOUT    = 'fr_layout'

type SortKey = 'date-desc' | 'date-asc' | 'candidates-desc' | 'candidates-asc'
type View    = 'active' | 'archived'
type Layout  = 'grid' | 'list'

function getArchived(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_ARCHIVED) ?? '[]')) } catch { return new Set() }
}
function setArchived(s: Set<string>) {
  localStorage.setItem(LS_ARCHIVED, JSON.stringify([...s]))
}
function getSeenCounts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LS_SEEN) ?? '{}') } catch { return {} }
}
function setSeenCounts(r: Record<string, number>) {
  localStorage.setItem(LS_SEEN, JSON.stringify(r))
}

interface Props {
  recentJob: JobCard | null
  onNewSession: () => void
  onOpenJob: (job: JobCard) => void
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img src={poulpeLogo} alt="FirstRound" className="h-14 w-14 object-contain" />
      <span className="text-2xl font-extrabold tracking-tight text-zinc-100">
        First<span className="text-brand">Round</span>
      </span>
    </div>
  )
}

function SkillBadge({ name }: { name: string }) {
  return (
    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
      {name}
    </span>
  )
}

function JobCardItem({
  job, candidateCount, newCount, isArchived, onArchiveToggle, onDismissNew, onClick,
}: {
  job: JobCard
  candidateCount: number | null
  newCount: number
  isArchived: boolean
  onArchiveToggle: (e: React.MouseEvent) => void
  onDismissNew: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const skills = job.skills?.slice(0, 4) ?? []
  const hasMore = (job.skills?.length ?? 0) > 4
  const date = job.updated_at ?? job.created_at
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden text-left rounded-2xl border p-5 transition-all duration-200 active:scale-[0.98] ${
        isArchived
          ? 'border-zinc-800/50 bg-zinc-900/40 opacity-60 hover:opacity-80 hover:border-zinc-700'
          : 'border-zinc-800 hover:border-brand/30 hover:shadow-[0_0_24px_rgba(61,210,190,0.08)]'
      }`}
      style={isArchived ? {} : {
        background: 'linear-gradient(135deg, rgba(39,39,42,0.95) 0%, rgba(24,24,27,0.98) 100%)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {!isArchived && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/[0.03] to-transparent rounded-t-2xl" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-full bg-brand/0 transition-all duration-200 group-hover:bg-brand/50" />
        </>
      )}

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-zinc-100 group-hover:text-white line-clamp-2 flex-1">
            {job.name}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {newCount > 0 && (
              <span
                onClick={onDismissNew}
                title="Mark as seen"
                className="flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/25 cursor-pointer"
              >
                +{newCount} new ×
              </span>
            )}
            {candidateCount !== null && (
              <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                  <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M14 13c0-1.5-1-2.5-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {candidateCount}
              </span>
            )}
            <button
              onClick={onArchiveToggle}
              title={isArchived ? 'Restore' : 'Archive'}
              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
            >
              {isArchived ? (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M2 5h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1 2h14v3H1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 8.5l2-2 2 2M8 6.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M2 5h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1 2h14v3H1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 9.5l2 2 2-2M8 11.5v-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <svg
              viewBox="0 0 16 16" fill="none"
              className="h-3.5 w-3.5 text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-brand shrink-0"
            >
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {job.summary && (
          <p className="text-xs leading-relaxed text-zinc-500 line-clamp-3">{job.summary}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {skills.map(s => <SkillBadge key={s.name} name={s.name} />)}
            {hasMore && (
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                +{(job.skills?.length ?? 0) - 4}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {job.location?.text && (
              <span className="flex items-center gap-0.5 text-[11px] text-zinc-600">
                <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                  <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                {job.location.text}
              </span>
            )}
            {formattedDate && (
              <span className="text-[11px] text-zinc-700">{formattedDate}</span>
            )}
            {isArchived && (
              <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                Archived
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function JobRowItem({
  job, candidateCount, newCount, isArchived, onArchiveToggle, onDismissNew, onClick,
}: {
  job: JobCard; candidateCount: number | null; newCount: number
  isArchived: boolean; onArchiveToggle: (e: React.MouseEvent) => void
  onDismissNew: (e: React.MouseEvent) => void; onClick: () => void
}) {
  const skills = job.skills?.slice(0, 4) ?? []
  const hasMore = (job.skills?.length ?? 0) > 4
  const date = job.updated_at ?? job.created_at
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-xl border px-5 py-3.5 transition-all active:scale-[0.995] ${
        isArchived
          ? 'border-zinc-800/50 bg-zinc-900/30 opacity-60 hover:opacity-80 hover:border-zinc-700'
          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <p className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate max-w-xs shrink-0">
            {job.name}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-wrap gap-1 max-w-[220px] hidden lg:flex">
            {skills.map(s => (
              <span key={s.name} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">{s.name}</span>
            ))}
            {hasMore && (
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600">+{(job.skills?.length ?? 0) - 4}</span>
            )}
          </div>

          {job.location?.text && (
            <span className="hidden md:flex items-center gap-0.5 text-[11px] text-zinc-600 shrink-0">
              <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5 shrink-0">
                <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              {job.location.text}
            </span>
          )}

          {formattedDate && (
            <span className="text-[11px] text-zinc-600 shrink-0 hidden md:block w-20 text-right">{formattedDate}</span>
          )}

          {candidateCount !== null && (
            <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand shrink-0">
              <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M14 13c0-1.5-1-2.5-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {candidateCount}
            </span>
          )}

          {newCount > 0 && (
            <span
              onClick={onDismissNew}
              title="Mark as seen"
              className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/25 cursor-pointer shrink-0"
            >
              +{newCount} new ×
            </span>
          )}

          <button
            onClick={onArchiveToggle}
            title={isArchived ? 'Restore' : 'Archive'}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 shrink-0"
          >
            {isArchived ? (
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M2 5h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1 2h14v3H1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M6 8.5l2-2 2 2M8 6.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M2 5h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1 2h14v3H1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M6 9.5l2 2 2-2M8 11.5v-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-brand shrink-0">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </button>
  )
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date-desc', label: 'Newest' },
  { key: 'date-asc',  label: 'Oldest' },
  { key: 'candidates-desc', label: 'Most candidates' },
  { key: 'candidates-asc',  label: 'Fewest candidates' },
]

export default function RhHomePage({ recentJob, onNewSession, onOpenJob }: Props) {
  const [jobs, setJobs]                   = useState<JobCard[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({})
  const [archived, setArchivedState]      = useState<Set<string>>(getArchived)
  const [seenCounts, setSeenCountsState]  = useState<Record<string, number>>(getSeenCounts)
  const [sort, setSort]                   = useState<SortKey>('date-desc')
  const [view, setView]                   = useState<View>('active')
  const [sortOpen, setSortOpen]           = useState(false)
  const [layout, setLayout]               = useState<Layout>(
    () => (localStorage.getItem(LS_LAYOUT) as Layout) ?? 'grid'
  )

  useEffect(() => {
    listJobs()
      .then(fetched => {
        const all = recentJob
          ? fetched.some(j => j.key === recentJob.key) ? fetched : [recentJob, ...fetched]
          : fetched
        setJobs(all)
        all.forEach(job => {
          getProfilesForJob(job.key, 1, 1)
            .then(({ total }) => setCandidateCounts(prev => ({ ...prev, [job.key]: total })))
            .catch(() => {})
        })
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])

  function toggleArchive(jobKey: string, e: React.MouseEvent) {
    e.stopPropagation()
    setArchivedState(prev => {
      const next = new Set(prev)
      next.has(jobKey) ? next.delete(jobKey) : next.add(jobKey)
      setArchived(next)
      return next
    })
  }

  function handleOpenJob(job: JobCard) {
    onOpenJob(job)
  }

  function dismissNew(jobKey: string, e: React.MouseEvent) {
    e.stopPropagation()
    const current = candidateCounts[jobKey]
    if (current === undefined) return
    setSeenCountsState(prev => {
      const next = { ...prev, [jobKey]: current }
      setSeenCounts(next)
      return next
    })
  }

  const totalNew = useMemo(() => {
    return Object.entries(candidateCounts).reduce((acc, [key, count]) => {
      if (archived.has(key)) return acc
      const seen = seenCounts[key] ?? 0
      return acc + Math.max(0, count - seen)
    }, 0)
  }, [candidateCounts, seenCounts, archived])

  const displayedJobs = useMemo(() => {
    let list = jobs.filter(j => view === 'archived' ? archived.has(j.key) : !archived.has(j.key))
    list = [...list].sort((a, b) => {
      if (sort === 'date-desc' || sort === 'date-asc') {
        const da = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        const db = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
        return sort === 'date-desc' ? db - da : da - db
      }
      const ca = candidateCounts[a.key] ?? 0
      const cb = candidateCounts[b.key] ?? 0
      return sort === 'candidates-desc' ? cb - ca : ca - cb
    })
    return list
  }, [jobs, archived, view, sort, candidateCounts])

  const activeCount   = jobs.filter(j => !archived.has(j.key)).length
  const archivedCount = jobs.filter(j => archived.has(j.key)).length

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-24 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-10 backdrop-blur-md relative">
        <Logo />
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          <span className="text-lg font-semibold text-zinc-100 hidden sm:block">Recruiter space</span>
          {totalNew > 0 && (
            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-zinc-950 leading-none">
              +{totalNew} new
            </span>
          )}
        </div>
      </header>

      <main className="flex min-h-screen items-start justify-center px-8 pb-28 pt-36">
        <div className="w-full max-w-6xl space-y-5">

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Interview sessions</h1>
              <p className="text-sm text-zinc-500">
                {loading ? 'Loading…' : `${activeCount} active · ${archivedCount} archived`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-0.5 text-xs font-medium">
                {(['active', 'archived'] as View[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-lg px-3 py-1.5 transition-colors capitalize ${
                      view === v ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {v === 'active' ? `Active (${activeCount})` : `Archived (${archivedCount})`}
                  </button>
                ))}
              </div>

              <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-0.5">
                {(['grid', 'list'] as Layout[]).map(l => (
                  <button
                    key={l}
                    onClick={() => { setLayout(l); localStorage.setItem(LS_LAYOUT, l) }}
                    className={`rounded-lg p-1.5 transition-colors ${layout === l ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title={l === 'grid' ? 'Grid view' : 'List view'}
                  >
                    {l === 'grid' ? (
                      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                        <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative">
                <button
                  onClick={() => setSortOpen(o => !o)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {SORT_OPTIONS.find(s => s.key === sort)?.label}
                  <svg viewBox="0 0 16 16" fill="none" className={`h-3 w-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-xl shadow-black/50">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSort(opt.key); setSortOpen(false) }}
                        className={`w-full px-4 py-2 text-left text-xs transition-colors ${
                          sort === opt.key ? 'text-brand' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                      >
                        {sort === opt.key && <span className="mr-1.5">✓</span>}{opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {loading && (
            <div className={layout === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-2'}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 ${layout === 'grid' ? 'h-28' : 'h-12'}`} />
              ))}
            </div>
          )}

          {!loading && displayedJobs.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-12 text-center">
              {view === 'archived' ? (
                <p className="text-sm text-zinc-600">No archived jobs.</p>
              ) : (
                <>
                  <p className="text-sm text-zinc-600">No jobs indexed on this board.</p>
                  <button
                    onClick={onNewSession}
                    className="mt-4 text-sm font-medium text-brand transition-colors hover:text-brand/80"
                  >
                    Create the first session →
                  </button>
                </>
              )}
            </div>
          )}

          {!loading && displayedJobs.length > 0 && (
            <div className={layout === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-2'}>
              {displayedJobs.map(job => {
                const count = candidateCounts[job.key] ?? null
                const seen  = seenCounts[job.key] ?? 0
                const newC  = count !== null ? Math.max(0, count - seen) : 0
                const props = {
                  key: job.key, job, candidateCount: count, newCount: newC,
                  isArchived: archived.has(job.key),
                  onArchiveToggle: (e: React.MouseEvent) => toggleArchive(job.key, e),
                  onDismissNew: (e: React.MouseEvent) => dismissNew(job.key, e),
                  onClick: () => handleOpenJob(job),
                }
                return layout === 'grid'
                  ? <JobCardItem {...props} />
                  : <JobRowItem  {...props} />
              })}
            </div>
          )}

        </div>
      </main>

      {sortOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
      )}

      <button
        onClick={onNewSession}
        className="fixed bottom-8 right-8 z-30 flex items-center gap-2.5 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-zinc-950 shadow-2xl shadow-brand/30 transition-all hover:bg-brand-dim hover:scale-105 active:scale-[0.98]"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        New session
      </button>
    </div>
  )
}
