import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { Pencil, X, UserPlus, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UserProfile, UserRole, Site } from '@/types'

// Generates a random temporary password for a newly created user.
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let pw = ''
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

function NewUserModal({ sites, onClose }: { sites: Site[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('site_staff')
  const [siteId, setSiteId] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    if (role === 'site_staff' && !siteId) { setError('Site is required for Site Staff'); return }

    setCreating(true)
    try {
      const tempPassword = generateTempPassword()

      // Use an isolated Supabase client (separate localStorage key, no session
      // persistence) so that signing up the new user does NOT replace the
      // admin's current session in the browser.
      const isolatedClient = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )

      const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: { data: { full_name: fullName || null } },
      })
      if (signUpError) throw signUpError
      const newUserId = signUpData.user?.id
      if (!newUserId) throw new Error('User was not created — please try again.')

      // The DB trigger auto-creates a user_profiles row with default role
      // 'site_staff'. Update it with the chosen role/site/name using the
      // admin's own (already authenticated) session.
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName || null,
          role,
          site_id: role === 'site_staff' ? siteId : null,
        })
        .eq('id', newUserId)
      if (updateError) throw updateError

      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setResult({ email: email.trim(), password: tempPassword })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(`Email: ${result.email}\nTemporary password: ${result.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              User created. Share these credentials with them — they should log in and can change
              their password afterward.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <p><span className="text-gray-400">Email:</span> <span className="font-medium">{result.email}</span></p>
              <p><span className="text-gray-400">Temporary password:</span> <span className="font-mono font-medium">{result.password}</span></p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={handleCopy} className="btn-secondary flex items-center gap-1.5">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy credentials'}
              </button>
              <button onClick={onClose} className="btn-primary">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="user@example.com" />
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
                  <option value="">— Select a site —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

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
  const [adding, setAdding] = useState(false)

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5">
          <UserPlus size={16} /> Add User
        </button>
      </div>

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
      {adding && (
        <NewUserModal sites={sites} onClose={() => setAdding(false)} />
      )}
    </div>
  )
}
