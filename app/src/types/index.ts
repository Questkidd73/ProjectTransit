export type UserRole = 'site_staff' | 'finance' | 'admin'

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'changes_requested'
  | 'approved'
  | 'sent'
  | 'received'

export type RequestType = 'budget' | 'inout'

export interface Site {
  id: string
  code: string
  name: string
  country: string | null
  currency: string
  exchange_rate: number
  exchange_rate_updated_at: string | null
  exchange_rate_updated_by: string | null
  is_active: boolean
  created_at: string
}

export interface Program {
  id: string
  site_id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface BudgetLine {
  id: string
  program_id: string
  program?: Program
  year: number
  month: number
  local_amount: number
  budgeted_exchange_rate: number | null
  entered_by: string | null
  entered_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  site_id: string | null
  site?: Site
  created_at: string
  updated_at: string
}

export interface TransferRequest {
  id: string
  site_id: string
  site?: Site
  month: string
  year: number
  status: RequestStatus
  submitted_by: string | null
  submitted_by_profile?: UserProfile
  submitted_at: string | null
  approved_by: string | null
  approved_by_profile?: UserProfile
  approved_at: string | null
  finance_notes: string | null
  site_notes: string | null
  exchange_rate_at_submit: number | null
  request_type: RequestType
  created_at: string
  updated_at: string
  line_items?: RequestLineItem[]
  disbursement?: Disbursement
}

export interface RequestLineItem {
  id: string
  request_id: string
  program_id: string | null
  program_name: string
  description: string
  local_amount: number
  currency: string
  usd_equivalent: number | null
  exchange_rate: number | null
  sort_order: number
  created_at: string
}

export interface Disbursement {
  id: string
  request_id: string
  usd_sent: number | null
  sent_date: string | null
  method: string | null
  reference_number: string | null
  local_received: number | null
  received_date: string | null
  exchange_rate_at_transfer: number | null
  recorded_by: string | null
  recorded_by_profile?: UserProfile
  recorded_at: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  finance_notes: string | null
  site_notes: string | null
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  performed_by: string | null
  performed_at: string
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  sent: 'Funds Sent',
  received: 'Received',
}

export const STATUS_COLORS: Record<RequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  changes_requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-purple-100 text-purple-700',
  received: 'bg-teal-100 text-teal-700',
}

export const TRANSFER_METHODS = [
  'Wire Transfer',
  'ACH',
  'Check',
  'Zelle',
  'Other',
]
