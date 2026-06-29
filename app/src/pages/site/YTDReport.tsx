import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MONTHS } from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function YTDReport() {
  const { profile } = useAuth()
  const currentYear = new Date().getFullYear()
  const currentMonthNum = new Date().getMonth() + 1

  const [year, setYear] = useState(currentYear)
  const [throughMonth, setThroughMonth] = useState(currentMonthNum)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const isFinanceOrAdmin = profile?.role === 'finance' || profile?.role === 'admin'

  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, code, currency')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: isFinanceOrAdmin,
  })

  useEffect(() => {
    if (isFinanceOrAdmin && allSites.length && !selectedSiteId) {
      setSelectedSiteId((allSites[0] as any).id)
    }
  }, [allSites, isFinanceOrAdmin, selectedSiteId])

  const siteId = isFinanceOrAdmin ? selectedSiteId : profile?.site_id
  const selectedSite = isFinanceOrAdmin
    ? (allSites as any[]).find(s => s.id === selectedSiteId)
    : profile?.site
  const currency = selectedSite?.currency ?? 'USD'

  const { data: programs = [] } = useQuery({
    queryKey: ['programs', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('site_id', siteId!)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: !!siteId,
  })

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['ytd-budget-lines', siteId, year],
    queryFn: async () => {
      const programIds = programs.map((p: any) => p.id)
      if (!programIds.length) return []
      const { data, error } = await supabase
        .from('budget_lines')
        .select('program_id, month, local_amount')
        .in('program_id', programIds)
        .eq('year', year)
      if (error) throw error
      return data
    },
    enabled: programs.length > 0,
  })

  const { data: spendingItems = [] } = useQuery({
    queryKey: ['ytd-spending', siteId, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spending_plan_items')
        .select('program_id, month, local_amount')
        .eq('site_id', siteId!)
        .eq('year', year)
      if (error) throw error
      return data
    },
    enabled: !!siteId,
  })

  const { data: approvedItems = [] } = useQuery({
    queryKey: ['ytd-approved', siteId, year],
    queryFn: async () => {
      const { data: requests, error: rErr } = await supabase
        .from('transfer_requests')
        .select('id, month')
        .eq('site_id', siteId!)
        .eq('year', year)
        .eq('request_type', 'budget')
        .in('status', ['approved', 'sent', 'received'])
      if (rErr) throw rErr
      if (!requests?.length) return []

      const reqIds = requests.map((r: any) => r.id)
      const monthMap = Object.fromEntries(
        requests.map((r: any) => [r.id, MONTHS.indexOf(r.month) + 1])
      )
      const { data: items, error: iErr } = await supabase
        .from('request_line_items')
        .select('program_id, local_amount, request_id')
        .in('request_id', reqIds)
      if (iErr) throw iErr
      return (items || []).map((i: any) => ({ ...i, month_num: monthMap[i.request_id] || 0 }))
    },
    enabled: !!siteId,
  })

  if (!siteId) {
    return <div className="card p-8 text-center text-gray-400 text-sm">No site assigned to your account.</div>
  }

  const rows = programs.map((p: any) => {
    const annualBudget = budgetLines
      .filter((bl: any) => bl.program_id === p.id)
      .reduce((s: number, bl: any) => s + bl.local_amount, 0)

    const ytdBudget = budgetLines
      .filter((bl: any) => bl.program_id === p.id && bl.month <= throughMonth)
      .reduce((s: number, bl: any) => s + bl.local_amount, 0)

    const ytdPlanned = spendingItems
      .filter((i: any) => i.program_id === p.id && i.month <= throughMonth)
      .reduce((s: number, i: any) => s + i.local_amount, 0)

    const ytdApproved = approvedItems
      .filter((i: any) => i.program_id === p.id && i.month_num <= throughMonth)
      .reduce((s: number, i: any) => s + i.local_amount, 0)

    const remaining = ytdBudget - ytdApproved
    const pctUsed = ytdBudget > 0 ? (ytdApproved / ytdBudget) * 100 : null

    return { program: p, annualBudget, ytdBudget, ytdPlanned, ytdApproved, remaining, pctUsed }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      annualBudget: acc.annualBudget + r.annualBudget,
      ytdBudget: acc.ytdBudget + r.ytdBudget,
      ytdPlanned: acc.ytdPlanned + r.ytdPlanned,
      ytdApproved: acc.ytdApproved + r.ytdApproved,
      remaining: acc.remaining + r.remaining,
    }),
    { annualBudget: 0, ytdBudget: 0, ytdPlanned: 0, ytdApproved: 0, remaining: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">YTD Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedSite?.name ?? 'Your Site'} · Budget vs. approved transfers through {MONTHS[throughMonth - 1]} {year}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isFinanceOrAdmin && allSites.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
              <select
                value={selectedSiteId ?? ''}
                onChange={e => setSelectedSiteId(e.target.value)}
                className="input w-44"
              >
                {(allSites as any[]).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Through</label>
            <select value={throughMonth} onChange={e => setThroughMonth(Number(e.target.value))} className="input w-36">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-24">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Program</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Annual Budget</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">YTD Budget</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">YTD Planned</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">YTD Approved</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Remaining</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">% Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(({ program, annualBudget, ytdBudget, ytdPlanned, ytdApproved, remaining, pctUsed }) => {
                const isOver = remaining < 0
                return (
                  <tr key={program.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{program.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {annualBudget > 0 ? formatCurrency(annualBudget, currency) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {ytdBudget > 0 ? formatCurrency(ytdBudget, currency) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {ytdPlanned > 0 ? formatCurrency(ytdPlanned, currency) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {ytdApproved > 0 ? formatCurrency(ytdApproved, currency) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${isOver ? 'text-red-600' : remaining > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {ytdBudget > 0
                        ? <>{isOver ? '-' : ''}{formatCurrency(Math.abs(remaining), currency)}</>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pctUsed !== null ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${pctUsed > 100 ? 'bg-red-500' : pctUsed > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(pctUsed, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-10 text-right ${pctUsed > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                            {pctUsed.toFixed(0)}%
                          </span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(totals.annualBudget, currency)}</td>
                <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(totals.ytdBudget, currency)}</td>
                <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(totals.ytdPlanned, currency)}</td>
                <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(totals.ytdApproved, currency)}</td>
                <td className={`px-4 py-3 text-right ${totals.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {totals.remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(totals.remaining), currency)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {totals.ytdBudget > 0 && (
                    <span className="text-xs font-medium">
                      {((totals.ytdApproved / totals.ytdBudget) * 100).toFixed(0)}%
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Annual Budget', value: totals.annualBudget, color: 'text-gray-900' },
          { label: `YTD Budget (thru ${MONTHS[throughMonth - 1]})`, value: totals.ytdBudget, color: 'text-blue-600' },
          { label: 'YTD Approved', value: totals.ytdApproved, color: 'text-gray-900' },
          { label: 'YTD Remaining', value: totals.remaining, color: totals.remaining < 0 ? 'text-red-600' : 'text-emerald-600' },
        ].map(stat => (
          <div key={stat.label} className="card px-4 py-4">
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className={`font-bold text-lg ${stat.color}`}>{formatCurrency(Math.abs(stat.value), currency)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
