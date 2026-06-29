# SupportPilot AI

> AI-powered customer support operations for small SaaS teams — triage, draft, review, send.

Built for the Gappy AI Hackathon using [Lemma SDK](https://lemma.work/docs).

**🔗 Live app:** https://ops-app.apps.lemma.work
**Pod:** `supportpilot` (`019f0e6c-39f7-71d0-af74-85aea430670f`)

---

## The Problem

A 3-person SaaS founding team is getting 50+ support tickets per day. Every ticket is read manually, answered from memory, and tracked in a spreadsheet. Response quality is inconsistent. Angry customers wait 6+ hours. The team spends 4 hours/day on support instead of building.

## What SupportPilot Does

A customer reaches support through **any channel — web form, email (Gmail), Slack, or API**. Every channel does just one thing: it drops a row in the `tickets` table. From there an **autonomous, event-driven pipeline** takes over with zero human trigger:

```
Customer reaches out via Web form / Email / Slack / API
        ↓
   tickets table  (one row, any source)
        ↓   ← DATASTORE schedule fires on INSERT (no manual start)
  ┌──────────────────── ticket-pipeline (workflow) ────────────────────┐
  │  [triage-agent]    judges category/priority/sentiment (read-only)   │
  │        → apply_triage()      function writes it (deterministic)     │
  │  [draft-agent]     searches KB, drafts reply + confidence (R/O)     │
  │        → apply_draft()       function writes it + logs response     │
  │  [escalation-agent] decides auto-send vs human review (read-only)   │
  │        → apply_escalation()  function applies the routing           │
  └────────────────────────────────────────────────────────────────────┘
        ↓
 Confidence >= 0.85 AND not urgent/enterprise/angry?  → auto-sent (approved)
 Otherwise                                             → operator review queue

  [analytics-agent]   runs daily at 8 AM → trend report in /reports
```

**Design principle — agents judge, functions write.** Each agent is **read-only** and returns a structured `output_schema`; a paired deterministic **function** performs every datastore write. This makes the pipeline reliable (no dependence on LLM tool-calling for persistence) and keeps agents least-privilege.

The operator dashboard (React app) is the single interface for everything: a multi-channel ticket feed, draft review, approval, KB management, and daily digest reports.

---

## Pod Architecture

### Tables
| Table | Purpose |
|-------|---------|
| `tickets` | Core work unit — status, draft, confidence, category, priority, sentiment |
| `customers` | Customer profiles synced from tickets — tier determines escalation rules |
| `knowledge_base` | Grounding articles for draft-agent — tracked by usage_count |
| `responses` | Audit log of all drafts and final responses sent |

### Agents (read-only judgment — return structured `output_schema`)
| Agent | Role |
|-------|------|
| `triage-agent` | Reads ticket → returns category/priority/sentiment |
| `draft-agent` | Searches KB → returns grounded draft + confidence score |
| `escalation-agent` | Reads ticket + customer tier → returns auto-send vs review decision |
| `analytics-agent` | Daily digest: volume, categories, auto-send rate, KB gaps |
| `intake-agent` | Front door for Slack/Gmail surfaces → turns a message into a ticket |

### Functions (deterministic writes)
| Function | Role |
|----------|------|
| `apply_triage` | Persists classification onto the ticket; upserts the customer |
| `apply_draft` | Persists draft + confidence; logs a `responses` audit row |
| `apply_escalation` | Applies routing: auto-send (approved + auto_sent) or pending_review |

### Workflows & Schedules
| Resource | Trigger | Flow |
|----------|---------|------|
| `ticket-pipeline` (workflow) | **Datastore INSERT on `tickets`** | triage → apply_triage → draft → apply_draft → escalate → apply_escalation |
| `ticket-insert-pipeline` (schedule) | `DATASTORE` INSERT | starts `ticket-pipeline` for every new ticket, any channel |
| `daily-digest` (workflow) | — | analytics-agent → report saved to /reports |
| `daily-digest-schedule` | `TIME` cron `0 8 * * *` | runs the daily digest |

### Surfaces (multi-channel intake)
| Surface | Mode | Bound agent |
|---------|------|-------------|
| `gmail` | EMAIL (Lemma-managed OAuth) | `intake-agent` |
| `slack` | DM / channel (custom Slack app) | `intake-agent` |

### App: `ops-app`
Full operator dashboard with:
- **Dashboard**: metrics (open, pending review, auto-sent today, avg confidence)
- **Tickets**: live-updating list with status/category/priority filters
- **Pending Review**: queue sorted by priority with inline draft approval
- **Knowledge Base**: manage KB articles (add, view, track usage)
- **Analytics**: read daily digest reports

---

## Setup

### 1. Install

```bash
pip install uv && uv tool install lemma-terminal
lemma servers cloud --use
lemma auth login
lemma orgs select --save-default
```

### 2. Create and import the pod

```bash
lemma pods create supportpilot
lemma pods import . --pod supportpilot
lemma pods doctor supportpilot
```

### 3. Seed knowledge base and demo tickets

```bash
bash seed/seed.sh            # macOS / Linux
```

```powershell
powershell -File seed\seed.ps1   # Windows (BOM-safe, escapes $ amounts)
```

### 4. Run the app locally

```bash
cd apps/ops-app
# Edit .env.local with your VITE_LEMMA_POD_ID
npm run dev
```

### 5. Deploy the app

```bash
cd apps/ops-app
# Set VITE_LEMMA_POD_ID to the pod UUID, then:
npm run build
lemma apps deploy ops-app . --dist-dir dist --yes --pod supportpilot
```

### 6. Connect channels (Gmail + Slack) — does NOT round-trip in the bundle

Connectors/surfaces are org runtime state, so they must be set up after import:

```bash
# Auth configs (Gmail via Composio — works; Slack via Lemma-native)
lemma connectors auth-configs create gmail --name supportpilot-gmail --provider COMPOSIO
lemma connectors auth-configs create slack --name supportpilot-slack --provider LEMMA

# Connect each account in the web UI (Connectors → Connect account) — the CLI
# connect-request command is broken in CLI 0.5.3, so use the browser. Then:
lemma connectors accounts list                     # grab the account ids

# Bind each channel's surface to the intake-agent
lemma surfaces upsert gmail --agent intake-agent --account <gmail-account-id> --enabled --pod supportpilot
lemma surfaces upsert slack --agent intake-agent --account <slack-account-id> --enabled --pod supportpilot
lemma surfaces setup gmail --pod supportpilot      # Ready: yes
lemma surfaces setup slack --pod supportpilot      # Ready: yes
```

---

## Demo Flow

Every channel does the same thing — drop a ticket; the pipeline runs itself.

1. **Web**: open the app → **New Ticket** → submit. The ticket is created and the
   `ticket-insert-pipeline` schedule auto-fires `ticket-pipeline`.
2. **Email**: send an email to the connected Gmail mailbox → intake-agent files a ticket.
3. **Slack**: DM the connected bot → intake-agent files a ticket.
4. **API**: `lemma record create tickets --data '{...}'`.
5. Watch status update live: new → triaged → draft_ready → **approved/auto_sent** (high
   confidence) or **pending_review** (escalated).
6. For `pending_review`: open **Pending Review** and approve/edit the AI draft.
7. Check **Reports** for the daily digest.

---

## Verification

```bash
# Create a ticket from any channel and watch the pipeline fire by itself:
lemma record create tickets --pod supportpilot \
  --data '{"subject":"How do I reset my password?","body":"Forgot my password, how do I reset it?","customer_email":"test@example.com","source":"api","status":"new"}'

lemma schedules get ticket-insert-pipeline --pod supportpilot   # Last Fire Status: TRIGGERED
lemma workflows runs list ticket-pipeline --pod supportpilot    # a run appears, then COMPLETED
# Then re-read the ticket: status=approved, auto_sent=yes, draft grounded in the KB.

lemma pods doctor supportpilot
```

---

Built by Rohan Jain for the [Gappy AI Hackathon](https://gappy.ai) · June 2026
Using [Lemma SDK](https://lemma.work) as infrastructure
