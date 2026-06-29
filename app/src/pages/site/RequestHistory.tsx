import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TransferRequest, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type StatusFilter = 'all' | 'draft' | 'submitted' | 'approved' | 'sent' | 'changes_requested' | 'received'

export default function RequestHistory() {
  const { profile } = useAuth()
  const siteId = profile?.site_id
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests-history', siteId, statusFilter],
    queryFn: async () => {
      const query = supabase
        .from('transfer_requests')
        .select('*, site:sites(*), line_items:request_line_items(*), disbursement:disbursements(*)')
        .eq('site_id', siteId!)
      if (statusFilter !== 'all') {
        query.eq('status', statusFilter)
      }
      const { data, error } = await query
        .order('year', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TransferRequest[]
    },
    enabled: !!siteId,
  })

  const currency = profile?.site?.currency ?? 'USD'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Request History</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'draft', 'submitted', 'approved', 'sent', 'changes_requested', 'received'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No requests yet.</p>
            <Link to="/site/new-request" className="btn-primary mt-4 inline-flex">
              Create your first request
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(req => {
              const totalLocal = req.line_items?.reduce((s, i) => s + i.local_amount, 0) ?? 0
              const totalUsd = req.line_items?.reduce((s, i) => s + (i.usd_equivalent ?? 0), 0) ?? 0
              return (
                <Link
                  key={req.id}
                  to={`/site/request/${req.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{req.month} {req.year}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(totalLocal, currency)} · {formatCurrency(totalUsd)} USD · Submitted {formatDate(req.submitted_at)}
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
