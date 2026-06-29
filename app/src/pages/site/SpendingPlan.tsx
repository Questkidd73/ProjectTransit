import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MONTHS } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface PlanItem {
  id?: string
  category: string
  producto: string | null
  clase: string | null
  description: string | null
  additional_desc: string | null
  local_amount: string
  notes: string
  _key: string
}

function emptyRow(): PlanItem {
  return { category: '', producto: null, clase: null, description: null, additional_desc: null, local_amount: '', notes: '', _key: crypto.randomUUID() }
}

export default function SpendingPlan() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()

  // Load saved month/year from localStorage, default to January/current year
  const savedMonth = parseInt(localStorage.getItem('spending-plan-month') || '1')
  const savedYear = parseInt(localStorage.getItem('spending-plan-year') || String(currentYear))

  const [month, setMonth] = useState(savedMonth)
  const [year, setYear] = useState(savedYear)

  const handleMonthChange = (m: number) => {
    setMonth(m)
    localStorage.setItem('spending-plan-month', String(m))
  }

  const handleYearChange = (y: number) => {
    setYear(y)
    localStorage.setItem('spending-plan-year', String(y))
  }
  const [planByProgram, setPlanByProgram] = useState<Record<string, PlanItem[]>>({})
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedOk, setSavedOk] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const isFinanceOrAdmin = profile?.role === 'finance' || profile?.role === 'admin'

  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('id, name, code, currency').eq('is_active', true).order('name')
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
  const selectedSite = isFinanceOrAdmin ? (allSites as any[]).find(s => s.id === selectedSiteId) : profile?.site
  const currency = selectedSite?.currency ?? 'USD'

  const { data: programs = [] } = useQuery({
    queryKey: ['programs', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('site_id', siteId!)
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!siteId,
  })

  const { data: siteProductos = [] } = useQuery({
    queryKey: ['site-productos', siteId],
    queryFn: async () => {
      if (!siteId) return []
      const { data, error } = await supabase
        .from('site_productos')
        .select('name')
        .eq('site_id', siteId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []).map((r: any) => r.name as string)
    },
    enabled: !!siteId,
  })

  const { data: siteClases = [] } = useQuery({
    queryKey: ['site-clases', siteId],
    queryFn: async () => {
      if (!siteId) return []
      const { data, error } = await supabase
        .from('site_clases')
        .select('name')
        .eq('site_id', siteId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []).map((r: any) => r.name as string)
    },
    enabled: !!siteId,
  })

  const { data: siteCategories = [] } = useQuery({
    queryKey: ['site-categories', siteId],
    queryFn: async () => {
      if (!siteId) return []
      const { data, error } = await supabase
        .from('site_categories')
        .select('name')
        .eq('site_id', siteId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []).map((r: any) => r.name as string)
    },
    enabled: !!siteId,
  })

  const { data: budgetLineItems = [] } = useQuery({
    queryKey: ['budget-line-items-plan', siteId, year, month],
    queryFn: async () => {
      const programIds = programs.map((p: any) => p.id)
      if (!programIds.length) return []
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*, program:programs(id, name)')
        .in('program_id', programIds)
        .eq('year', year)
        .eq('month', month)
        .order('producto', { ascending: true, nullsFirst: false })
        .order('clase', { ascending: true, nullsFirst: false })
        .order('category', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: programs.length > 0,
  })

  const { data: existingItems = [] } = useQuery({
    queryKey: ['spending-plan', siteId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spending_plan_items')
        .select('*')
        .eq('site_id', siteId!)
        .eq('year', year)
        .eq('month', month)
        .order('category')
      if (error) throw error
      return data
    },
    enabled: !!siteId,
  })

  useEffect(() => {
    if (!programs.length) return
    const grouped: Record<string, PlanItem[]> = {}
    programs.forEach((p: any) => { grouped[p.id] = [] })

    // Load existing spending plan items
    existingItems.forEach((item: any) => {
      if (grouped[item.program_id]) {
        grouped[item.program_id].push({
          id: item.id,
          category: item.category,
          producto: item.producto || null,
          clase: item.clase || null,
          description: item.description || null,
          additional_desc: item.additional_desc || null,
          local_amount: String(item.local_amount),
          notes: item.notes || '',
          _key: item.id,
        })
      }
    })

    // Pre-populate from budget_line_items if no spending plan exists yet
    if (existingItems.length === 0 && budgetLineItems.length > 0) {
      budgetLineItems.forEach((bli: any) => {
        if (grouped[bli.program_id]) {
          grouped[bli.program_id].push({
            category: bli.category,
            producto: bli.producto || null,
            clase: bli.clase || null,
            description: bli.description || null,
            additional_desc: bli.additional_desc || null,
            local_amount: String(bli.local_amount),
            notes: '',
            _key: crypto.randomUUID(),
          })
        }
      })
    }

    // Ensure at least one empty row per program
    programs.forEach((p: any) => {
      if (grouped[p.id].length === 0) grouped[p.id] = [emptyRow()]
    })

    setPlanByProgram(grouped)

    // Only set initial expanded state — don't override user toggles on refetch
    setExpandedPrograms(prev => {
      if (prev.size > 0) return prev
      const withData = programs
        .filter((p: any) => existingItems.some((i: any) => i.program_id === p.id) || budgetLineItems.some((bli: any) => bli.program_id === p.id))
        .map((p: any) => p.id)
      return new Set(withData.length > 0 ? withData : [programs[0]?.id].filter(Boolean))
    })
  }, [existingItems, programs, budgetLineItems])

  // Reset expanded state whenever the user navigates to a different month/year/site
  useEffect(() => {
    setExpandedPrograms(new Set())
  }, [month, year, siteId])

  const budgetMap: Record<string, number> = budgetLineItems.reduce((acc: any, bli: any) => {
    acc[bli.program_id] = (acc[bli.program_id] || 0) + bli.local_amount
    return acc
  }, {})

  function addRow(programId: string, producto?: string | null) {
    setPlanByProgram(prev => ({
      ...prev,
      [programId]: [...(prev[programId] || []), { ...emptyRow(), producto: producto ?? null }],
    }))
  }

  function updateRow(programId: string, key: string, field: keyof PlanItem, value: string) {
    setPlanByProgram(prev => ({
      ...prev,
      [programId]: prev[programId].map(item =>
        item._key === key ? { ...item, [field]: value } : item
      ),
    }))
  }

  function deleteRow(programId: string, key: string) {
    setPlanByProgram(prev => {
      const updated = prev[programId].filter(item => item._key !== key)
      return { ...prev, [programId]: updated.length ? updated : [emptyRow()] }
    })
  }

  function toggleProgram(programId: string) {
    setExpandedPrograms(prev => {
      const next = new Set(prev)
      next.has(programId) ? next.delete(programId) : next.add(programId)
      return next
    })
  }

  function programTotal(programId: string): number {
    return (planByProgram[programId] || []).reduce(
      (sum, item) => sum + (parseFloat(item.local_amount) || 0), 0
    )
  }

  async function savePlan() {
    setSaving(true)
    setSaveError('')
    setSavedOk(false)
    try {
      const toUpsert: any[] = []
      for (const [programId, items] of Object.entries(planByProgram)) {
        for (const item of items) {
          if (!item.category.trim()) continue
          toUpsert.push({
            ...(item.id ? { id: item.id } : {}),
            site_id: siteId,
            program_id: programId,
            year,
            month,
            category: item.category.trim(),
            producto: item.producto || null,
            clase: item.clase || null,
            description: item.description || null,
            additional_desc: item.additional_desc || null,
            local_amount: parseFloat(item.local_amount) || 0,
            notes: item.notes || null,
            entered_by: profile?.id,
            updated_at: new Date().toISOString(),
          })
        }
      }

      const currentIds = Object.values(planByProgram)
        .flat()
        .filter(i => i.id)
        .map(i => i.id!)

      const deletedIds = existingItems
        .filter((i: any) => !currentIds.includes(i.id))
        .map((i: any) => i.id)

      if (deletedIds.length) {
        const { error } = await supabase.from('spending_plan_items').delete().in('id', deletedIds)
        if (error) throw error
      }

      if (toUpsert.length) {
        const { error } = await supabase
          .from('spending_plan_items')
          .upsert(toUpsert, { onConflict: 'program_id,year,month,producto,clase,category,description' })
        if (error) throw error
      }

      // Create or update draft transfer request
      const currency = profile?.site?.currency ?? 'USD'
      const exchangeRate = profile?.site?.exchange_rate ?? 1

      // Check for existing draft request for this month/year
      const { data: existingDraft } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('site_id', siteId)
        .eq('year', year)
        .eq('month', month)
        .eq('status', 'draft')
        .single()

      // Aggregate spending plan items by program for request line items
      const programTotals: Record<string, { name: string; amount: number; notes: string }> = {}
      for (const [programId, items] of Object.entries(planByProgram)) {
        const programName = programs.find((p: any) => p.id === programId)?.name || 'Unknown'
        const total = items.reduce((sum, item) => sum + (parseFloat(item.local_amount) || 0), 0)
        if (total > 0) {
          programTotals[programId] = {
            name: programName,
            amount: total,
            notes: items.map(i => i.notes).filter(Boolean).join('; ') || '',
          }
        }
      }

      let requestId: string
      if (existingDraft) {
        requestId = existingDraft.id
        // Update existing draft
        const { error: updateErr } = await supabase
          .from('transfer_requests')
          .update({
            exchange_rate_at_submit: exchangeRate,
          })
          .eq('id', requestId)
        if (updateErr) throw updateErr

        // Delete existing line items
        await supabase.from('request_line_items').delete().eq('request_id', requestId)
      } else {
        // Create new draft request
        const { data: newReq, error: insertErr } = await supabase
          .from('transfer_requests')
          .insert({
            site_id: siteId,
            month,
            year,
            status: 'draft',
            exchange_rate_at_submit: exchangeRate,
          })
          .select()
          .single()
        if (insertErr) throw insertErr
        requestId = newReq.id
      }

      // Insert line items (aggregated by program)
      const lineItems = Object.entries(programTotals).map(([programId, data], idx) => ({
        request_id: requestId,
        program_id: programId,
        program_name: data.name,
        description: data.notes || data.name,
        local_amount: data.amount,
        currency,
        usd_equivalent: data.amount / exchangeRate,
        exchange_rate: exchangeRate,
        sort_order: idx,
      }))

      if (lineItems.length > 0) {
        const { error: liErr } = await supabase.from('request_line_items').insert(lineItems)
        if (liErr) throw liErr
      }

      queryClient.invalidateQueries({ queryKey: ['spending-plan', siteId, year, month] })
      queryClient.invalidateQueries({ queryKey: ['requests-history', siteId] })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const grandTotal = Object.keys(planByProgram).reduce((sum, pid) => sum + programTotal(pid), 0)
  const grandBudget = Object.values(budgetMap).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spending Plan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedSite?.name ?? 'Your Site'} · Plan monthly expenses by program against your approved budget
          </p>
        </div>
        <button
          onClick={savePlan}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Plan'}
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        {isFinanceOrAdmin && allSites.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select value={selectedSiteId ?? ''} onChange={e => setSelectedSiteId(e.target.value)} className="input w-44">
              {(allSites as any[]).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select value={month} onChange={e => handleMonthChange(Number(e.target.value))} className="input w-40">
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select value={year} onChange={e => handleYearChange(Number(e.target.value))} className="input w-28">
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{saveError}</div>
      )}
      {savedOk && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm">Spending plan saved.</div>
      )}

      {!siteId ? (
        <div className="card p-8 text-center text-gray-400 text-sm">No site assigned to your account.</div>
      ) : programs.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">No programs found for your site.</div>
      ) : (
        <div className="space-y-3">
          {programs.map((program: any) => {
            const budget = budgetMap[program.id] ?? 0
            const total = programTotal(program.id)
            const diff = budget - total
            const isOver = total > budget && budget > 0
            const isExpanded = expandedPrograms.has(program.id)

            return (
              <div key={program.id} className="card overflow-hidden">
                <button
                  onClick={() => toggleProgram(program.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-6 flex-shrink-0">
                      {isExpanded
                        ? <ChevronDown size={16} className="text-gray-400" />
                        : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                    <span className="font-semibold text-gray-900">{program.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Budget Ceiling</p>
                      <p className="font-medium text-gray-700">
                        {budget > 0 ? formatCurrency(budget, currency) : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Planned</p>
                      <p className={`font-semibold ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(total, currency)}
                      </p>
                    </div>
                    {budget > 0 && (
                      <div className="text-right w-24">
                        <p className="text-xs text-gray-400">{diff >= 0 ? 'Remaining' : 'Over Budget'}</p>
                        <p className={`font-semibold ${diff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(Math.abs(diff), currency)}
                        </p>
                      </div>
                    )}
                  </div>
                </button>

                {isExpanded && (() => {
                  const items = planByProgram[program.id] || []

                  // Producto options: site master list + any extras already on the items
                  const productoOptions = [
                    ...new Set([
                      ...siteProductos,
                      ...items.map(i => i.producto).filter(Boolean),
                    ])
                  ] as string[]

                  // Clase options: site master list + any extras already on the items
                  const claseOptions = [
                    ...new Set([
                      ...siteClases,
                      ...items.map(i => i.clase).filter(Boolean),
                    ])
                  ] as string[]

                  // Category options: site master list + any extras already on the items
                  const categoryOptions = [
                    ...new Set([
                      ...siteCategories,
                      ...items.map(i => i.category).filter(Boolean),
                    ])
                  ] as string[]

                  // Group by producto first, then by clase within each producto
                  const byProducto = items.reduce((acc: any, item: PlanItem) => {
                    const prod = item.producto || '—'
                    if (!acc[prod]) acc[prod] = { items: [], total: 0 }
                    acc[prod].items.push(item)
                    acc[prod].total += parseFloat(item.local_amount) || 0
                    return acc
                  }, {})

                  return (
                    <div className="border-t border-gray-100 bg-gray-50">
                      {Object.entries(byProducto).sort(([a], [b]) => a.localeCompare(b)).map(([producto, productoData]: [string, any]) => {
                        // Group by clase within this producto
                        const byClase = productoData.items.reduce((acc: any, item: PlanItem) => {
                          const cl = item.clase || '—'
                          if (!acc[cl]) acc[cl] = { items: [], total: 0 }
                          acc[cl].items.push(item)
                          acc[cl].total += parseFloat(item.local_amount) || 0
                          return acc
                        }, {})
                        Object.keys(byClase).forEach(cl => {
                          byClase[cl].items.sort((a: PlanItem, b: PlanItem) =>
                            (a.category || '').localeCompare(b.category || '')
                          )
                        })

                        return (
                          <div key={producto} className="border-b border-gray-200 last:border-0">
                            {/* Producto header */}
                            <div className="px-6 py-2 bg-indigo-50 flex justify-between items-center">
                              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{producto}</span>
                              <span className="text-xs font-semibold text-indigo-600">{formatCurrency(productoData.total, currency)}</span>
                            </div>

                            {Object.entries(byClase).sort(([a], [b]) => a.localeCompare(b)).map(([clase, claseData]: [string, any]) => (
                              <div key={clase} className="border-b border-gray-100 last:border-0">
                                {/* Clase header */}
                                <div className="px-10 py-1.5 bg-gray-100 flex justify-between items-center">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{clase}</span>
                                  <span className="text-xs font-semibold text-gray-500">{formatCurrency(claseData.total, currency)}</span>
                                </div>
                                <table className="w-full text-sm">
                                  <tbody className="divide-y divide-gray-100">
                                    {claseData.items.map((item: PlanItem) => (
                                      <tr key={item._key} className="hover:bg-white">
                                        <td className="px-4 py-2 w-56">
                                          <select
                                            value={item.producto || ''}
                                            onChange={e => updateRow(program.id, item._key, 'producto', e.target.value)}
                                            className="input w-full text-xs text-indigo-700"
                                          >
                                            <option value="">— unassigned —</option>
                                            {productoOptions.map(p => (
                                              <option key={p} value={p}>{p}</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="px-2 py-2 w-52">
                                          <select
                                            value={item.clase || ''}
                                            onChange={e => updateRow(program.id, item._key, 'clase', e.target.value)}
                                            className="input w-full text-xs text-gray-600"
                                          >
                                            <option value="">— unassigned —</option>
                                            {claseOptions.map(c => (
                                              <option key={c} value={c}>{c}</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="px-2 py-2">
                                          <select
                                            value={item.category || ''}
                                            onChange={e => updateRow(program.id, item._key, 'category', e.target.value)}
                                            className="input w-full text-sm font-medium"
                                          >
                                            <option value="">— select —</option>
                                            {categoryOptions.map(c => (
                                              <option key={c} value={c}>{c}</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="px-4 py-2">
                                          <input
                                            type="text"
                                            value={item.description || ''}
                                            onChange={e => updateRow(program.id, item._key, 'description', e.target.value)}
                                            className="input w-full text-xs text-gray-500"
                                            placeholder="Description"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <input
                                            type="text"
                                            value={item.additional_desc || ''}
                                            onChange={e => updateRow(program.id, item._key, 'additional_desc', e.target.value)}
                                            className="input w-full text-xs text-gray-400"
                                            placeholder="Additional detail"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <input
                                            type="number"
                                            value={item.local_amount}
                                            onChange={e => updateRow(program.id, item._key, 'local_amount', e.target.value)}
                                            className="input w-full text-right text-sm font-medium"
                                            min="0"
                                            step="0.01"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <input
                                            type="text"
                                            value={item.notes}
                                            onChange={e => updateRow(program.id, item._key, 'notes', e.target.value)}
                                            className="input w-full text-xs"
                                            placeholder="Notes"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <button
                                            onClick={() => deleteRow(program.id, item._key)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                            title="Remove row"
                                          >
                                            <Trash2 size={15} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                            {/* Per-Producto Add line item */}
                            <div className="px-6 py-1.5 bg-indigo-50 border-t border-indigo-100">
                              <button
                                onClick={() => addRow(program.id, producto === '—' ? null : producto)}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <Plus size={12} /> Add row under {producto}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      <div className="px-8 py-2 bg-gray-100 flex justify-between items-center border-t border-gray-200">
                        <button
                          onClick={() => addRow(program.id, null)}
                          className="flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium"
                        >
                          <Plus size={14} /> Add unassigned row
                        </button>
                        <span className="text-xs font-bold text-gray-700">Program Total: {formatCurrency(total, currency)}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}

          <div className="card px-5 py-4 flex justify-between items-center bg-gray-50">
            <span className="font-semibold text-gray-900">Total Planned</span>
            <div className="text-right">
              <p className="font-bold text-xl text-gray-900">{formatCurrency(grandTotal, currency)}</p>
              {grandBudget > 0 && (
                <p className="text-xs text-gray-400">
                  of {formatCurrency(grandBudget, currency)} total approved budget
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
