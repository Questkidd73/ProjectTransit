import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import SiteDashboard from '@/pages/site/SiteDashboard'
import NewRequest from '@/pages/site/NewRequest'
import RequestDetail from '@/pages/site/RequestDetail'
import RequestHistory from '@/pages/site/RequestHistory'
import SpendingPlan from '@/pages/site/SpendingPlan'
import InOutRequest from '@/pages/site/InOutRequest'
import YTDReport from '@/pages/site/YTDReport'
import FinanceDashboard from '@/pages/finance/FinanceDashboard'
import BudgetView from '@/pages/finance/BudgetView'
import ReviewRequest from '@/pages/finance/ReviewRequest'
import RecordDisbursement from '@/pages/finance/RecordDisbursement'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import Users from '@/pages/admin/Users'
import Sites from '@/pages/admin/Sites'
import Programs from '@/pages/admin/Programs'
import ExchangeRates from '@/pages/admin/ExchangeRates'

function RootRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'site_staff') return <Navigate to="/site" replace />
  if (profile.role === 'finance') return <Navigate to="/finance" replace />
  return <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />

        <Route element={<ProtectedRoute roles={['site_staff', 'finance', 'admin']} />}>
          <Route element={<Layout />}>
            <Route path="/site" element={<SiteDashboard />} />
            <Route path="/site/new-request" element={<NewRequest />} />
            <Route path="/site/request/:id" element={<RequestDetail />} />
            <Route path="/site/request/:id/edit" element={<NewRequest />} />
            <Route path="/site/history" element={<RequestHistory />} />
            <Route path="/site/spending-plan" element={<SpendingPlan />} />
            <Route path="/site/inout-request" element={<InOutRequest />} />
            <Route path="/site/ytd-report" element={<YTDReport />} />

            <Route path="/finance/budget" element={<BudgetView />} />

            <Route element={<ProtectedRoute roles={['finance', 'admin']} />}>
              <Route path="/finance" element={<FinanceDashboard />} />
              <Route path="/finance/request/:id" element={<ReviewRequest />} />
              <Route path="/finance/request/:id/edit" element={<NewRequest />} />
              <Route path="/finance/request/:id/disburse" element={<RecordDisbursement />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/sites" element={<Sites />} />
              <Route path="/admin/programs" element={<Programs />} />
              <Route path="/admin/exchange-rates" element={<ExchangeRates />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
