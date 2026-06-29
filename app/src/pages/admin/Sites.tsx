import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Site } from '@/types'

function SiteModal({ site, onClose }: { site?: Site; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(site?.name ?? '')
  const [currency, setCurrency] = useState(site?.currency ?? 'USD')
  const [exchangeRate, setExchangeRate] = useState(String(site?.exchange_rate ?? 1))
  const [country, setCountry] = useState(site?.country ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { name, currency, exchange_rate: Number(exchangeRate), country }
      if (site) {
        const { error } = await supabase.from('sites').update(payload).eq('id', site.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('sites').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] })
      onClose()
    },
  })

  async function handleSave() {
    setError('')
    if (!name) { setError('Name is required.'); return }
    try { await mutation.mutateAsync() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{site ? 'Edit Site' : 'New Site'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div>
          <label className="form-label">Site Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="Monterrey" />
        </div>
        <div>
          <label className="form-label">Country</label>
          <input value={country} onChange={e => setCountry(e.target.value)} className="form-input" placeholder="Mexico" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Currency Code</label>
            <input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} className="form-input" placeholder="MXN" maxLength={3} />
          </div>
          <div>
            <label className="form-label">Exchange Rate (to USD)</label>
            <input type="number" min="0" step="0.0001" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="form-input" placeholder="17.5" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sites() {
  const [modal, setModal] = useState<'new' | Site | null>(null)

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('*').order('name')
      if (error) throw error
      return data as Site[]
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> Add Site</button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sites.map(site => (
              <div key={site.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-gray-900">{site.name}</p>
                  <p className="text-xs text-gray-400">{site.country} · {site.currency} @ {site.exchange_rate}</p>
                </div>
                <button onClick={() => setModal(site)} className="text-gray-400 hover:text-gray-600 p-1">
                  <Pencil size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <SiteModal
          site={modal === 'new' ? undefined : modal as Site}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
