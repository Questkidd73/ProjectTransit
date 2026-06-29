import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Program, Site } from '@/types'

function ProgramModal({
  program, sites, onClose
}: {
  program?: Program
  sites: Site[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(program?.name ?? '')
  const [siteId, setSiteId] = useState(program?.site_id ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (!siteId) throw new Error('Select a site.')
      const payload = { name, site_id: siteId, is_active: true }
      if (program) {
        const { error } = await supabase.from('programs').update({ name }).eq('id', program.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('programs').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] })
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
          <h2 className="text-lg font-semibold">{program ? 'Edit Program' : 'New Program'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {!program && (
          <div>
            <label className="form-label">Site</label>
            <select value={siteId} onChange={e => setSiteId(e.target.value)} className="form-input">
              <option value="">— Select site —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="form-label">Program Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="e.g. Community Development" />
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

export default function Programs() {
  const [modal, setModal] = useState<'new' | Program | null>(null)
  const [filterSite, setFilterSite] = useState('')

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*, site:sites(*)')
        .order('name')
      if (error) throw error
      return data as (Program & { site: Site })[]
    },
  })

  const { data: sites = [] } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('*').order('name')
      if (error) throw error
      return data as Site[]
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('programs').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
  })

  const queryClient = useQueryClient()

  const filtered = filterSite ? programs.filter(p => p.site_id === filterSite) : programs

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> Add Program</button>
      </div>

      <div className="flex gap-3">
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="form-input w-48">
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className={`font-medium ${p.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{p.name}</p>
                  <p className="text-xs text-gray-400">{p.site?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: p.id, is_active: !p.is_active })}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {p.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => setModal(p)} className="text-gray-400 hover:text-gray-600 p-1">
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ProgramModal
          program={modal === 'new' ? undefined : modal as Program}
          sites={sites}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
