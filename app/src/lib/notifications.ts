import { supabase } from './supabase'

export type NotificationEvent =
  | 'submitted'
  | 'changes_requested'
  | 'approved'
  | 'sent'
  | 'received'

const EVENT_LABELS: Record<NotificationEvent, string> = {
  submitted: 'Submitted for review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  sent: 'Funds sent',
  received: 'Receipt confirmed',
}

// Who gets notified for each lifecycle event:
// - Finance/Admin need to know when a site submits a request, or confirms receipt.
// - Site staff need to know when Finance requests changes, approves, or sends funds.
const NOTIFY_FINANCE: NotificationEvent[] = ['submitted', 'received']
const NOTIFY_SITE: NotificationEvent[] = ['changes_requested', 'approved', 'sent']

async function getFinanceEmails(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email')
    .in('role', ['finance', 'admin'])
  if (error || !data) return []
  return data.map(u => u.email).filter(Boolean)
}

async function getSiteStaffEmails(siteId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('role', 'site_staff')
    .eq('site_id', siteId)
  if (error || !data) return []
  return data.map(u => u.email).filter(Boolean)
}

/**
 * Fires an email notification for a transfer request status change.
 * Best-effort: failures are logged but never block the calling UI action,
 * since the DB update has already succeeded by the time this runs.
 */
export async function notifyStatusChange(requestId: string, event: NotificationEvent) {
  try {
    const { data: req, error } = await supabase
      .from('transfer_requests')
      .select('id, month, year, request_type, site:sites(id, name)')
      .eq('id', requestId)
      .single()
    if (error || !req) throw error ?? new Error('Request not found')

    const site = req.site as unknown as { id: string; name: string } | null
    const siteId = site?.id
    const siteName = site?.name ?? 'Unknown site'

    let recipients: string[] = []
    if (NOTIFY_FINANCE.includes(event)) {
      recipients = await getFinanceEmails()
    } else if (NOTIFY_SITE.includes(event) && siteId) {
      recipients = await getSiteStaffEmails(siteId)
    }

    if (recipients.length === 0) return

    const subject = `[Project Transit] ${siteName} — ${req.month} ${req.year} — ${EVENT_LABELS[event]}`
    const text =
      `${EVENT_LABELS[event]}\n\n` +
      `Site: ${siteName}\n` +
      `Period: ${req.month} ${req.year}\n` +
      `Request type: ${req.request_type === 'inout' ? 'In/Out' : 'Budget'}\n\n` +
      `View it here: https://projectransit.vercel.app/`

    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: recipients, subject, text }),
    })
  } catch (err) {
    // Notifications are non-critical — log and move on.
    console.error('notifyStatusChange failed:', err)
  }
}
