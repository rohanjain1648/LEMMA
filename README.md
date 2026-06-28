# SupportPilot AI

> AI-powered customer support operations for small SaaS teams — triage, draft, review, send.

Built for the Gappy AI Hackathon using [Lemma SDK](https://lemma.work/docs).

**🔗 Live app:** https://ops-app.apps.lemma.work
**Pod:** `supportpilot` (`019f0e6c-39f7-71d0-af74-85aea430670f`)

---

## The Problem

A 3-person SaaS founding team is getting 50+ support tickets per day. Every ticket is read manually, answered from memory, and tracked in a spreadsheet. Response quality is inconsistent. Angry customers wait 6+ hours. The team spends 4 hours/day on support instead of building.

## What SupportPilot Does

SupportPilot automates 80% of tier-1 support with four AI agents working in sequence:

```
Customer sends ticket
        ↓
 [triage-agent]          Classifies: category, priority, sentiment
        ↓
  [draft-agent]          Searches KB → writes grounded response + confidence score
        ↓
[escalation-agent]       Confidence >= 0.85 AND not urgent/enterprise? -> auto-send
                         Otherwise -> routes to operator dashboard for review
        ↓
  [analytics-agent]      Runs daily at 8 AM -> trend report in /reports
```

The operator dashboard (React app) is the single interface for everything: incoming tickets, draft review, approval, KB management, and daily digest reports.

---

## Pod Architecture

### Tables
| Table | Purpose |
|-------|---------|
| `tickets` | Core work unit — status, draft, confidence, category, priority, sentiment |
| `customers` | Customer profiles synced from tickets — tier determines escalation rules |
| `knowledge_base` | Grounding articles for draft-agent — tracked by usage_count |
| `responses` | Audit log of all drafts and final responses sent |

### Agents
| Agent | Role |
|-------|------|
| `triage-agent` | Reads ticket, sets category/priority/sentiment, upserts customer |
| `draft-agent` | Searches KB, writes response draft + confidence score |
| `escalation-agent` | Decides: auto-send (confidence >= 0.85) or human review |
| `analytics-agent` | Daily digest: volume, categories, auto-send rate, KB gaps |

### Workflows
| Workflow | Trigger | Flow |
|----------|---------|------|
| `ticket-intake` | Manual (form or API) | intake → triage → draft → escalate → [review] → done |
| `daily-digest` | Scheduled 8 AM daily | analytics-agent → report saved to /reports |

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
npm run build
lemma apps deploy ops-app --source-dir . --yes --pod supportpilot
```

---

## Demo Flow

1. Open the operator app
2. Click **New Ticket** in the sidebar
3. Enter any ticket (e.g. billing issue, password reset, how-to question)
4. Click **Submit & Auto-Triage** — ticket-intake workflow starts
5. Watch the ticket status update live: new → triaged → draft_ready
6. If `pending_review`: go to **Pending Review** to approve the AI draft
7. Check **Analytics** for the daily digest

---

## Verification

```bash
lemma agents chat triage-agent \
  "Ticket subject: Charged twice. Body: I see two $49 charges on Feb 1 and Feb 3. Email: test@example.com" \
  --pod supportpilot

lemma workflows run daily-digest --pod supportpilot
lemma pods doctor supportpilot
```

---

Built by Rohan Jain for the [Gappy AI Hackathon](https://gappy.ai) · June 2026
Using [Lemma SDK](https://lemma.work) as infrastructure
