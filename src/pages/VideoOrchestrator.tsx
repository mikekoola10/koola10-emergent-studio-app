import React, { useState, useEffect, useRef } from 'react'
import { Video, Clapperboard, ExternalLink, XCircle } from 'lucide-react'
import { apiClient, VideoJobStatus } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const POLL_INTERVAL_MS = 3000
const MAX_CONSECUTIVE_ERRORS = 5

const statusStyles: Record<VideoJobStatus['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  processing: 'bg-koola-cyan/20 text-koola-cyan border-koola-cyan/50',
  completed: 'bg-green-500/20 text-green-400 border-green-500/50',
  failed: 'bg-red-500/20 text-red-400 border-red-500/50',
}

const VideoOrchestrator: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [activeJob, setActiveJob] = useState<VideoJobStatus | null>(null)
  const [jobHistory, setJobHistory] = useState<VideoJobStatus[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorCountRef = useRef(0)

  const isTerminal = (status: VideoJobStatus['status']) =>
    status === 'completed' || status === 'failed'

  // Poll the active job until it reaches a terminal state
  useEffect(() => {
    if (!activeJob || isTerminal(activeJob.status)) return

    const intervalId = setInterval(async () => {
      try {
        const status = await apiClient.getVideoJobStatus(activeJob.jobId)
        errorCountRef.current = 0
        setActiveJob(status)
        if (isTerminal(status.status)) {
          setJobHistory((h) => [
            status,
            ...h.filter((j) => j.jobId !== status.jobId),
          ])
        }
      } catch (err) {
        errorCountRef.current += 1
        if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
          const failed: VideoJobStatus = {
            jobId: activeJob.jobId,
            status: 'failed',
            error:
              err instanceof Error
                ? `Lost contact with the render farm: ${err.message}`
                : 'Lost contact with the render farm after repeated attempts.',
          }
          setActiveJob(failed)
          setJobHistory((h) => [failed, ...h.filter((j) => j.jobId !== failed.jobId)])
        }
        // Otherwise keep polling — transient network blips shouldn't kill the job
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [activeJob])

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isStarting) return

    setIsStarting(true)
    setError(null)
    errorCountRef.current = 0

    try {
      const job = await apiClient.startVideoJob(prompt.trim())
      setActiveJob({ ...job, status: job.status as VideoJobStatus['status'] })
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start video job')
    } finally {
      setIsStarting(false)
    }
  }

  const renderProgress = (job: VideoJobStatus) => {
    if (job.status === 'completed' || job.status === 'failed') return null
    const pct = typeof job.progress === 'number' ? Math.min(100, Math.max(0, job.progress)) : null
    return (
      <div className="mt-3">
        <div className="h-2 bg-black/50 rounded-full overflow-hidden">
          {pct !== null ? (
            <div
              className="h-full bg-koola-cyan rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          ) : (
            <div className="h-full w-1/3 bg-koola-cyan/70 rounded-full animate-pulse" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {pct !== null ? `${Math.round(pct)}%` : 'Working...'}
        </p>
      </div>
    )
  }

  const renderJobCard = (job: VideoJobStatus, isActive: boolean) => (
    <div
      key={job.jobId}
      className={`bg-koola-purple/20 border rounded-lg p-5 ${
        isActive ? 'border-koola-cyan/60 shadow-lg shadow-koola-cyan/10' : 'border-koola-cyan/20'
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-400 font-mono truncate">Job {job.jobId}</p>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusStyles[job.status]}`}
        >
          {job.status.toUpperCase()}
        </span>
      </div>

      {renderProgress(job)}

      {job.status === 'completed' && job.resultUrl && (
        <a
          href={job.resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors text-sm"
        >
          <ExternalLink size={16} />
          <span>Watch result</span>
        </a>
      )}
      {job.status === 'completed' && !job.resultUrl && (
        <p className="mt-3 text-sm text-gray-400">
          Render finished, but no result link was returned.
        </p>
      )}

      {job.status === 'failed' && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/40 rounded-lg flex items-start space-x-2">
          <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            {job.error || 'The render job failed. Try again with a simpler prompt.'}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <h1 className="text-3xl font-bold text-koola-cyan">Video Orchestrator</h1>
        <p className="text-gray-400 text-sm mt-1">
          Submit a prompt — the render farm turns broadcasts into video
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Start job form */}
        <form
          onSubmit={handleStart}
          className="p-6 bg-koola-purple/20 border border-koola-cyan/30 rounded-lg space-y-4"
        >
          <label className="block text-sm font-medium text-gray-300">
            Render prompt
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Idiomsz x Skrollz pilot — neon diner cold open..."
              disabled={isStarting}
              className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStarting || !prompt.trim()}
              className="px-6 py-3 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Clapperboard size={18} />
              <span>{isStarting ? 'Starting...' : 'Start Render'}</span>
            </button>
          </div>
        </form>

        {error && <ErrorState error={error} onRetry={() => setError(null)} />}

        {/* Active job */}
        {activeJob && (
          <div>
            <h2 className="text-xl font-bold text-koola-cyan mb-3">Active Render</h2>
            {renderJobCard(activeJob, true)}
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="text-xl font-bold text-koola-cyan mb-3">Render History</h2>
          {isStarting && <LoadingState message="Waking the render farm..." />}
          {!isStarting && jobHistory.length === 0 && !activeJob && (
            <EmptyState
              message="No renders yet. Submit a prompt above and watch the Orbz get to work."
              icon={<Video size={48} className="text-koola-cyan/40 mb-4" />}
            />
          )}
          <div className="space-y-4">
            {jobHistory
              .filter((j) => j.jobId !== activeJob?.jobId)
              .map((job) => renderJobCard(job, false))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoOrchestrator
