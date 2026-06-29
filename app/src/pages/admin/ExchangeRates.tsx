import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Site } from '@/types'
import { formatDate } from '@/lib/utils'

export default function ExchangeRates() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('*').order('name')
      if (error) throw error
      return data as Site[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const { error } = await supabase
        .from('sites')
        .update({
          exchange_rate: rate,
          exchange_rate_updated_at: new Date().toISOString(),
          exchange_rate_updated_by: profile!.id,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] })
      setEditing({})
    },
  })

  async function handleUpdate(site: Site) {
    setError('')
    const raw = editing[site.id]
    const rate = Number(raw)
    if (!raw || isNaN(rate) || rate <= 0) {
      setError('Enter a valid positive exchange rate.')
      return
    }
    try {
      await updateMutation.mutateAsync({ id: site.id, rate })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exchange Rates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set the local-currency-to-USD rate for each site. This is used when site staff submit requests without a live rate lookup.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sites.filter(s => s.currency !== 'USD').map(site => (
              <div key={site.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{site.name}</p>
                  <p className="text-xs text-gray-400">
                    1 USD = {site.exchange_rate} {site.currency}
                    {site.exchange_rate_updated_at && ` · Updated ${formatDate(site.exchange_rate_updated_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={editing[site.id] ?? site.exchange_rate}
                    onChange={e => setEditing(prev => ({ ...prev, [site.id]: e.target.value }))}
                    className="form-input w-28 text-right"
                  />
                  <span className="text-sm text-gray-500 w-10">{site.currency}</span>
                  <button
                    onClick={() => handleUpdate(site)}
                    disabled={updateMutation.isPending}
                    className="btn-primary gap-1 whitespace-nowrap"
                  >
                    <RefreshCw size={14} />
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
