import React, { useState, useMemo } from 'react'
import {
  useCurrentUser,
  useLiveRecords,
  useRecords,
  useCreateRecord,
  useUpdateRecord,
  useWorkflowStart,
  useFiles,
  useFilePreview,
} from 'lemma-sdk/react'
import type { DatastoreFileSummary } from 'lemma-sdk'
import {
  LayoutDashboard,
  Ticket,
  Clock,
  BookOpen,
  BarChart2,
  CheckCircle,
  SendHorizonal,
  Edit3,
  X,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  Zap,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { lemmaClient } from './lemma-client'

// ── Types ──────────────────────────────────────────────────────────────────

type TicketStatus = 'new' | 'triaged' | 'draft_ready' | 'pending_review' | 'approved' | 'sent' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
type TicketCategory = 'billing' | 'bug' | 'how_to' | 'feature_request' | 'account' | 'other'
type TicketSentiment = 'positive' | 'neutral' | 'frustrated' | 'angry'

interface Ticket extends Record<string, unknown> {
  id: string
  subject: string
  body: string
  customer_email: string
  customer_name?: string
  source: string
  status: TicketStatus
  category?: TicketCategory
  priority?: TicketPriority
  sentiment?: TicketSentiment
  confidence_score?: number
  draft_response?: string
  final_response?: string
  kb_articles_used?: string[]
  auto_sent?: boolean
  resolved_at?: string
  created_at: string
}

interface KBArticle extends Record<string, unknown> {
  id: string
  title: string
  content: string
  category: string
  tags?: string[]
  usage_count: number
  is_active: boolean
  created_at: string
}

type View = 'dashboard' | 'tickets' | 'pending' | 'knowledge' | 'reports'

// ── Badge helpers ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const labels: Record<TicketStatus, string> = {
    new: 'New', triaged: 'Triaged', draft_ready: 'Draft Ready',
    pending_review: 'Pending Review', approved: 'Approved',
    sent: 'Sent', resolved: 'Resolved', closed: 'Closed',
  }
  const cls: Record<TicketStatus, string> = {
    new: 'badge-new', triaged: 'badge-triaged', draft_ready: 'badge-draft',
    pending_review: 'badge-pending', approved: 'badge-approved',
    sent: 'badge-sent', resolved: 'badge-resolved', closed: 'badge-closed',
  }
  return <span className={`badge ${cls[status]}`}>{labels[status]}</span>
}

function PriorityBadge({ priority }: { priority?: TicketPriority }) {
  if (!priority) return null
  const labels = { low: 'Low', medium: 'Med', high: 'High', urgent: 'URGENT' }
  const cls = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' }
  return <span className={`badge ${cls[priority]}`}>{labels[priority]}</span>
}

function CategoryBadge({ category }: { category?: TicketCategory }) {
  if (!category) return null
  const labels: Record<string, string> = { billing: 'Billing', bug: 'Bug', how_to: 'How-to', feature_request: 'Feature', account: 'Account', other: 'Other' }
  const cls: Record<string, string> = { billing: 'badge-billing', bug: 'badge-bug', how_to: 'badge-how_to', feature_request: 'badge-feature', account: 'badge-account', other: 'badge-other' }
  return <span className={`badge ${cls[category] ?? 'badge-other'}`}>{labels[category] ?? category}</span>
}

function SentimentBadge({ sentiment }: { sentiment?: TicketSentiment }) {
  if (!sentiment || sentiment === 'neutral') return null
  const labels = { angry: '😠 Angry', frustrated: '😤 Frustrated', positive: '😊 Positive', neutral: '' }
  const cls = { angry: 'badge-angry', frustrated: 'badge-frustrated', positive: 'badge-positive', neutral: '' }
  return <span className={`badge ${cls[sentiment]}`}>{labels[sentiment]}</span>
}

function ConfidencePill({ score }: { score?: number }) {
  if (score == null) return <span className="text-muted text-xs">—</span>
  const pct = Math.round(score * 100)
  const cls = score >= 0.85 ? 'confidence-high' : score >= 0.7 ? 'confidence-mid' : 'confidence-low'
  return <span className={`text-sm font-mono ${cls}`}>{pct}%</span>
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── New Ticket Modal ────────────────────────────────────────────────────────

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ subject: '', body: '', customer_email: '', customer_name: '', source: 'web' })
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { start, isStarting } = useWorkflowStart({
    client: lemmaClient,
    workflowName: 'ticket-intake',
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  })

  const { create } = useCreateRecord<Ticket>({ client: lemmaClient, tableName: 'tickets' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject || !form.body || !form.customer_email) return
    setRunning(true)
    setError(null)
    try {
      // Create ticket record first so triage-agent can update it
      const ticket = await create({ ...form, status: 'new' })
      // Start the workflow with the ticket context
      await start({ ...form, ticket_id: ticket?.id ?? '' })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  const busy = running || isStarting

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>New Support Ticket</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {done ? (
          <div>
            <div className="alert-success" style={{ marginBottom: 16 }}>
              ✓ Ticket created and intake workflow started. AI agents are now triaging and drafting a response.
            </div>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-row">
              <label className="form-label">Subject *</label>
              <input className="form-input" value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What's the issue?" required />
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Customer Email *</label>
                <input className="form-input" type="email" value={form.customer_email} onChange={(e) => setForm(f => ({ ...f, customer_email: e.target.value }))} placeholder="customer@example.com" required />
              </div>
              <div className="form-row">
                <label className="form-label">Customer Name</label>
                <input className="form-input" value={form.customer_name} onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Message *</label>
              <textarea className="form-textarea" value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Customer's full message..." rows={5} required />
            </div>
            <div className="form-row">
              <label className="form-label">Source</label>
              <select className="form-input" value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}>
                <option value="web">Web</option>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="api">API</option>
              </select>
            </div>
            {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="gap-8">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Starting...</> : <><Zap size={14} /> Submit & Auto-Triage</>}
              </button>
              <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Ticket Detail ──────────────────────────────────────────────────────────

function TicketDetail({ ticket, onBack }: { ticket: Ticket; onBack: () => void }) {
  const [editingDraft, setEditingDraft] = useState(false)
  const [draftText, setDraftText] = useState(ticket.draft_response ?? '')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { update: updateTicket, isSubmitting } = useUpdateRecord<Ticket>({
    client: lemmaClient,
    tableName: 'tickets',
    recordId: ticket.id,
    onSuccess: () => setSuccess('Ticket updated successfully'),
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  })

  async function approve() {
    setError(null)
    const r = await updateTicket({ status: 'approved', final_response: draftText || ticket.draft_response })
    if (r) setSuccess('Ticket approved — queued for sending')
  }

  async function saveDraft() {
    setError(null)
    await updateTicket({ draft_response: draftText, status: 'draft_ready' })
    setEditingDraft(false)
  }

  async function markResolved() {
    setError(null)
    await updateTicket({ status: 'resolved', resolved_at: new Date().toISOString() })
  }

  const needsReview = ticket.status === 'pending_review' || ticket.status === 'draft_ready'

  return (
    <div>
      <div className="page-header" style={{ padding: '0 0 16px' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8, paddingLeft: 0 }}>
            ← Back to tickets
          </button>
          <h1 className="page-title" style={{ fontSize: 17 }}>{ticket.subject}</h1>
          <div className="gap-8 mt-4">
            <StatusBadge status={ticket.status} />
            {ticket.priority && <PriorityBadge priority={ticket.priority} />}
            {ticket.category && <CategoryBadge category={ticket.category} />}
            {ticket.sentiment && <SentimentBadge sentiment={ticket.sentiment} />}
          </div>
        </div>
      </div>

      {success && <div className="alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="ticket-layout">
        {/* Left: ticket info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="section-head">
              <div className="section-head-title"><MessageSquare size={15} /> Customer Message</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className="text-sm text-muted">{ticket.customer_email}</span>
                {ticket.customer_name && <span className="text-xs text-muted">{ticket.customer_name}</span>}
                <span className="text-xs text-muted">{timeAgo(ticket.created_at)}</span>
              </div>
            </div>
            <div className="ticket-body-text">{ticket.body}</div>
          </div>

          {(ticket.draft_response || ticket.final_response) && (
            <div className="panel" style={{ padding: 0 }}>
              <div className="draft-box">
                <div className="draft-box-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SendHorizonal size={14} />
                    {ticket.final_response ? 'Sent Response' : 'AI Draft'}
                    {ticket.confidence_score != null && (
                      <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>
                        confidence: <ConfidencePill score={ticket.confidence_score} />
                      </span>
                    )}
                  </div>
                  {!ticket.final_response && needsReview && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingDraft(!editingDraft); setDraftText(ticket.draft_response ?? '') }}>
                      <Edit3 size={13} /> {editingDraft ? 'Cancel edit' : 'Edit'}
                    </button>
                  )}
                </div>
                {editingDraft ? (
                  <div style={{ padding: 14 }}>
                    <textarea
                      className="form-textarea"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      style={{ minHeight: 200 }}
                    />
                    <div className="gap-8 mt-8">
                      <button className="btn btn-outline btn-sm" onClick={saveDraft} disabled={isSubmitting}>Save draft</button>
                    </div>
                  </div>
                ) : (
                  <div className="draft-content">{ticket.final_response ?? ticket.draft_response}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: actions + metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {needsReview && (
            <div className="panel" style={{ background: 'var(--accent-soft)', borderColor: '#bfdbfe' }}>
              <div className="section-head-title" style={{ marginBottom: 12, color: 'var(--accent)' }}>
                <AlertCircle size={15} /> Review Required
              </div>
              <p className="text-sm" style={{ margin: '0 0 12px', color: '#374151' }}>
                {ticket.confidence_score != null && ticket.confidence_score < 0.85
                  ? `AI confidence is ${Math.round((ticket.confidence_score ?? 0) * 100)}% — review the draft before sending.`
                  : 'This ticket was routed for manual review.'}
              </p>
              <div className="action-bar" style={{ flexDirection: 'column' }}>
                <button className="btn btn-success" onClick={approve} disabled={isSubmitting}>
                  <CheckCircle size={15} /> Approve & Send
                </button>
                <button className="btn btn-outline" onClick={() => setEditingDraft(true)} disabled={isSubmitting}>
                  <Edit3 size={15} /> Edit Draft First
                </button>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="section-head-title" style={{ marginBottom: 12 }}>Ticket Details</div>
            <table style={{ fontSize: 13 }}>
              <tbody>
                {[
                  ['From', ticket.customer_email],
                  ['Source', ticket.source],
                  ['Priority', ticket.priority ?? '—'],
                  ['Category', ticket.category ?? 'Uncategorized'],
                  ['Sentiment', ticket.sentiment ?? '—'],
                  ['Auto-sent', ticket.auto_sent ? 'Yes' : 'No'],
                  ['Created', timeAgo(ticket.created_at)],
                  ...(ticket.resolved_at ? [['Resolved', timeAgo(ticket.resolved_at)]] : []),
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '7px 12px 7px 0', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{k}</td>
                    <td style={{ padding: '7px 0' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <div className="panel">
              <div className="section-head-title" style={{ marginBottom: 12 }}>Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-outline" onClick={markResolved} disabled={isSubmitting}>
                  Mark as Resolved
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard view ─────────────────────────────────────────────────────────

function DashboardView({ tickets, setView }: { tickets: Ticket[]; setView: (v: View) => void }) {
  const open = tickets.filter(t => !['resolved', 'closed', 'sent'].includes(t.status)).length
  const pending = tickets.filter(t => t.status === 'pending_review').length
  const sentToday = tickets.filter(t => {
    if (t.status !== 'sent' && t.status !== 'approved') return false
    const d = new Date(t.created_at)
    return d.toDateString() === new Date().toDateString()
  }).length
  const withScore = tickets.filter(t => t.confidence_score != null)
  const avgConf = withScore.length ? withScore.reduce((a, t) => a + (t.confidence_score ?? 0), 0) / withScore.length : 0

  const byCategory = tickets.reduce<Record<string, number>>((acc, t) => {
    const k = t.category ?? 'other'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const recent = [...tickets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  return (
    <div>
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Open Tickets</div>
          <div className="metric-value">{open}</div>
          <div className="metric-sub">Needs attention</div>
        </div>
        <div className={`metric-card ${pending > 0 ? 'danger' : ''}`}>
          <div className="metric-label">Pending Review</div>
          <div className="metric-value">{pending}</div>
          <div className="metric-sub">Awaiting your approval</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Auto-handled Today</div>
          <div className="metric-value">{sentToday}</div>
          <div className="metric-sub">Sent without review</div>
        </div>
        <div className="metric-card accent">
          <div className="metric-label">Avg AI Confidence</div>
          <div className="metric-value">{avgConf > 0 ? `${Math.round(avgConf * 100)}%` : '—'}</div>
          <div className="metric-sub">Draft quality signal</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="panel">
          <div className="section-head-title" style={{ marginBottom: 14 }}>
            <TrendingUp size={15} /> Top Categories
          </div>
          {topCategories.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topCategories.map(([cat, count]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CategoryBadge category={cat as TicketCategory} />
                  <div style={{ flex: 1, height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / tickets.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                  <span className="text-sm text-muted" style={{ minWidth: 24 }}>{count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted text-sm">No tickets yet</p>}
        </div>

        <div className="panel">
          <div className="flex-between" style={{ marginBottom: 14 }}>
            <div className="section-head-title"><Ticket size={15} /> Recent Tickets</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setView('tickets')}>View all <ChevronRight size={13} /></button>
          </div>
          {recent.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <StatusBadge status={t.status} />
                  <span className="truncate text-sm" style={{ flex: 1 }}>{t.subject}</span>
                  <span className="text-xs text-muted">{timeAgo(t.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted text-sm">No tickets yet</p>}
        </div>
      </div>

      {pending > 0 && (
        <div className="panel" style={{ marginTop: 20, background: '#fffbeb', borderColor: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={20} color="var(--warn)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--warn)' }}>{pending} ticket{pending !== 1 ? 's' : ''} need your review</div>
              <div className="text-sm text-muted">AI confidence was below threshold or ticket was marked urgent</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setView('pending')}>
            Review now <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── All Tickets view ───────────────────────────────────────────────────────

type StatusFilter = 'all' | TicketStatus

function TicketsView({ tickets, isLoading, onSelect }: { tickets: Ticket[]; isLoading: boolean; onSelect: (t: Ticket) => void }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() =>
    statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter),
    [tickets, statusFilter]
  )

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'pending_review', label: 'Pending Review' },
    { key: 'draft_ready', label: 'Draft Ready' },
    { key: 'sent', label: 'Sent' },
    { key: 'resolved', label: 'Resolved' },
  ]

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div className="filter-bar">
        {statusTabs.map(t => (
          <button key={t.key} className={`tab-btn ${statusFilter === t.key ? 'active' : ''}`} onClick={() => setStatusFilter(t.key)}>
            {t.label}
            {t.key !== 'all' && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({tickets.filter(x => x.status === t.key).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Ticket size={40} />
          <h3>No tickets</h3>
          <p>No tickets match this filter.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Confidence</th>
                  <th>Customer</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} onClick={() => onSelect(t)}>
                    <td>
                      <div className="truncate" style={{ maxWidth: 220 }}>{t.subject}</div>
                      {t.sentiment && t.sentiment !== 'neutral' && <div className="mt-4"><SentimentBadge sentiment={t.sentiment} /></div>}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><CategoryBadge category={t.category} /></td>
                    <td><ConfidencePill score={t.confidence_score} /></td>
                    <td>
                      <div className="text-sm truncate" style={{ maxWidth: 160 }}>{t.customer_email}</div>
                    </td>
                    <td className="text-muted text-sm">{timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pending Review view ────────────────────────────────────────────────────

function PendingReviewView({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (t: Ticket) => void }) {
  const pending = tickets.filter(t => t.status === 'pending_review' || t.status === 'draft_ready')
    .sort((a, b) => {
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      return (pOrder[a.priority ?? 'medium'] ?? 2) - (pOrder[b.priority ?? 'medium'] ?? 2)
    })

  if (pending.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle size={40} color="var(--success)" />
        <h3>All clear!</h3>
        <p>No tickets waiting for review. AI is handling it.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {pending.map(t => (
        <div key={t.id} className="panel" style={{ cursor: 'pointer', borderLeft: `4px solid ${t.priority === 'urgent' ? 'var(--danger)' : t.priority === 'high' ? '#f97316' : 'var(--accent)'}` }}
          onClick={() => onSelect(t)}>
          <div className="flex-between">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.subject}</div>
              <div className="gap-8">
                <StatusBadge status={t.status} />
                {t.priority && <PriorityBadge priority={t.priority} />}
                {t.category && <CategoryBadge category={t.category} />}
                {t.sentiment && <SentimentBadge sentiment={t.sentiment} />}
              </div>
              <div className="text-sm text-muted">{t.customer_email} · {timeAgo(t.created_at)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {t.confidence_score != null && (
                <div style={{ textAlign: 'right' }}>
                  <div className="text-xs text-muted">AI Confidence</div>
                  <ConfidencePill score={t.confidence_score} />
                </div>
              )}
              <button className="btn btn-primary btn-sm">
                Review <ChevronRight size={13} />
              </button>
            </div>
          </div>
          {t.draft_response && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', borderLeft: '3px solid var(--line)' }}>
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Draft preview</div>
              {t.draft_response.slice(0, 180)}{t.draft_response.length > 180 ? '...' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Knowledge Base view ────────────────────────────────────────────────────

function KnowledgeBaseView() {
  const { records: articles, isLoading, refresh } = useRecords<KBArticle>({
    client: lemmaClient,
    tableName: 'knowledge_base',
    sort: [{ field: 'usage_count', direction: 'desc' }],
  })

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '' })

  const { create, isSubmitting } = useCreateRecord<KBArticle>({
    client: lemmaClient,
    tableName: 'knowledge_base',
    onSuccess: () => { setShowForm(false); setForm({ title: '', content: '', category: 'general', tags: '' }); void refresh() },
  })

  async function addArticle(e: React.FormEvent) {
    e.preventDefault()
    await create({ ...form, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean), is_active: true, usage_count: 0 })
  }

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div className="text-muted text-sm">{articles.length} article{articles.length !== 1 ? 's' : ''} · Used by draft-agent to ground responses</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> Add Article
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>New KB Article</h3>
          <form onSubmit={addArticle}>
            <div className="form-row">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. How to reset your password" required />
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['billing', 'bug', 'how_to', 'feature_request', 'account', 'general'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Tags (comma-separated)</label>
                <input className="form-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="password, auth, login" />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Content *</label>
              <textarea className="form-textarea" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Full answer text. Be specific — agents use this verbatim." rows={6} required />
            </div>
            <div className="gap-8">
              <button className="btn btn-primary btn-sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Article'}
              </button>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {articles.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={40} />
          <h3>Knowledge base is empty</h3>
          <p>Add articles so AI agents can write accurate, grounded responses.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Used</th>
                  <th>Status</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.title}</td>
                    <td><CategoryBadge category={a.category as TicketCategory} /></td>
                    <td className="text-muted text-sm">{a.usage_count}×</td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-sent' : 'badge-closed'}`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td><div className="kb-content-preview">{a.content}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reports view ───────────────────────────────────────────────────────────

function ReportContent({ path }: { path: string }) {
  const { content, isLoading } = useFilePreview({ client: lemmaClient, path, mode: 'rendered' })
  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>
  return <div className="report-content">{content ?? 'Unable to load report content.'}</div>
}

function ReportsView() {
  const { files, isLoading } = useFiles({ client: lemmaClient, directoryPath: '/reports' })
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      <div className="panel" style={{ padding: 12 }}>
        <div className="section-head-title" style={{ padding: '4px 8px 10px', fontSize: 13 }}>
          <FileText size={14} /> Reports
        </div>
        {!files || files.length === 0 ? (
          <p className="text-muted text-sm" style={{ padding: '4px 8px' }}>
            No reports yet. Daily digest runs at 8 AM.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {files.map((f: DatastoreFileSummary) => (
              <button
                key={f.path}
                className={`nav-item ${selectedPath === f.path ? 'active' : ''}`}
                onClick={() => setSelectedPath(f.path)}
                style={{ fontSize: 13 }}
              >
                <FileText size={13} /> {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        {!selectedPath ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <BarChart2 size={36} />
            <h3>Select a report</h3>
            <p>Daily digests appear here after 8 AM each morning.</p>
          </div>
        ) : (
          <ReportContent path={selectedPath} />
        )}
      </div>
    </div>
  )
}

// ── Root App ───────────────────────────────────────────────────────────────

export function App() {
  const { user } = useCurrentUser({ client: lemmaClient })
  const [view, setView] = useState<View>('dashboard')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showNewTicket, setShowNewTicket] = useState(false)

  const { records: tickets, isLoading, liveStatus, refresh } = useLiveRecords<Ticket>({
    client: lemmaClient,
    tableName: 'tickets',
    sort: [{ field: 'created_at', direction: 'desc' }],
    reconcile: 'refetch',
  })

  const pendingCount = tickets.filter(t => t.status === 'pending_review').length

  function handleSelectTicket(t: Ticket) {
    setSelectedTicket(t)
    setView('tickets')
  }

  const navItems = [
    { key: 'dashboard' as View, label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { key: 'tickets' as View, label: 'All Tickets', icon: <Ticket size={16} /> },
    { key: 'pending' as View, label: 'Pending Review', icon: <Clock size={16} />, badge: pendingCount },
    { key: 'knowledge' as View, label: 'Knowledge Base', icon: <BookOpen size={16} /> },
    { key: 'reports' as View, label: 'Analytics', icon: <BarChart2 size={16} /> },
  ]

  const pageLabels: Record<View, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Support operations at a glance' },
    tickets: { title: 'Tickets', subtitle: `${tickets.length} total · live ${liveStatus === 'open' ? '🟢' : '🔴'}` },
    pending: { title: 'Pending Review', subtitle: `${pendingCount} ticket${pendingCount !== 1 ? 's' : ''} need your attention` },
    knowledge: { title: 'Knowledge Base', subtitle: 'Articles used by AI agents to ground responses' },
    reports: { title: 'Analytics', subtitle: 'Daily digest reports from analytics-agent' },
  }

  const displayName = user ? ([user.first_name, user.last_name].filter(Boolean).join(' ') || user.email) : null
  const userInitial = (displayName ?? 'U')[0].toUpperCase()

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <SendHorizonal size={22} />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">SupportPilot</span>
            <span className="sidebar-brand-sub">AI Support Ops</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Workspace</div>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              onClick={() => { setView(item.key); setSelectedTicket(null) }}
            >
              {item.icon}
              {item.label}
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: 16 }}>Actions</div>
          <button className="nav-item" onClick={() => setShowNewTicket(true)}>
            <Plus size={16} /> New Ticket
          </button>
          <button className="nav-item" onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{userInitial}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 500, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName ?? 'Operator'}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Support team</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">{selectedTicket ? selectedTicket.subject : pageLabels[view].title}</h1>
            {!selectedTicket && <p className="page-subtitle">{pageLabels[view].subtitle}</p>}
          </div>
          {view === 'tickets' && !selectedTicket && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewTicket(true)}>
              <Plus size={14} /> New Ticket
            </button>
          )}
        </div>

        <div className="page-body">
          {selectedTicket && view === 'tickets' ? (
            <TicketDetail ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
          ) : (
            <>
              {view === 'dashboard' && <DashboardView tickets={tickets} setView={setView} />}
              {view === 'tickets' && <TicketsView tickets={tickets} isLoading={isLoading} onSelect={handleSelectTicket} />}
              {view === 'pending' && <PendingReviewView tickets={tickets} onSelect={handleSelectTicket} />}
              {view === 'knowledge' && <KnowledgeBaseView />}
              {view === 'reports' && <ReportsView />}
            </>
          )}
        </div>
      </main>

      {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} />}
    </div>
  )
}
