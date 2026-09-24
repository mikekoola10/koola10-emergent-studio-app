import React, { useState, useEffect, useRef } from 'react'
import {
  Briefcase,
  Send,
  Square,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  ScrollText,
  RefreshCw,
  ChevronDown,
  History,
} from 'lucide-react'
import {
  officeClient,
  APEX_BASE_URL,
  OfficeTask,
  OfficeSubTask,
  OfficeTaskSummary,
} from '../lib/api'

type OfficeState = 'checking' | 'online' | 'offline' | 'unconfigured'

const TERMINAL = new Set(['completed', 'completed_with_errors', 'failed', 'stopped'])

function statusBadge(status: string) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold'
  switch (status) {
    case 'completed':
      return `${base} bg-emerald-500/15 text-emerald-300 border border-emerald-400/30`
    case 'completed_with_errors':
      return `${base} bg-amber-500/15 text-amber-300 border border-amber-400/30`
    case 'failed':
      return `${base} bg-red-500/15 text-red-300 border border-red-400/30`
    case 'stopped':
      return `${base} bg-gray-500/15 text-gray-300 border border-gray-400/30`
    default:
      return `${base} bg-koola-cyan/15 text-koola-cyan border border-koola-cyan/30`
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function SubTaskIcon({ subtask }: { subtask: OfficeSubTask }) {
  if (subtask.status === 'completed')
    return <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
  if (subtask.status === 'failed')
    return <XCircle size={18} className="text-red-300 shrink-0" />
  if (subtask.status === 'pending')
    return <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-500 shrink-0" />
  return <Loader2 size={18} className="text-koola-cyan animate-spin shrink-0" />
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// Compact detail for a history row: plan, finished files, and the log tail.
function HistoryDetail({ task }: { task: OfficeTask }) {
  return (
    <div className="space-y-3 pt-1">
      {task.subtasks.length > 0 && (
        <div className="space-y-1.5">
          {task.subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2.5 text-sm">
              <SubTaskIcon subtask={st} />
              <span className="text-gray-300 truncate">{st.goal}</span>
              <span className="text-gray-600 text-xs shrink-0">· {st.type}</span>
            </div>
          ))}
        </div>
      )}
      {task.artifacts.length > 0 && (
        <div className="space-y-1.5">
          {task.artifacts.map((name) => (
            <a
              key={name}
              href={officeClient.artifactUrl(task.id, name)}
              download={name}
              className="flex items-center gap-2.5 text-sm text-koola-cyan hover:underline"
            >
              <FileText size={15} className="shrink-0" />
              <span className="font-mono truncate">{name}</span>
              <Download size={14} className="shrink-0" />
            </a>
          ))}
        </div>
      )}
      {task.logs.length > 0 && (
        <div className="bg-black/50 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-1">
          {task.logs.slice(-12).map((log, i) => (
            <div key={i} className="text-gray-500 break-words">
              <span className="text-koola-cyan/70">[{log.agent}]</span>{' '}
              <span className="text-gray-400">{log.action}</span>
              {log.details && <span> — {log.details}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const NovaOffice: React.FC = () => {
  const [office, setOffice] = useState<OfficeState>('checking')
  const [goal, setGoal] = useState('')
  const [sending, setSending] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [task, setTask] = useState<OfficeTask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<OfficeTaskSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<OfficeTask | null>(null)
  const [expanding, setExpanding] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      setHistory(await officeClient.listTasks())
    } catch {
      /* history is a bonus; the office still works without it */
    } finally {
      setHistoryLoading(false)
    }
  }

  const checkOffice = async () => {
    if (!officeClient.isConfigured()) {
      setOffice('unconfigured')
      return
    }
    setOffice('checking')
    const ok = await officeClient.health()
    setOffice(ok ? 'online' : 'offline')
  }

  useEffect(() => {
    checkOffice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The notebook: load office history once the office answers.
  useEffect(() => {
    if (office === 'online') loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [office])

  // Poll the whiteboard while the office is working.
  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    const poll = async () => {
      try {
        const t = await officeClient.getTask(taskId)
        if (cancelled) return
        setTask(t)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Polling failed.')
      }
    }
    poll()
    const timer = setInterval(async () => {
      try {
        const t = await officeClient.getTask(taskId)
        if (cancelled) return
        setTask(t)
        if (TERMINAL.has(t.status)) {
          clearInterval(timer)
          loadHistory() // the finished task joins the history
        }
      } catch {
        /* keep polling; the office may be restarting */
      }
    }, 2500)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [taskId])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [task?.logs.length])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = goal.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    setTask(null)
    try {
      const { task_id } = await officeClient.sendGoal(trimmed)
      setTaskId(task_id)
      setGoal('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the office.')
    } finally {
      setSending(false)
    }
  }

  const handleStop = async () => {
    if (!taskId) return
    try {
      await officeClient.stopTask(taskId)
      const t = await officeClient.getTask(taskId)
      setTask(t)
      loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop the task.')
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setExpandedTask(null)
      return
    }
    setExpandedId(id)
    setExpandedTask(null)
    setExpanding(true)
    try {
      setExpandedTask(await officeClient.getTask(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that task.')
      setExpandedId(null)
    } finally {
      setExpanding(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase size={28} className="text-koola-cyan" />
            <div>
              <h1 className="text-3xl font-bold text-koola-cyan">Nova's Office</h1>
              <p className="text-gray-400 text-sm mt-1">
                Give her a goal — the office plans it, works it, and hands you the finished files
              </p>
            </div>
          </div>
          {office === 'online' && task && (
            <span className={statusBadge(task.status)}>{statusLabel(task.status)}</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {office === 'unconfigured' && (
            <div className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-koola-cyan mb-2">The office isn't wired up yet</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                Nova's office (the Apex engine) needs its address before she can send work there:
              </p>
              <ol className="list-decimal list-inside text-gray-300 text-sm mt-3 space-y-1.5">
                <li>Deploy the <span className="font-mono text-koola-cyan">apex-grok-edition</span> repo on Render as a web service</li>
                <li>On this site's Render service, add an environment variable named{' '}
                  <span className="font-mono text-koola-cyan">VITE_APEX_URL</span> with the office's URL</li>
                <li>Redeploy — the office door opens automatically</li>
              </ol>
            </div>
          )}

          {office === 'checking' && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-3 text-koola-cyan" />
              Checking if Nova's office is open…
            </div>
          )}

          {office === 'offline' && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-6 text-center">
              <h2 className="text-lg font-semibold text-red-300 mb-2">The office is unreachable</h2>
              <p className="text-gray-400 text-sm mb-4">
                Tried <span className="font-mono">{APEX_BASE_URL || '(no address set)'}</span> — no answer.
              </p>
              <button
                onClick={checkOffice}
                className="inline-flex items-center gap-2 px-4 py-2 bg-koola-cyan/10 border border-koola-cyan/50 rounded-lg text-koola-cyan hover:bg-koola-cyan/20 transition-colors"
              >
                <RefreshCw size={16} /> Knock again
              </button>
            </div>
          )}

          {office === 'online' && (
            <>
              {/* Goal form */}
              <form onSubmit={handleSend} className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-5">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What should the office work on?
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                  placeholder="e.g. Write a short field guide: 5 tips for recording better 808s in FL Studio. Save it as 808-guide.md"
                  className="w-full bg-black/40 border border-koola-cyan/30 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-koola-cyan resize-y"
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    disabled={sending || !goal.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-koola-cyan text-koola-dark hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {sending ? 'Sending…' : 'Send to the office'}
                  </button>
                </div>
              </form>

              {error && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Live task view */}
              {task && (
                <div className="space-y-5">
                  <div className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current goal</div>
                        <div className="text-gray-100 font-medium">{task.goal}</div>
                      </div>
                      {!TERMINAL.has(task.status) && (
                        <button
                          onClick={handleStop}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-500/15 text-red-300 border border-red-400/40 hover:bg-red-500/25 transition-colors shrink-0"
                        >
                          <Square size={14} /> Stop
                        </button>
                      )}
                    </div>
                    <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-koola-cyan rounded-full transition-all duration-700"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <div className="text-right text-xs text-gray-400 mt-1">{task.progress}%</div>
                  </div>

                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">The plan</h3>
                      <div className="space-y-2.5">
                        {task.subtasks.map((st) => (
                          <div key={st.id} className="flex items-start gap-3 bg-black/30 rounded-lg px-4 py-3">
                            <div className="mt-0.5"><SubTaskIcon subtask={st} /></div>
                            <div className="min-w-0">
                              <div className="text-gray-100 text-sm font-medium truncate">{st.goal}</div>
                              <div className="text-gray-500 text-xs mt-0.5">
                                {st.type} · {statusLabel(st.status)}
                              </div>
                              {st.result && (
                                <div className="text-gray-400 text-xs mt-1 break-words">{st.result}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Artifacts */}
                  {task.artifacts.length > 0 && (
                    <div className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                        Finished files
                      </h3>
                      <div className="space-y-2">
                        {task.artifacts.map((name) => (
                          <a
                            key={name}
                            href={officeClient.artifactUrl(task.id, name)}
                            download={name}
                            className="flex items-center gap-3 bg-black/30 rounded-lg px-4 py-3 hover:border-koola-cyan/50 border border-transparent transition-colors"
                          >
                            <FileText size={18} className="text-koola-cyan shrink-0" />
                            <span className="text-gray-100 text-sm font-mono truncate flex-1">{name}</span>
                            <Download size={16} className="text-gray-400 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logs */}
                  {task.logs.length > 0 && (
                    <div className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <ScrollText size={16} /> Office log
                      </h3>
                      <div className="bg-black/50 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1.5">
                        {task.logs.map((log, i) => (
                          <div key={i} className="text-gray-400 break-words">
                            <span className="text-gray-600">{log.timestamp}</span>{' '}
                            <span className="text-koola-cyan/80">[{log.agent}]</span>{' '}
                            <span className="text-gray-300">{log.action}</span>
                            {log.details && <span className="text-gray-500"> — {log.details}</span>}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Office history — everything the notebook remembers */}
              <div className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-1 flex items-center gap-2">
                  <History size={16} /> Office history
                </h3>
                <p className="text-gray-500 text-xs mb-4">
                  Every goal the office has worked on — kept in the notebook, safe through restarts.
                </p>
                {historyLoading && history.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
                    <Loader2 size={18} className="animate-spin mr-2 text-koola-cyan" />
                    Opening the notebook…
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-gray-500 text-sm py-4 text-center">
                    Nothing filed yet — finished work will appear here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((h) => {
                      const open = expandedId === h.id
                      return (
                        <div key={h.id} className="bg-black/30 rounded-lg border border-transparent">
                          <button
                            onClick={() => toggleExpand(h.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left"
                          >
                            <ChevronDown
                              size={16}
                              className={`text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-gray-100 text-sm font-medium truncate">{h.goal}</div>
                              <div className="text-gray-500 text-xs mt-0.5">
                                {formatDate(h.created_at)}
                                {h.artifacts.length > 0 && ` · ${h.artifacts.length} file${h.artifacts.length > 1 ? 's' : ''}`}
                              </div>
                            </div>
                            <span className={statusBadge(h.status)}>{statusLabel(h.status)}</span>
                          </button>
                          {open && (
                            <div className="px-4 pb-4">
                              {expanding && !expandedTask ? (
                                <div className="flex items-center py-3 text-gray-500 text-sm">
                                  <Loader2 size={16} className="animate-spin mr-2 text-koola-cyan" />
                                  Pulling the file…
                                </div>
                              ) : (
                                expandedTask && <HistoryDetail task={expandedTask} />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default NovaOffice
