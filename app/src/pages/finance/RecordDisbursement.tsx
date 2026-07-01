import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TransferRequest, TRANSFER_METHODS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { notifyStatusChange } from '@/lib/notifications'

export default function RecordDisbursement() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [usdSent, setUsdSent] = useState('')
  const [sentDate, setSentDate] = useState('')
  const [method, setMethod] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [financeNotes, setFinanceNotes] = useState('')
  const [error, setError] = useState('')

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*, site:sites(*), line_items:request_line_items(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as TransferRequest
    },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const { error: disbErr } = await supabase
        .from('disbursements')
        .insert({
          request_id: id,
          usd_sent: Number(usdSent),
          sent_date: sentDate,
          method,
          reference_number: referenceNumber || null,
          finance_notes: financeNotes || null,
          recorded_by: profile!.id,
          recorded_at: new Date().toISOString(),
        })
      if (disbErr) throw disbErr

      const { error: reqErr } = await supabase
        .from('transfer_requests')
        .update({ status: 'sent' })
        .eq('id', id!)
      if (reqErr) throw reqErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-requests'] })
      notifyStatusChange(id!, 'sent')
      navigate('/finance')
    },
  })

  if (isLoading) return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
  if (!req) return null

  const totalUsd = req.line_items?.reduce((s, i) => s + (i.usd_equivalent ?? 0), 0) ?? 0

  async function handleSubmit() {
    setError('')
    if (!usdSent || !sentDate || !method) {
      setError('Fill in amount sent, date, and transfer method.')
      return
    }
    try {
      await mutation.mutateAsync()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Disbursement</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {req.site?.name} — {req.month} {req.year} · Requested {formatCurrency(totalUsd)}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">USD Amount Sent</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={usdSent}
              onChange={e => setUsdSent(e.target.value)}
              className="form-input"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="form-label">Date Sent</label>
            <input
              type="date"
              value={sentDate}
              onChange={e => setSentDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Transfer Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="form-input">
            <option value="">Select method…</option>
            {TRANSFER_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">Reference / Confirmation # (optional)</label>
          <input
            type="text"
            value={referenceNumber}
            onChange={e => setReferenceNumber(e.target.value)}
            className="form-input"
            placeholder="Wire ref, check #, etc."
          />
        </div>

        <div>
          <label className="form-label">Notes to site (optional)</label>
          <textarea
            value={financeNotes}
            onChange={e => setFinanceNotes(e.target.value)}
            className="form-input resize-none"
            rows={3}
            placeholder="Any notes for the site team about this transfer…"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="btn-success gap-2"
          >
            <Send size={16} />
            {mutation.isPending ? 'Saving…' : 'Mark as Sent'}
          </button>
        </div>
      </div>
    </div>
  )
}
