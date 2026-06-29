import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FilePlus, History, CheckSquare,
  Users, Globe, BookOpen, TrendingUp, DollarSign,
  ClipboardList, ArrowRightLeft, BarChart2, LogOut, Menu, X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const role = profile?.role
  const siteName = profile?.site?.name ?? profile?.site?.code ?? ''

  return (
    <div className="min-h-screen flex bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-navy-600 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-navy-500">
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Project Transit</h1>
            <p className="text-navy-200 text-xs">{siteName || 'Budget Management'}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-navy-200 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {(role === 'site_staff' || role === 'admin') && (
            <>
              <p className="text-navy-300 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-2">Site</p>
              <NavLink to="/site" end className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <LayoutDashboard size={18} /> Dashboard
              </NavLink>
              <NavLink to="/site/spending-plan" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <ClipboardList size={18} /> Spending Plan
              </NavLink>
              <NavLink to="/site/new-request" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <FilePlus size={18} /> New Request
              </NavLink>
              <NavLink to="/site/inout-request" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <ArrowRightLeft size={18} /> In/Out Request
              </NavLink>
              <NavLink to="/finance/budget" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <BookOpen size={18} /> Budget View
              </NavLink>
              <NavLink to="/site/history" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <History size={18} /> Request History
              </NavLink>
              <NavLink to="/site/ytd-report" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <BarChart2 size={18} /> YTD Report
              </NavLink>
            </>
          )}

          {(role === 'finance' || role === 'admin') && (
            <>
              <p className="text-navy-300 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4">Finance</p>
              <NavLink to="/finance" end className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <CheckSquare size={18} /> Pending Requests
              </NavLink>
              <NavLink to="/finance/budget" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <DollarSign size={18} /> Budget View
              </NavLink>
              <NavLink to="/site/ytd-report" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <BarChart2 size={18} /> YTD Report
              </NavLink>
            </>
          )}

          {role === 'admin' && (
            <>
              <p className="text-navy-300 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4">Admin</p>
              <NavLink to="/admin" end className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <LayoutDashboard size={18} /> Overview
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <Users size={18} /> Users
              </NavLink>
              <NavLink to="/admin/sites" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <Globe size={18} /> Sites
              </NavLink>
              <NavLink to="/admin/programs" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <BookOpen size={18} /> Programs
              </NavLink>
              <NavLink to="/admin/exchange-rates" className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <TrendingUp size={18} /> Exchange Rates
              </NavLink>
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-navy-500">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-navy-400 flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.[0] ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name ?? 'User'}</p>
              <p className="text-navy-300 text-xs capitalize">{role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="sidebar-link w-full text-left"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-gray-900">Project Transit</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
