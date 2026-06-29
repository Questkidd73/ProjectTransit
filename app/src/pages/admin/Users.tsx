import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UserProfile, UserRole, Site } from '@/types'

function UserModal({ user, sites, onClose }: { user: UserProfile; sites: Site[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [role, setRole] = useState<UserRole>(user.role)
  const [siteId, setSiteId] = useState(user.site_id ?? '')
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role,
          full_name: fullName || null,
          site_id: siteId || null,
        })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
  })

  async function handleSave() {
    setError('')
    try { await mutation.mutateAsync() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Email (read-only)</p>
          <p className="text-sm font-medium text-gray-700">{user.email}</p>
        </div>
        <div>
          <label className="form-label">Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Role</label>
          <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="form-input">
            <option value="site_staff">Site Staff</option>
            <option value="finance">Finance</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === 'site_staff' && (
          <div>
            <label className="form-label">Assigned Site</label>
            <select value={siteId} onChange={e => setSiteId(e.target.value)} className="form-input">
              <option value="">— None —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
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

const ROLE_LABELS: Record<UserRole, string> = {
  site_staff: 'Site Staff',
  finance: 'Finance',
  admin: 'Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  site_staff: 'bg-blue-100 text-blue-700',
  finance: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
}

export default function Users() {
  const [editing, setEditing] = useState<UserProfile | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, site:sites(*)')
        .order('full_name')
      if (error) throw error
      return data as UserProfile[]
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-gray-900">{u.full_name ?? u.email}</p>
                  <p className="text-xs text-gray-400">{u.email} {u.site?.name ? `· ${u.site.name}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`status-badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                  <button onClick={() => setEditing(u)} className="text-gray-400 hover:text-gray-600 p-1">
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <UserModal user={editing} sites={sites} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
