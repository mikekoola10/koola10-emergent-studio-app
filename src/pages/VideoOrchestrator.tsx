import React, { useState } from 'react'
import { Video, Play, Search, Loader2, ExternalLink, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { apiClient, VideoJobResponse, VideoJobStatus } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const VideoOrchestrator: React.FC = () => {
  // Start Job State
  const [prompt, setPrompt] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [newJob, setNewJob] = useState<VideoJobResponse | null>(null)

  // Status Check State
  const [searchJobId, setSearchJobId] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<VideoJobStatus | null>(null)

  const handleStartJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsStarting(true)
    setStartError(null)
    setNewJob(null)

    try {
      const response = await apiClient.startVideoJob(prompt)
      setNewJob(response)
      setSearchJobId(response.jobId)
      // Automatically check status after starting
      handleCheckStatus(null, response.jobId)
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start video job')
    } finally {
      setIsStarting(false)
    }
  }

  const handleCheckStatus = async (e: React.FormEvent | null, idOverride?: string) => {
    if (e) e.preventDefault()
    const id = idOverride || searchJobId
    if (!id.trim()) return

    setIsChecking(true)
    setCheckError(null)

    try {
      const status = await apiClient.getVideoJobStatus(id)
      setJobStatus(status)
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Failed to fetch job status')
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'processing': return 'text-koola-cyan'
      case 'pending': return 'text-yellow-400'
      case 'failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={20} className="text-green-400" />
      case 'processing': return <Loader2 size={20} className="text-koola-cyan animate-spin" />
      case 'pending': return <Clock size={20} className="text-yellow-400" />
      case 'failed': return <AlertCircle size={20} className="text-red-400" />
      default: return null
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Video className="text-koola-cyan" size={28} />
          <div>
            <h1 className="text-3xl font-bold text-koola-cyan">Video Orchestrator</h1>
            <p className="text-gray-400 text-sm mt-1">Deploy and track neural video synthesis jobs</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-12">

          {/* Section 1: Start New Job */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Play size={20} className="mr-2 text-koola-cyan" />
              Initialize Synthesis
            </h2>
            <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-xl p-6 shadow-xl">
              <form onSubmit={handleStartJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Enter the visual prompt for the video job:
                  </label>
                  <div className="flex gap-4">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Cinematic drone shot of the neon mountains, 4k, hyper-detailed..."
                      rows={2}
                      className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors resize-none"
                    />
                    <button
                      type="submit"
                      disabled={isStarting || !prompt.trim()}
                      className="px-8 py-3 bg-koola-cyan text-koola-dark font-bold rounded-lg hover:bg-koola-cyan/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center min-w-[140px]"
                    >
                      {isStarting ? <Loader2 size={24} className="animate-spin" /> : <span>Start Job</span>}
                    </button>
                  </div>
                </div>
                {startError && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/30">
                    <AlertCircle size={16} />
                    <span>{startError}</span>
                  </div>
                )}
                {newJob && (
                  <div className="flex items-center justify-between text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/30">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={16} />
                      <span>Job started successfully! Job ID: <strong>{newJob.jobId}</strong></span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* Section 2: Track Job */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Search size={20} className="mr-2 text-koola-cyan" />
              Job Monitor
            </h2>
            <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-xl p-6 shadow-xl">
              <form onSubmit={(e) => handleCheckStatus(e)} className="flex gap-4 mb-8">
                <input
                  type="text"
                  value={searchJobId}
                  onChange={(e) => setSearchJobId(e.target.value)}
                  placeholder="Enter Job ID to track..."
                  className="flex-1 px-4 py-2 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors"
                />
                <button
                  type="submit"
                  disabled={isChecking || !searchJobId.trim()}
                  className="px-6 py-2 border border-koola-cyan text-koola-cyan font-semibold rounded-lg hover:bg-koola-cyan/10 transition-all disabled:opacity-50"
                >
                  {isChecking ? 'Checking...' : 'Check Status'}
                </button>
              </form>

              {/* Status Display Area */}
              <div className="min-h-[200px]">
                {isChecking && <LoadingState message="Fetching real-time status..." />}

                {checkError && <ErrorState error={checkError} onRetry={() => handleCheckStatus(null)} />}

                {!isChecking && !checkError && !jobStatus && (
                  <EmptyState
                    message="Enter a Job ID to view progress and download results."
                    icon={<Clock size={40} className="text-gray-600 mb-4" />}
                  />
                )}

                {jobStatus && (
                  <div className="bg-black/40 rounded-xl p-8 border border-koola-cyan/20 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(jobStatus.status)}
                          <span className={`text-2xl font-bold uppercase tracking-widest ${getStatusColor(jobStatus.status)}`}>
                            {jobStatus.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400 text-sm">Job ID: <span className="text-gray-200 font-mono">{jobStatus.jobId}</span></p>
                          {jobStatus.progress !== undefined && (
                             <p className="text-gray-400 text-sm">Progress: <span className="text-koola-cyan">{jobStatus.progress}%</span></p>
                          )}
                        </div>
                      </div>

                      {jobStatus.resultUrl && (
                        <a
                          href={jobStatus.resultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center space-x-2 px-6 py-3 bg-koola-cyan text-koola-dark font-bold rounded-lg hover:scale-105 transition-all shadow-lg shadow-koola-cyan/30"
                        >
                          <ExternalLink size={18} />
                          <span>View Result</span>
                        </a>
                      )}
                    </div>

                    {/* Progress Bar for Processing */}
                    {jobStatus.status === 'processing' && jobStatus.progress !== undefined && (
                      <div className="mt-8">
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-koola-cyan/20">
                          <div
                            className="bg-koola-cyan h-full transition-all duration-500 shadow-[0_0_10px_#00F0FF]"
                            style={{ width: `${jobStatus.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {jobStatus.error && (
                       <div className="mt-6 p-4 bg-red-400/10 border border-red-400/30 rounded-lg text-red-400 text-sm flex items-start space-x-3">
                         <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                         <p>{jobStatus.error}</p>
                       </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

export default VideoOrchestrator
