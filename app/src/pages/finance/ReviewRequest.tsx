import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, Send, ArrowRightLeft, DollarSign, Trash2, Edit } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TransferRequest, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notifyStatusChange } from '@/lib/notifications'

export default function ReviewRequest() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
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

  const actionMutation = useMutation({
    mutationFn: async (action: 'approve' | 'request_changes') => {
      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'changes_requested',
          approved_by: action === 'approve' ? profile!.id : null,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          finance_notes: notes || null,
        })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['finance-requests'] })
      notifyStatusChange(id!, action === 'approve' ? 'approved' : 'changes_requested')
      navigate('/finance')
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
      queryClient.invalidateQueries({ queryKey: ['finance-requests'] })
      navigate('/finance')
    },
  })

  if (isLoading) return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
  if (!req) return null

  const currency = req.site?.currency ?? 'USD'
  const totalLocal = req.line_items?.reduce((s, i) => s + i.local_amount, 0) ?? 0
  const totalUsd = req.line_items?.reduce((s, i) => s + (i.usd_equivalent ?? 0), 0) ?? 0
  const canAct = req.status === 'submitted'
  const isInOut = req.request_type === 'inout'

  async function handleAction(action: 'approve' | 'request_changes') {
    setError('')
    try {
      await actionMutation.mutateAsync(action)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/finance')} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {req.site?.name} — {req.month} {req.year}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`status-badge ${STATUS_COLORS[req.status]}`}>
              {STATUS_LABELS[req.status]}
            </span>
            <span className={`status-badge ${isInOut ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {isInOut ? <><ArrowRightLeft size={11} className="inline mr-1" />In/Out</> : <><DollarSign size={11} className="inline mr-1" />Budget</>}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/finance/request/${id}/edit`)}
            className="btn-primary"
          >
            <Edit size={16} />
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
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Request Info</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-400">Submitted by</dt>
            <dd className="font-medium">{req.submitted_by ? 'Site Staff' : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Submitted</dt>
            <dd className="font-medium">{formatDate(req.submitted_at)}</dd>
          </div>
          {!isInOut && (
            <div>
              <dt className="text-gray-400">Exchange rate (at submit)</dt>
              <dd className="font-medium">{req.exchange_rate_at_submit ?? '—'}</dd>
            </div>
          )}
          {isInOut && (
            <div>
              <dt className="text-gray-400">Transfer type</dt>
              <dd className="font-medium text-purple-700">Exact local currency — no FX conversion</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">Currency</dt>
            <dd className="font-medium">{currency}</dd>
          </div>
        </dl>
        {req.site_notes && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 border border-gray-100">
            <span className="font-medium text-gray-700">Site notes: </span>{req.site_notes}
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
          <span>
            {formatCurrency(totalLocal, currency)}
            {!isInOut && totalUsd > 0 && ` · ${formatCurrency(totalUsd)} USD`}
          </span>
        </div>
      </div>

      {canAct && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Finance Decision</h2>
          <div>
            <label className="form-label">Notes to site (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="form-input resize-none"
              rows={3}
              placeholder="Any feedback or notes for the site team…"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('request_changes')}
              disabled={actionMutation.isPending}
              className="btn-secondary gap-2"
            >
              <XCircle size={16} /> Request Changes
            </button>
            <button
              onClick={() => handleAction('approve')}
              disabled={actionMutation.isPending}
              className="btn-success gap-2"
            >
              <CheckCircle size={16} />
              {actionMutation.isPending ? 'Saving…' : 'Approve Request'}
            </button>
          </div>
        </div>
      )}

      {req.status === 'approved' && !req.disbursement && (
        <div className="card p-5 bg-emerald-50 border-emerald-200">
          <p className="text-emerald-800 text-sm font-medium mb-3">
            {isInOut
              ? `This request is approved. Send the exact ${currency} amount and record when complete.`
              : 'This request is approved. Record the USD disbursement when funds are sent.'}
          </p>
          <button
            onClick={() => navigate(`/finance/request/${id}/disburse`)}
            className="btn-success gap-2"
          >
            <Send size={16} /> Record Disbursement
          </button>
        </div>
      )}
    </div>
  )
}
