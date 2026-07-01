import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ArrowLeft, Send, ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MONTHS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { notifyStatusChange } from '@/lib/notifications'

interface InOutItem {
  program_id: string
  program_name: string
  description: string
  local_amount: string
  _key: string
}

function emptyItem(): InOutItem {
  return { program_id: '', program_name: '', description: '', local_amount: '', _key: crypto.randomUUID() }
}

export default function InOutRequest() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const currentMonthNum = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [monthNum, setMonthNum] = useState(currentMonthNum)
  const [year, setYear] = useState(currentYear)
  const [siteNotes, setSiteNotes] = useState('')
  const [items, setItems] = useState<InOutItem[]>([emptyItem()])
  const [submitError, setSubmitError] = useState('')

  const siteId = profile?.site_id
  const currency = profile?.site?.currency ?? 'USD'
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

  function updateItem(key: string, field: keyof InOutItem, value: string) {
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item
      const updated = { ...item, [field]: value }
      if (field === 'program_id') {
        const prog = (programs as any[]).find(p => p.id === value)
        updated.program_name = prog?.name ?? ''
      }
      return updated
    }))
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => i._key !== key))
  }

  const validItems = items.filter(i => i.local_amount && Number(i.local_amount) > 0)
  const totalLocal = validItems.reduce((s, i) => s + Number(i.local_amount), 0)

  const mutation = useMutation({
    mutationFn: async (draft: boolean) => {
      const { data: req, error: reqErr } = await supabase
        .from('transfer_requests')
        .insert({
          site_id: siteId,
          month: monthName,
          year,
          status: draft ? 'draft' : 'submitted',
          request_type: 'inout',
          submitted_by: draft ? null : profile!.id,
          submitted_at: draft ? null : new Date().toISOString(),
          exchange_rate_at_submit: 1,
          site_notes: siteNotes || null,
        })
        .select()
        .single()
      if (reqErr) throw reqErr

      const lineItems = validItems.map((item, idx) => ({
        request_id: req.id,
        program_id: item.program_id || null,
        program_name: item.program_name || 'In/Out',
        description: item.description || item.program_name || 'In/Out Transfer',
        local_amount: Number(item.local_amount),
        currency,
        usd_equivalent: null,
        exchange_rate: null,
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
      if (req.status === 'submitted') notifyStatusChange(req.id, 'submitted')
      navigate(`/site/request/${req.id}`)
    },
  })

  async function handleSubmit(draft: boolean) {
    setSubmitError('')
    if (!draft && validItems.length === 0) {
      setSubmitError('Add at least one line item before submitting.')
      return
    }
    try {
      await mutation.mutateAsync(draft)
    } catch (e) {
      setSubmitError((e as Error).message)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/site')} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">In/Out Transfer Request</h1>
          <p className="text-gray-500 text-sm mt-0.5">{profile?.site?.name}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <ArrowRightLeft size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          In/Out transfers are sent in <strong>exact local currency ({currency})</strong> — no exchange rate
          conversion or FX discount applied. Use this for funds that must arrive as a precise local amount.
        </p>
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
            placeholder="Purpose of this In/Out transfer…"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Transfer Items — {monthName} {year}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Enter each item with the exact {currency} amount needed.
          </p>
        </div>

        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item._key} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Program (optional)</label>
                  <select
                    value={item.program_id}
                    onChange={e => updateItem(item._key, 'program_id', e.target.value)}
                    className="form-input"
                  >
                    <option value="">No program / general</option>
                    {(programs as any[]).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Amount ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.local_amount}
                    onChange={e => updateItem(item._key, 'local_amount', e.target.value)}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="form-label">Description / Purpose</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(item._key, 'description', e.target.value)}
                    className="form-input"
                    placeholder="What is this transfer for?"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item._key)}
                    className="btn-secondary p-2 text-red-400 hover:text-red-600 hover:border-red-200 mb-0.5"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={addItem} className="btn-secondary w-full">
            <Plus size={16} /> Add Item
          </button>
        </div>

        {totalLocal > 0 && (
          <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 rounded-b-xl flex justify-between items-center">
            <div>
              <span className="font-semibold text-gray-700">Total to Transfer</span>
              <p className="text-xs text-blue-600 mt-0.5">Finance will send this exact amount in {currency}</p>
            </div>
            <p className="font-bold text-xl text-gray-900">{formatCurrency(totalLocal, currency)}</p>
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
