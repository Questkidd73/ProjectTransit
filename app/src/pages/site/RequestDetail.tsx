import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TransferRequest, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notifyStatusChange } from '@/lib/notifications'

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [localReceived, setLocalReceived] = useState('')
  const [receivedDate, setReceivedDate] = useState('')
  const [siteNotes, setSiteNotes] = useState('')
  const [error, setError] = useState('')

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*, site:sites(*), line_items:request_line_items(*), disbursement:disbursements(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as TransferRequest
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('disbursements')
        .update({
          local_received: Number(localReceived),
          received_date: receivedDate,
          confirmed_by: profile!.id,
          confirmed_at: new Date().toISOString(),
          site_notes: siteNotes || null,
        })
        .eq('request_id', id!)

      if (error) throw error

      const { error: reqErr } = await supabase
        .from('transfer_requests')
        .update({ status: 'received' })
        .eq('id', id!)

      if (reqErr) throw reqErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] })
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      notifyStatusChange(id!, 'received')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('transfer_requests')
        .delete()
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['requests-history'] })
      navigate('/site')
    },
    onError: (err) => {
      console.error('Delete failed:', err)
      setError((err as Error).message)
    },
  })

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
  }

  if (!req) return null

  const currency = req.site?.currency ?? 'USD'
  const totalLocal = req.line_items?.reduce((s, i) => s + i.local_amount, 0) ?? 0
  const totalUsd = req.line_items?.reduce((s, i) => s + (i.usd_equivalent ?? 0), 0) ?? 0
  const showConfirm = req.status === 'sent' && profile?.role === 'site_staff'
  const isDraft = req.status === 'draft'
  const isSubmitted = req.status === 'submitted'
  const isChangesRequested = req.status === 'changes_requested'
  const canEdit = (isDraft || isSubmitted || isChangesRequested) && (profile?.role === 'site_staff' || profile?.role === 'admin' || profile?.role === 'finance')

  async function handleConfirm() {
    setError('')
    if (!localReceived || !receivedDate) {
      setError('Enter the amount received and the date.')
      return
    }
    try {
      await confirmMutation.mutateAsync()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {req.month} {req.year} — {req.site?.name}
          </h1>
          <span className={`status-badge mt-1 ${STATUS_COLORS[req.status]}`}>
            {STATUS_LABELS[req.status]}
          </span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/site/request/${id}/edit`)}
              className="btn-primary"
            >
              Edit
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={16} />
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-400">Submitted by</dt>
            <dd className="font-medium">{req.submitted_by ? 'User' : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Submitted</dt>
            <dd className="font-medium">{formatDate(req.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Exchange rate</dt>
            <dd className="font-medium">{req.exchange_rate_at_submit ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Approved by</dt>
            <dd className="font-medium">{req.approved_by ? 'Finance' : '—'}</dd>
          </div>
        </dl>
        {req.site_notes && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 border border-gray-100">
            <span className="font-medium text-gray-700">Site notes: </span>{req.site_notes}
          </div>
        )}
        {req.finance_notes && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700 border border-blue-100">
            <span className="font-medium">Finance notes: </span>{req.finance_notes}
          </div>
        )}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Line Items</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {req.line_items?.map(item => (
            <div key={item.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900">{item.program_name}</p>
                {item.description && <p className="text-gray-400 text-xs">{item.description}</p>}
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(item.local_amount, currency)}</p>
                {item.usd_equivalent && (
                  <p className="text-gray-400 text-xs">≈ {formatCurrency(item.usd_equivalent)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-between font-semibold text-sm">
          <span>Total</span>
          <span>{formatCurrency(totalLocal, currency)} · {formatCurrency(totalUsd)}</span>
        </div>
      </div>

      {req.disbursement && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Disbursement</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-400">USD sent</dt>
              <dd className="font-medium">{req.disbursement.usd_sent ? formatCurrency(req.disbursement.usd_sent) : '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Sent date</dt>
              <dd className="font-medium">{formatDate(req.disbursement.sent_date)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Method</dt>
              <dd className="font-medium">{req.disbursement.method ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Reference #</dt>
              <dd className="font-medium">{req.disbursement.reference_number ?? '—'}</dd>
            </div>
            {req.disbursement.local_received && (
              <>
                <div>
                  <dt className="text-gray-400">Local received</dt>
                  <dd className="font-medium">{formatCurrency(req.disbursement.local_received, currency)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Received date</dt>
                  <dd className="font-medium">{formatDate(req.disbursement.received_date)}</dd>
                </div>
              </>
            )}
          </dl>
          {req.disbursement.finance_notes && (
            <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700 border border-blue-100">
              <span className="font-medium">Finance notes: </span>{req.disbursement.finance_notes}
            </div>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="card p-5 space-y-4 border-emerald-200 bg-emerald-50">
          <h2 className="font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle size={18} /> Confirm Receipt of Funds
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Amount received ({currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={localReceived}
                onChange={e => setLocalReceived(e.target.value)}
                className="form-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="form-label">Date received</label>
              <input
                type="date"
                value={receivedDate}
                onChange={e => setReceivedDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea
              value={siteNotes}
              onChange={e => setSiteNotes(e.target.value)}
              className="form-input resize-none"
              rows={2}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} /> {error}
            </p>
          )}
          <button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className="btn-success"
          >
            <CheckCircle size={16} />
            {confirmMutation.isPending ? 'Saving…' : 'Confirm Receipt'}
          </button>
        </div>
      )}
    </div>
  )
}
