import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MONTHS } from '@/types'
import { calcUsdEquivalent, formatCurrency } from '@/lib/utils'

interface RequestRow {
  program_id: string
  program_name: string
  amount: string
  notes: string
}

export default function NewRequest() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: editId } = useParams<{ id: string }>()
  const isEdit = !!editId

  const currentMonthNum = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [monthNum, setMonthNum] = useState(currentMonthNum)
  const [year, setYear] = useState(currentYear)
  const [siteNotes, setSiteNotes] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [submitError, setSubmitError] = useState('')
  const initializedRef = useRef('')

  // Load existing request when editing
  const { data: existingRequest } = useQuery({
    queryKey: ['request', editId],
    queryFn: async () => {
      if (!editId) return null
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*, line_items:request_line_items(*)')
        .eq('id', editId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!editId,
  })

  // Initialize form from existing request
  useEffect(() => {
    if (existingRequest) {
      setMonthNum(MONTHS.indexOf(existingRequest.month) + 1)
      setYear(existingRequest.year)
      setSiteNotes(existingRequest.site_notes || '')
      setRows(existingRequest.line_items?.map((li: any) => ({
        program_id: li.program_id,
        program_name: li.program_name,
        amount: String(li.local_amount),
        notes: li.description || '',
      })) || [])
    }
  }, [existingRequest])

  const siteId = profile?.site_id
  const currency = profile?.site?.currency ?? 'USD'
  const exchangeRate = profile?.site?.exchange_rate ?? 1
  const monthName = MONTHS[monthNum - 1]

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
    queryKey: ['budget-lines-req', siteId, year, monthNum],
    queryFn: async () => {
      const programIds = programs.map((p: any) => p.id)
      if (!programIds.length) return []
      const { data, error } = await supabase
        .from('budget_lines')
        .select('*')
        .in('program_id', programIds)
        .eq('year', year)
        .eq('month', monthNum)
      if (error) throw error
      return data
    },
    enabled: programs.length > 0,
  })

  const { data: spendingItems = [] } = useQuery({
    queryKey: ['spending-plan-req', siteId, year, monthNum],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spending_plan_items')
        .select('program_id, local_amount')
        .eq('site_id', siteId!)
        .eq('year', year)
        .eq('month', monthNum)
      if (error) throw error
      return data
    },
    enabled: !!siteId,
  })

  const { data: ytdLineItems = [] } = useQuery({
    queryKey: ['ytd-items', siteId, year],
    queryFn: async () => {
      const { data: requests, error: reqErr } = await supabase
        .from('transfer_requests')
        .select('id, month')
        .eq('site_id', siteId!)
        .eq('year', year)
        .in('status', ['approved', 'sent', 'received'])
      if (reqErr) throw reqErr
      if (!requests?.length) return []

      const requestIds = requests.map((r: any) => r.id)
      const monthMap = Object.fromEntries(
        requests.map((r: any) => [r.id, MONTHS.indexOf(r.month) + 1])
      )
      const { data: lineItems, error: liErr } = await supabase
        .from('request_line_items')
        .select('program_id, local_amount, request_id')
        .in('request_id', requestIds)
      if (liErr) throw liErr
      return (lineItems || []).map((item: any) => ({
        ...item,
        month_num: monthMap[item.request_id] || 0,
      }))
    },
    enabled: !!siteId,
  })

  const budgetMap: Record<string, number> = Object.fromEntries(
    budgetLines.map((bl: any) => [bl.program_id, bl.local_amount])
  )

  const spendingMap: Record<string, number> = spendingItems.reduce((acc: any, item: any) => {
    acc[item.program_id] = (acc[item.program_id] || 0) + item.local_amount
    return acc
  }, {})

  const ytdMap: Record<string, number> = ytdLineItems.reduce((acc: any, item: any) => {
    if (item.month_num <= monthNum) {
      acc[item.program_id] = (acc[item.program_id] || 0) + item.local_amount
    }
    return acc
  }, {})

  useEffect(() => {
    const key = `${siteId}-${year}-${monthNum}`
    if (!programs.length || initializedRef.current === key) return
    initializedRef.current = key
    setRows(programs.map((p: any) => ({
      program_id: p.id,
      program_name: p.name,
      amount: spendingMap[p.id] ? String(spendingMap[p.id]) : '',
      notes: '',
    })))
  }, [programs, spendingItems, siteId, year, monthNum])

  function updateRow(programId: string, field: 'amount' | 'notes', value: string) {
    setRows(prev => prev.map(row =>
      row.program_id === programId ? { ...row, [field]: value } : row
    ))
  }

  const activeRows = rows.filter(r => r.amount && Number(r.amount) > 0)
  const totalLocal = activeRows.reduce((s, r) => s + Number(r.amount), 0)
  const totalUsd = calcUsdEquivalent(totalLocal, exchangeRate)

  const mutation = useMutation({
    mutationFn: async (draft: boolean) => {
      let req: any

      if (isEdit) {
        // Update existing request
        const { data, error: reqErr } = await supabase
          .from('transfer_requests')
          .update({
            month: monthName,
            year,
            status: draft ? 'draft' : 'submitted',
            submitted_by: draft ? null : profile!.id,
            submitted_at: draft ? null : new Date().toISOString(),
            exchange_rate_at_submit: exchangeRate,
            site_notes: siteNotes || null,
          })
          .eq('id', editId)
          .select()
          .single()
        if (reqErr) throw reqErr
        req = data

        // Delete existing line items
        await supabase.from('request_line_items').delete().eq('request_id', editId)
      } else {
        // Create new request
        const { data, error: reqErr } = await supabase
          .from('transfer_requests')
          .insert({
            site_id: siteId,
            month: monthName,
            year,
            status: draft ? 'draft' : 'submitted',
            submitted_by: draft ? null : profile!.id,
            submitted_at: draft ? null : new Date().toISOString(),
            exchange_rate_at_submit: exchangeRate,
            site_notes: siteNotes || null,
          })
          .select()
          .single()
        if (reqErr) throw reqErr
        req = data
      }

      const lineItems = activeRows.map((row, idx) => ({
        request_id: req.id,
        program_id: row.program_id,
        program_name: row.program_name,
        description: row.notes || row.program_name,
        local_amount: Number(row.amount),
        currency,
        usd_equivalent: calcUsdEquivalent(Number(row.amount), exchangeRate),
        exchange_rate: exchangeRate,
        sort_order: idx,
      }))

      if (lineItems.length > 0) {
        const { error: itemErr } = await supabase
          .from('request_line_items')
          .insert(lineItems)
        if (itemErr) throw itemErr
      }

      return req
    },
    onSuccess: (req) => {
      queryClient.invalidateQueries({ queryKey: ['requests', siteId] })
      queryClient.invalidateQueries({ queryKey: ['request', editId] })
      navigate(`/site/request/${req.id}`)
    },
  })

  async function handleSubmit(draft: boolean) {
    setSubmitError('')
    if (!draft && activeRows.length === 0) {
      setSubmitError('Enter at least one program amount before submitting.')
      return
    }
    try {
      await mutation.mutateAsync(draft)
    } catch (e) {
      setSubmitError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/site')} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Transfer Request' : 'New Transfer Request'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {profile?.site?.name} · {currency} → USD @ {exchangeRate}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Month</label>
            <select value={monthNum} onChange={e => setMonthNum(Number(e.target.value))} className="form-input">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="form-input">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="form-label">Notes to Finance (optional)</label>
          <textarea
            value={siteNotes}
            onChange={e => setSiteNotes(e.target.value)}
            className="form-input resize-none"
            rows={2}
            placeholder="Any context Finance should know…"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Request by Program — {monthName} {year}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Amounts pre-filled from your Spending Plan. Adjust as needed. Leave blank for programs you're not requesting this month.
          </p>
        </div>

        {!siteId ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No site assigned to your account.</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading programs…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Program</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    Budget ({monthName})
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    Spending Plan
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    YTD Approved
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    Request Amount ({currency})
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => {
                  const budget = budgetMap[row.program_id] ?? 0
                  const planned = spendingMap[row.program_id] ?? 0
                  const ytd = ytdMap[row.program_id] ?? 0
                  const amount = Number(row.amount) || 0
                  const isOver = budget > 0 && amount > budget

                  return (
                    <tr key={row.program_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.program_name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {budget > 0 ? formatCurrency(budget, currency) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {planned > 0 ? formatCurrency(planned, currency) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {ytd > 0 ? formatCurrency(ytd, currency) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={e => updateRow(row.program_id, 'amount', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className={`input w-full text-right text-sm ${isOver ? 'border-red-300 bg-red-50' : ''}`}
                        />
                        {isOver && (
                          <p className="text-xs text-red-500 mt-0.5 text-right">Exceeds budget</p>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={e => updateRow(row.program_id, 'notes', e.target.value)}
                          placeholder="Optional"
                          className="input w-full text-sm"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalLocal > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total Request</span>
            <div className="text-right">
              <p className="font-bold text-gray-900">{formatCurrency(totalLocal, currency)}</p>
              <p className="text-xs text-gray-400">≈ {formatCurrency(totalUsd)} USD @ {exchangeRate}</p>
            </div>
          </div>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {submitError}
        </p>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => handleSubmit(true)}
          disabled={mutation.isPending}
          className="btn-secondary"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={mutation.isPending}
          className="btn-primary"
        >
          <Send size={16} />
          {mutation.isPending ? 'Submitting…' : 'Submit to Finance'}
        </button>
      </div>
    </div>
  )
}
