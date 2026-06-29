import { useQuery } from '@tanstack/react-query'
import { MONTHS } from '@/types'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface BudgetWithProgram {
  id: string
  program_id: string
  program: { id: string; name: string; site: { id: string; name: string; currency: string; exchange_rate: number } }
  year: number; month: number; local_amount: number; usd_amount: number | null; budgeted_exchange_rate: number | null
}
interface BudgetLineItem {
  id: string; program_id: string; year: number; month: number
  category: string; producto: string | null; clase: string | null; description: string | null
  additional_desc: string | null; local_amount: number; usd_amount: number | null
  program: { id: string; name: string; site: { id: string; name: string; currency: string } }
}

export default function BudgetView() {
  const { profile } = useAuth()
  const isSiteStaff = profile?.role === 'site_staff'
  const userSiteId = profile?.site_id
  const currentYear = new Date().getFullYear()
  const currentMonthNum = new Date().getMonth() + 1

  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>(isSiteStaff ? 'monthly' : 'annual')
  const [year, setYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum)
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [expandedSite, setExpandedSite] = useState<string | null>(null)
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())

  // Annual overview data
  const { data: budgetLines = [], isLoading } = useQuery({
    queryKey: ['budget-lines', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_lines')
        .select('*, program:programs(*, site:sites(*))')
        .eq('year', year).order('month', { ascending: true })
      if (error) throw error
      return data as BudgetWithProgram[]
    },
    enabled: viewMode === 'annual',
  })

  // Monthly detail data (line items)
  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery({
    queryKey: ['budget-line-items', year, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*, program:programs(id, name, site:sites(id, name, currency))')
        .eq('year', year)
        .eq('month', selectedMonth)
        .order('producto', { ascending: true, nullsFirst: false })
        .order('clase', { ascending: true, nullsFirst: false })
        .order('category', { ascending: true })
      if (error) throw error
      return data as BudgetLineItem[]
    },
    enabled: viewMode === 'monthly',
  })

  // Group annual data by site → program
  const grouped = budgetLines.reduce((acc, line) => {
    const sid = line.program.site.id
    if (!acc[sid]) acc[sid] = { name: line.program.site.name, currency: line.program.site.currency, programs: {} }
    const pn = line.program.name
    if (!acc[sid].programs[pn]) acc[sid].programs[pn] = { monthly: {}, monthlyUsd: {} }
    acc[sid].programs[pn].monthly[line.month] = line.local_amount
    acc[sid].programs[pn].monthlyUsd[line.month] = line.usd_amount ?? (line.local_amount / (line.budgeted_exchange_rate || line.program.site.exchange_rate || 1))
    return acc
  }, {} as Record<string, { name: string; currency: string; programs: Record<string, { monthly: Record<number, number>; monthlyUsd: Record<number, number> }> }>)

  // Group monthly line items by site → program_id
  const monthlyGrouped = lineItems.reduce((acc, item) => {
    const sid = item.program.site.id
    const pid = item.program_id
    if (!acc[sid]) acc[sid] = { name: item.program.site.name, currency: item.program.site.currency, programs: {} }
    if (!acc[sid].programs[pid]) acc[sid].programs[pid] = { name: item.program.name, items: [], total: 0 }
    acc[sid].programs[pid].items.push(item)
    acc[sid].programs[pid].total += item.local_amount
    return acc
  }, {} as Record<string, { name: string; currency: string; programs: Record<string, { name: string; items: BudgetLineItem[]; total: number }> }>)

  const siteIds = Object.keys(viewMode === 'annual' ? grouped : monthlyGrouped)
  const filteredSiteIds = isSiteStaff && userSiteId ? [userSiteId] : siteFilter === 'all' ? siteIds : [siteFilter]

  const toggleProgram = (pid: string) => {
    setExpandedPrograms(prev => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Budget View — {year}</h1>
        <div className="flex gap-3 flex-wrap items-end">
          {!isSiteStaff && siteIds.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="input w-44">
                <option value="all">All Sites</option>
                {siteIds.map(id => <option key={id} value={id}>{(viewMode === 'annual' ? grouped : monthlyGrouped)[id]?.name}</option>)}
              </select>
            </div>
          )}
          {viewMode === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="input w-36">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-24">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['monthly', 'annual'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  viewMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {m === 'monthly' ? 'Monthly Detail' : 'Annual Overview'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MONTHLY DETAIL VIEW ── */}
      {viewMode === 'monthly' && (
        lineItemsLoading ? (
          <div className="card p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : Object.keys(monthlyGrouped).length === 0 ? (
          <div className="card p-8 text-center text-gray-500 text-sm">No budget line items found for {MONTHS[selectedMonth - 1]} {year}.</div>
        ) : (
          <div className="space-y-4">
            {filteredSiteIds.filter(sid => monthlyGrouped[sid]).map(sid => {
              const site = monthlyGrouped[sid]
              const siteTotal = Object.values(site.programs).reduce((s, p) => s + p.total, 0)
              return (
                <div key={sid} className="card overflow-hidden">
                  <div className="px-5 py-3 bg-navy-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{site.name}</span>
                      <span className="text-xs text-navy-200 bg-navy-500 px-2 py-0.5 rounded">{site.currency}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatCurrency(siteTotal, site.currency)}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {Object.entries(site.programs).map(([pid, prog]) => (
                      <div key={pid}>
                        <button
                          onClick={() => toggleProgram(pid)}
                          className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedPrograms.has(pid)
                              ? <ChevronDown size={15} className="text-gray-400" />
                              : <ChevronRight size={15} className="text-gray-400" />}
                            <span className="font-medium text-gray-900 text-sm">{prog.name}</span>
                            <span className="text-xs text-gray-400">{prog.items.length} line items</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{formatCurrency(prog.total, site.currency)}</span>
                        </button>
                        {expandedPrograms.has(pid) && (() => {
                          // Group items by producto first, then by clase within each producto
                          const byProducto = prog.items.reduce((acc, item) => {
                            const prod = item.producto || '—'
                            if (!acc[prod]) acc[prod] = { items: [], total: 0 }
                            acc[prod].items.push(item)
                            acc[prod].total += item.local_amount
                            return acc
                          }, {} as Record<string, { items: BudgetLineItem[]; total: number }>)

                          return (
                            <div className="border-t border-gray-100 bg-gray-50">
                              {Object.entries(byProducto).sort(([a], [b]) => a.localeCompare(b)).map(([producto, productoData]) => (
                                <div key={producto} className="border-b border-gray-100 last:border-0">
                                  {/* Producto header */}
                                  <div className="px-6 py-2 bg-indigo-50 flex justify-between items-center">
                                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{producto}</span>
                                    <span className="text-xs font-semibold text-indigo-600">{formatCurrency(productoData.total, site.currency)}</span>
                                  </div>

                                  {/* Group by clase within producto */}
                                  {(() => {
                                    const byClase = productoData.items.reduce((acc, item) => {
                                      const cl = item.clase || '—'
                                      if (!acc[cl]) acc[cl] = { items: [], total: 0 }
                                      acc[cl].items.push(item)
                                      acc[cl].total += item.local_amount
                                      return acc
                                    }, {} as Record<string, { items: BudgetLineItem[]; total: number }>)

                                    return Object.entries(byClase).sort(([a], [b]) => a.localeCompare(b)).map(([clase, claseData]) => (
                                      <div key={clase} className="border-b border-gray-100 last:border-0">
                                        <div className="px-10 py-1.5 bg-gray-100 flex justify-between items-center">
                                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{clase}</span>
                                          <span className="text-xs font-semibold text-gray-500">{formatCurrency(claseData.total, site.currency)}</span>
                                        </div>
                                        <table className="w-full text-sm">
                                          <tbody className="divide-y divide-gray-100">
                                            {claseData.items.map(item => (
                                              <tr key={item.id} className="hover:bg-white">
                                                <td className="px-10 py-2 text-gray-800 font-medium">{item.category}</td>
                                                <td className="px-4 py-2 text-gray-500 text-xs">
                                                  {item.description && <div>{item.description.trim()}</div>}
                                                  {item.additional_desc && <div className="text-gray-400">{item.additional_desc}</div>}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-gray-800 whitespace-nowrap">{formatCurrency(item.local_amount, site.currency)}</td>
                                                <td className="px-4 py-2 text-right text-gray-400 text-xs whitespace-nowrap">{item.usd_amount ? formatCurrency(item.usd_amount) : '—'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ))
                                  })()}
                                </div>
                              ))}
                              <div className="px-8 py-2 bg-gray-100 flex justify-between border-t border-gray-200">
                                <span className="text-xs font-bold text-gray-700">Program Total</span>
                                <span className="text-xs font-bold text-gray-700">{formatCurrency(prog.total, site.currency)}</span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── ANNUAL OVERVIEW ── */}
      {viewMode === 'annual' && (
        isLoading ? (
          <div className="card p-8 text-center text-gray-400 text-sm">Loading budget data…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="card p-8 text-center text-gray-500 text-sm">No budget data found for {year}.</div>
        ) : (
          <div className="space-y-4">
            {filteredSiteIds.filter(sid => grouped[sid]).map(sid => {
              const site = grouped[sid]
              return (
                <div key={sid} className="card">
                  <button onClick={() => setExpandedSite(expandedSite === sid ? null : sid)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedSite === sid ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                      <span className="font-semibold text-gray-900">{site.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{site.currency}</span>
                    </div>
                  </button>
                  {expandedSite === sid && (
                    <div className="border-t border-gray-100 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-5 py-3 text-left font-medium text-gray-600">Program</th>
                            {MONTHS.map(m => <th key={m} className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{m.slice(0, 3)}</th>)}
                            <th className="px-3 py-3 text-right font-medium text-gray-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {Object.entries(site.programs).map(([programName, data]) => {
                            const totalLocal = Object.values(data.monthly).reduce((s, v) => s + v, 0)
                            const totalUsd = Object.values(data.monthlyUsd).reduce((s, v) => s + v, 0)
                            return (
                              <tr key={programName} className="hover:bg-gray-50">
                                <td className="px-5 py-3 font-medium text-gray-900">{programName}</td>
                                {MONTHS.map((_, idx) => {
                                  const local = data.monthly[idx + 1] || 0
                                  const usd = data.monthlyUsd[idx + 1] || 0
                                  return (
                                    <td key={idx} className="px-3 py-3 text-right text-gray-600">
                                      {local > 0 ? <div><div className="text-xs">{formatCurrency(local, site.currency)}</div><div className="text-xs text-gray-400">{formatCurrency(usd)}</div></div> : '-'}
                                    </td>
                                  )
                                })}
                                <td className="px-3 py-3 text-right font-semibold">
                                  <div className="text-xs">{formatCurrency(totalLocal, site.currency)}</div>
                                  <div className="text-xs text-gray-400">{formatCurrency(totalUsd)}</div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
