import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, MapPin, Layers, TrendingUp, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TransferRequest, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function AdminDashboard() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*, site:sites(*), line_items:request_line_items(*)')
        .order('submitted_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as TransferRequest[]
    },
  })

  const { data: counts } = useQuery({
    queryKey: ['admin-counts'],
    queryFn: async () => {
      const [sites, users, programs] = await Promise.all([
        supabase.from('sites').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('programs').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])
      return {
        sites: sites.count ?? 0,
        users: users.count ?? 0,
        programs: programs.count ?? 0,
      }
    },
  })

  const stats = [
    { label: 'Sites', value: counts?.sites ?? '…', icon: MapPin, href: '/admin/sites', color: 'text-blue-600' },
    { label: 'Users', value: counts?.users ?? '…', icon: Users, href: '/admin/users', color: 'text-purple-600' },
    { label: 'Programs', value: counts?.programs ?? '…', icon: Layers, href: '/admin/programs', color: 'text-emerald-600' },
    { label: 'Requests (All)', value: requests.length, icon: TrendingUp, href: null, color: 'text-gray-600' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{s.label}</p>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            {s.href && (
              <Link to={s.href} className="text-xs text-navy-600 hover:underline mt-2 inline-block">
                Manage →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All Recent Requests</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(req => {
              const totalUsd = req.line_items?.reduce((s, i) => s + (i.usd_equivalent ?? 0), 0) ?? 0
              return (
                <Link
                  key={req.id}
                  to={`/finance/request/${req.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{req.site?.name} — {req.month} {req.year}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(totalUsd)} · {formatDate(req.submitted_at)}
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
