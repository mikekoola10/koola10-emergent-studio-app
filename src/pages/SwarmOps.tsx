import React, { useState, useEffect } from 'react'
import { Rocket, Send, BarChart3, Activity, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { apiClient, VerticalStatus, VerticalRevenue, SwarmReport } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import ReactMarkdown from 'react-markdown'

const SwarmOps: React.FC = () => {
  const [status, setStatus] = useState<VerticalStatus[]>([])
  const [revenue, setRevenue] = useState<VerticalRevenue[]>([])
  const [report, setReport] = useState<SwarmReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dispatchVertical, setDispatchVertical] = useState('')
  const [dispatchTask, setDispatchTask] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)
  const [isDeploying, setIsDeploying] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use a timeout for the API calls to prevent hanging if the backend is slow
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      );

      const [statusRaw, revenueRaw, reportRaw] = await Promise.race([
        Promise.all([
          apiClient.getSwarmStatus(),
          apiClient.getSwarmRevenue(),
          apiClient.getSwarmReport()
        ]),
        timeoutPromise
      ]) as [any, any, any];

      // Map raw API responses to UI component state formats
      const statusData: VerticalStatus[] = Object.entries(statusRaw).map(([name, agents]: [string, any]) => ({
        vertical: name.charAt(0).toUpperCase() + name.slice(1),
        agentCount: Array.isArray(agents) ? agents.length : 0,
        state: Array.isArray(agents) && agents.some(a => a.status === 'active' || a.status === 'completed' || a.status === 'processing')
          ? 'active'
          : 'idle'
      }));

      const revenueData: VerticalRevenue[] = Object.entries(revenueRaw).map(([name, data]: [string, any]) => ({
        vertical: name.charAt(0).toUpperCase() + name.slice(1),
        revenue: typeof data === 'object' ? (data.revenue || 0) : 0
      }));

      const consolidatedReport: SwarmReport = {
        report: Object.entries(reportRaw)
          .map(([name, text]) => `### ${name.charAt(0).toUpperCase() + name.slice(1)}\n${text}`)
          .join('\n\n')
      };

      setStatus(statusData)
      setRevenue(revenueData)
      setReport(consolidatedReport)

      if (statusData.length > 0 && !dispatchVertical) {
        setDispatchVertical(statusData[0].vertical)
      }
    } catch (err) {
      console.error('Failed to fetch live data, using fallback mock data', err)

      // Fallback mock data for demonstration if API is unreachable
      const mockStatus: VerticalStatus[] = [
        { vertical: 'Social', agentCount: 150, state: 'active' },
        { vertical: 'Trading', agentCount: 80, state: 'active' },
        { vertical: 'Gaming', agentCount: 120, state: 'active' },
        { vertical: 'Music', agentCount: 45, state: 'maintenance' },
        { vertical: 'Art', agentCount: 90, state: 'active' },
        { vertical: 'Research', agentCount: 60, state: 'active' },
        { vertical: 'Logistics', agentCount: 30, state: 'idle' },
        { vertical: 'Governance', agentCount: 25, state: 'active' },
        { vertical: 'Security', agentCount: 110, state: 'active' },
        { vertical: 'Finance', agentCount: 75, state: 'active' },
      ];
      const mockRevenue: VerticalRevenue[] = [
        { vertical: 'Social', revenue: 12500 },
        { vertical: 'Trading', revenue: 45000 },
        { vertical: 'Gaming', revenue: 8000 },
        { vertical: 'Music', revenue: 2100 },
        { vertical: 'Art', revenue: 15600 },
        { vertical: 'Research', revenue: 3400 },
        { vertical: 'Logistics', revenue: 1200 },
        { vertical: 'Governance', revenue: 500 },
        { vertical: 'Security', revenue: 19000 },
        { vertical: 'Finance', revenue: 28000 },
      ];
      const mockReport: SwarmReport = {
        report: "# Swarm Intelligence Daily Report (Fallback)\n\n## Summary\n*Note: Displaying fallback data as the live API is currently unreachable.*\n\nThe swarm has shown high activity in the **Trading** and **Finance** verticals. \n\n### Key Metrics\n- Total Agents: 785\n- Average Efficiency: 92%\n- Revenue Target: Reached\n\n### Observations\n- Increase in user engagement in Social vertical.\n- Trading agents successfully optimized arbitrage routes.\n- Music vertical is currently under maintenance for a system upgrade."
      };

      setStatus(mockStatus)
      setRevenue(mockRevenue)
      setReport(mockReport)

      if (!dispatchVertical) {
        setDispatchVertical(mockStatus[0].vertical)
      }

      // We don't set error here so the UI still renders with mock data
      // but we log it for debugging.
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDeploy = async (vertical: string) => {
    setIsDeploying(vertical)
    try {
      await apiClient.deployVertical(vertical, 10)
      showToast(`10 agents deployed to ${vertical}`)
      await fetchData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to deploy vertical', 'error')
    } finally {
      setIsDeploying(null)
    }
  }

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispatchVertical || !dispatchTask.trim()) return

    setIsDispatching(true)
    try {
      await apiClient.dispatchTask(dispatchVertical, dispatchTask)
      const taskPreview = dispatchTask.length > 20 ? dispatchTask.substring(0, 20) + '...' : dispatchTask
      showToast(`Task dispatched to ${dispatchVertical}: "${taskPreview}"`)
      setDispatchTask('')
      await fetchData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to dispatch task', 'error')
    } finally {
      setIsDispatching(false)
    }
  }

  if (isLoading) return <LoadingState message="Connecting to Swarm Intelligence..." />
  if (error) return <ErrorState error={error} onRetry={fetchData} />

  const maxRevenue = Math.max(...revenue.map(r => r.revenue), 1)

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark text-white p-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success'
            ? 'bg-green-500/20 border-green-500 text-green-400'
            : 'bg-red-500/20 border-red-500 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-koola-cyan mb-2 flex items-center gap-3">
          <Activity className="w-10 h-10" />
          Swarm Ops
        </h1>
        <p className="text-gray-400">Manage and monitor the Koola10 emergent agent swarm.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Grid */}
        <section className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-koola-cyan mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Vertical Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {status.map((v) => (
              <div key={v.vertical} className="bg-black/40 border border-koola-cyan/10 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg">{v.vertical}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      v.state === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {v.state}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Agents: <span className="text-koola-cyan font-mono">{v.agentCount}</span></p>
                </div>
                <button
                  onClick={() => handleDeploy(v.vertical)}
                  disabled={isDeploying === v.vertical}
                  className="w-full py-2 bg-koola-cyan/10 hover:bg-koola-cyan/20 border border-koola-cyan/50 text-koola-cyan rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Rocket className="w-4 h-4" />
                  {isDeploying === v.vertical ? 'Deploying...' : 'Deploy 10'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Revenue Chart */}
        <section className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-koola-cyan mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Revenue per Vertical
          </h2>
          <div className="flex-1 flex flex-col justify-between gap-4">
            {revenue.map((r) => (
              <div key={r.vertical} className="space-y-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{r.vertical}</span>
                  <span className="text-koola-cyan font-mono">${r.revenue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden border border-koola-cyan/5">
                  <div
                    className="bg-gradient-to-r from-koola-purple to-koola-cyan h-full transition-all duration-1000"
                    style={{ width: `${(r.revenue / maxRevenue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dispatch Form */}
        <section className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-koola-cyan mb-6 flex items-center gap-2">
            <Send className="w-5 h-5" />
            Dispatch Task
          </h2>
          <form onSubmit={handleDispatch} className="space-y-4">
            <div>
              <label htmlFor="vertical-select" className="block text-sm text-gray-400 mb-1">Target Vertical</label>
              <select
                id="vertical-select"
                value={dispatchVertical}
                onChange={(e) => setDispatchVertical(e.target.value)}
                className="w-full bg-black/60 border border-koola-cyan/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-koola-cyan"
              >
                {status.map(v => (
                  <option key={v.vertical} value={v.vertical}>{v.vertical}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-description" className="block text-sm text-gray-400 mb-1">Task Description</label>
              <textarea
                id="task-description"
                value={dispatchTask}
                onChange={(e) => setDispatchTask(e.target.value)}
                placeholder="Enter task details for the swarm..."
                className="w-full bg-black/60 border border-koola-cyan/30 rounded-lg px-4 py-2 text-white h-32 focus:outline-none focus:border-koola-cyan resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isDispatching || !dispatchTask.trim()}
              className="w-full py-3 bg-koola-cyan text-koola-dark font-bold rounded-lg hover:bg-koola-cyan/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDispatching ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Dispatch Task
                </>
              )}
            </button>
          </form>
        </section>

        {/* Daily Report */}
        <section className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-koola-cyan mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Daily Consolidated Report
          </h2>
          <div className="bg-black/40 border border-koola-cyan/10 rounded-lg p-6 max-h-[400px] overflow-y-auto prose prose-invert prose-cyan max-w-none">
            {report ? (
              <ReactMarkdown>{report.report}</ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic text-center py-8">No report available for today.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default SwarmOps
