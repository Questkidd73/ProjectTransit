import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, CheckSquare, DollarSign, ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TransferRequest, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type TypeFilter = 'all' | 'budget' | 'inout'
type StatusFilter = 'active' | 'submitted' | 'approved' | 'sent'

const TYPE_LABELS: Record<string, string> = { budget: 'Budget', inout: 'In/Out' }
const TYPE_COLORS: Record<string, string> = {
  budget: 'bg-blue-100 text-blue-700',
  inout: 'bg-purple-100 text-purple-700',
}

export default function FinanceDashboard() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['finance-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*, site:sites(*), line_items:request_line_items(*), disbursement:disbursements(*)')
        .in('status', ['submitted', 'approved', 'sent'])
        .order('submitted_at', { ascending: true })
      if (error) throw error
      return data as TransferRequest[]
    },
  })

  const submitted = requests.filter(r => r.status === 'submitted')
  const approved = requests.filter(r => r.status === 'approved')
  const sent = requests.filter(r => r.status === 'sent')

  const usdTotal = (list: TransferRequest[]) =>
    list.reduce((s, r) => s + (r.line_items?.reduce((ls, i) => ls + (i.usd_equivalent ?? 0), 0) ?? 0), 0)

  const stats = [
    { label: 'Awaiting Review', value: submitted.length, usd: usdTotal(submitted), color: 'bg-blue-100 text-blue-700', icon: Clock, filter: 'submitted' as StatusFilter },
    { label: 'Approved — Unsent', value: approved.length, usd: usdTotal(approved), color: 'bg-emerald-100 text-emerald-700', icon: CheckSquare, filter: 'approved' as StatusFilter },
    { label: 'Awaiting Receipt', value: sent.length, usd: usdTotal(sent), color: 'bg-purple-100 text-purple-700', icon: DollarSign, filter: 'sent' as StatusFilter },
  ]

  const filtered = requests.filter(r => {
    const matchType = typeFilter === 'all' || r.request_type === typeFilter
    const matchStatus = statusFilter === 'active' || r.status === statusFilter
    return matchType && matchStatus
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Finance — Pending Requests</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(prev => prev === s.filter ? 'active' : s.filter)}
            className={cn(
              'card p-5 text-left transition-all',
              statusFilter === s.filter ? 'ring-2 ring-navy-500' : 'hover:shadow-md'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{s.label}</p>
              <s.icon size={18} className="text-gray-400" />
            </div>
            <p className={`text-2xl font-bold ${s.value > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{s.value}</p>
            {s.usd > 0 && <p className="text-xs text-gray-400 mt-1">{formatCurrency(s.usd)} USD</p>}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-gray-900">
            {statusFilter === 'active' ? 'All Active Requests' : STATUS_LABELS[statusFilter] + ' Requests'}
          </h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'budget', 'inout'] as TypeFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t === 'all' ? 'All' : t === 'budget' ? 'Budget' : 'In/Out'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No requests match this filter.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(req => {
              const totalLocal = req.line_items?.reduce((s, i) => s + i.local_amount, 0) ?? 0
              const totalUsd = req.line_items?.reduce((s, i) => s + (i.usd_equivalent ?? 0), 0) ?? 0
              const progCount = req.line_items?.filter(i => i.local_amount > 0).length ?? 0
              const reqType = req.request_type ?? 'budget'
              const isInOut = reqType === 'inout'

              return (
                <Link
                  key={req.id}
                  to={`/finance/request/${req.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', isInOut ? 'bg-purple-50' : 'bg-blue-50')}>
                      {isInOut
                        ? <ArrowRightLeft size={15} className="text-purple-500" />
                        : <DollarSign size={15} className="text-blue-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{req.site?.name}</p>
                        <span className="text-gray-300 text-xs">·</span>
                        <p className="text-sm text-gray-600">{req.month} {req.year}</p>
                        <span className={cn('status-badge text-xs', TYPE_COLORS[reqType])}>
                          {TYPE_LABELS[reqType]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {progCount} {isInOut ? 'item' : 'program'}{progCount !== 1 ? 's' : ''}
                        {' · '}
                        {formatCurrency(totalLocal, req.site?.currency ?? 'USD')}
                        {!isInOut && totalUsd > 0 && ` · ${formatCurrency(totalUsd)} USD`}
                        {req.submitted_at && ` · Submitted ${formatDate(req.submitted_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
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
