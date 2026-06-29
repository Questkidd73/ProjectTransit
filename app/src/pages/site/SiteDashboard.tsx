import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FilePlus, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TransferRequest, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatDate, formatCurrency, getCurrentMonthYear } from '@/lib/utils'

export default function SiteDashboard() {
  const { profile } = useAuth()
  const siteId = profile?.site_id
  const { month, year } = getCurrentMonthYear()

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*, site:sites(*), line_items:request_line_items(*), disbursement:disbursements(*)')
        .eq('site_id', siteId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as TransferRequest[]
    },
    enabled: !!siteId,
  })

  const currentMonthRequest = requests.find(r => r.month === month && r.year === year)
  const pendingAction = requests.filter(r =>
    r.status === 'changes_requested' || r.status === 'sent'
  )

  const stats = [
    {
      label: 'This Month',
      value: currentMonthRequest ? STATUS_LABELS[currentMonthRequest.status] : 'No request yet',
      color: currentMonthRequest ? STATUS_COLORS[currentMonthRequest.status] : 'bg-gray-100 text-gray-600',
      icon: Clock,
    },
    {
      label: 'Needs Attention',
      value: pendingAction.length,
      color: pendingAction.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600',
      icon: AlertTriangle,
    },
    {
      label: 'Total Requests',
      value: requests.length,
      color: 'bg-blue-100 text-blue-700',
      icon: CheckCircle,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.site?.name ?? 'Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{month} {year}</p>
        </div>
        {!currentMonthRequest && (
          <Link to="/site/new-request" className="btn-primary">
            <FilePlus size={16} /> New Request
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <stat.icon size={18} className="text-gray-400" />
            </div>
            <span className={`status-badge text-sm ${stat.color}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {pendingAction.length > 0 && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <h2 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Action Required
          </h2>
          <div className="space-y-2">
            {pendingAction.map(req => (
              <Link
                key={req.id}
                to={`/site/request/${req.id}`}
                className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-100 hover:border-amber-300 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.month} {req.year}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {req.status === 'sent' ? 'Confirm receipt of funds' : 'Changes requested by Finance'}
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Requests</h2>
          <Link to="/site/history" className="text-sm text-navy-600 hover:underline">View all</Link>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No requests yet.</p>
            <Link to="/site/new-request" className="btn-primary mt-4 inline-flex">
              <FilePlus size={16} /> Create your first request
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.slice(0, 5).map(req => {
              const totalLocal = req.line_items?.reduce((s, i) => s + i.local_amount, 0) ?? 0
              const totalUsd = req.line_items?.reduce((s, i) => s + (i.usd_equivalent ?? 0), 0) ?? 0
              return (
                <Link
                  key={req.id}
                  to={`/site/request/${req.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.month} {req.year}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(totalLocal, req.site?.currency ?? 'USD')} local · {formatCurrency(totalUsd)} USD
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-badge ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
