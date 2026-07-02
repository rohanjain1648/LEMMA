# 🚀 SupportPilot AI

**An autonomous, multi-channel AI support desk with human oversight.** Built on [Lemma SDK](https://lemma.work) for the Gappy AI Hackathon.

Every customer issue floods in across email, Slack, web forms, and APIs — **SupportPilot** turns four noisy channels into one calm queue. AI triages, drafts from your knowledge base, and escalates the calls that matter to a human. Nothing goes out without approval.

---

## 🎯 The Problem

Early-stage startups lose **4+ hours a day** to manual support:
- Tickets scattered across email, Slack, web forms, and APIs
- Replies written from memory (inconsistent, slow)
- Status tracked in spreadsheets (chaos)
- A 3-person team answering emails instead of building

**Result:** customers wait 6+ hours, team burnout, growth capped.

---

## ✨ What SupportPilot Does

A customer reaches support through **any channel** — email, Slack, web form, or API. Every channel drops a ticket into **one table**. Then an **autonomous, event-driven pipeline** takes over with **zero manual trigger**:

```
Customer reaches out via Web form / Email / Slack / API
        ↓
   tickets table  (one row, any source)
        ↓   ← DATASTORE schedule fires on INSERT (automatic)
  ┌──────────────────── ticket-pipeline (workflow) ────────────────────┐
  │  [triage-agent]    judges category/priority/sentiment (read-only)   │
  │        → apply_triage()      function writes it (deterministic)     │
  │  [draft-agent]     searches KB, drafts reply + confidence (R/O)     │
  │        → apply_draft()       function writes it + logs response     │
  │  [escalation-agent] decides auto-send vs human review (read-only)   │
  │        → apply_escalation()  function applies the routing           │
  └────────────────────────────────────────────────────────────────────┘
        ↓
 Confidence >= 0.85 AND not urgent/enterprise/angry?  → auto-approved
 Otherwise                                             → operator review queue

  [analytics-agent]   runs daily at 8 AM → trend report
```

**Design principle:** Agents *judge* (read-only, no side-effects) · Functions *write* (deterministic, reliable). This makes the pipeline rock-solid and keeps security tight.

The operator sees everything in one **React dashboard**: multi-channel feed, draft review, approval buttons, KB management, daily reports.

---

## 🎨 Premium Experience

### Landing Page
- **3D animated hero** with mouse parallax (tilts to follow your cursor)
- **Floating channel chips** with layered depth animation
- **Reveal-on-scroll sections** showing the omnichannel flow → pipeline stages → feature cards
- **Smooth fade/slide transitions** and gradient text effects

### Dashboard
- **Dark/light mode toggle** — theme persists across sessions
- **Metric cards with icons** — animated on hover with colored accent bars
- **Circular confidence gauge** — animated ring showing draft quality (High/Medium/Low color-coded)
- **Skeleton loaders** — shimmer placeholders (not spinners) for a snappier feel
- **Multi-channel badges** — ✉️ Email · 💬 Slack · 🌐 Web · 🔌 API
- **Pending Review queue** — sorted by priority, ready for one-click approval
- **Interactive tables** — hover effects, inline editing, real-time live updates

---

## 🚀 Try It Live

**App:** https://ops-app.apps.lemma.work

### Test the channels

#### 📧 Email
Send a support question to **`supportpilotdemo@gmail.com`**
```
Subject: How do I export my data?
Body: I need to get all my data in CSV format. How can I do that?
```
→ Ticket appears in the dashboard within **seconds**, auto-triaged

#### 💬 Slack
[**Open the Lemma workspace #social channel**](https://app.slack.com/client/T0BCDMEK7YPP/C0BDMEK7YPP) and @mention the bot
```
@Lemma How do I reset my password?
```
→ Ticket filed, bot replies with acknowledgment

#### 🌐 Web/API
1. Open the dashboard → https://ops-app.apps.lemma.work
2. Click **"New Ticket"** in the sidebar
3. Fill in the form → submit
4. → Ticket created and auto-processed

### Watch the full flow
1. **See the landing page** → animated 3D mockup, scroll through feature cards
2. **Click "Enter dashboard"**
3. **Send a test ticket** (email, Slack, or web)
4. **Watch it appear** in the Tickets list with a 💬 or ✉️ badge
5. **Open the ticket** → see triage results (category/priority/sentiment badges)
6. **View the AI draft** → KB articles cited, confidence ring showing quality
7. **Click "Approve & Send"** → email goes to the customer
8. **Check the report** → daily digest in Reports tab

---

## 🏗️ Architecture

**One Lemma pod** — no custom servers. The entire backend is serverless event-driven workflows.

### Data Models
| Table | Purpose |
|-------|---------|
| `tickets` | All support requests — status, triage results, draft, confidence, final response |
| `customers` | Contact info, tier (free/startup/enterprise), ticket count, notes |
| `knowledge_base` | Your support docs; agents search these to ground drafts |
| `responses` | Audit log — every draft and final reply sent, who approved it |

### AI Agents (read-only judgment)
| Agent | Input | Output | Responsible for |
|-------|-------|--------|---|
| **triage-agent** | Ticket subject + body | category, priority, sentiment | First-pass classification |
| **draft-agent** | Ticket + KB search results | draft_response, confidence_score, KB article titles | Grounding reply in your docs |
| **escalation-agent** | Triage + draft + customer tier | auto_send or human_review | Routing decision |
| **analytics-agent** | All tickets | Markdown digest | Daily report (volume, gaps, auto-rate) |
| **intake-agent** | Slack/email messages | Creates ticket | Multi-channel intake |

### Functions (deterministic writes)
| Function | Triggered by | Writes |
|----------|--------------|--------|
| **apply_triage** | triage-agent output | Ticket classification + customer upsert |
| **apply_draft** | draft-agent output | Draft response, confidence score, response log |
| **apply_escalation** | escalation-agent output | Ticket routing decision (approved or pending_review) |
| **intake_email** | Gmail webhook | Creates ticket from email (silent, no auto-reply) |
| **send_reply** | Dashboard "Approve & Send" click | Sends email via Gmail connector, marks sent |

### Workflows & Schedules
| Resource | Trigger | What it does |
|----------|---------|---|
| **ticket-pipeline** (workflow) | DATASTORE INSERT on tickets | Auto-runs triage → draft → escalate |
| **ticket-insert-pipeline** (schedule) | INSERT on tickets table | Fires ticket-pipeline for every new ticket |
| **daily-digest** (workflow) | — | Runs analytics-agent, saves report to /reports |
| **daily-digest-schedule** (schedule) | Cron `0 8 * * *` (8 AM daily) | Triggers daily-digest |
| **email-intake** (workflow) | Gmail webhook trigger | Runs intake_email function |
| **email-webhook** (schedule) | New Gmail message (Composio) | Fires email-intake, LLM noise-filters |

### Multi-channel surfaces
| Surface | Type | Bound to | Purpose |
|---------|------|----------|---------|
| **Gmail** (via Composio) | Webhook | intake-agent | Silent inbound email capture |
| **Slack** | Direct message | intake-agent | Channel/DM message intake |

### React App: `ops-app`
Full operator dashboard:
- **Dashboard view** — metrics, channel breakdown, top categories, recent tickets
- **Tickets view** — live-updating list, filter by status/priority/category/sentiment
- **Pending Review queue** — sorted by priority, inline draft edit + approve buttons
- **Knowledge Base editor** — create/edit articles (agents search these)
- **Reports viewer** — daily digests (markdown), analytics trends
- **Ticket detail** — full message, AI triage/draft, confidence ring, approval action
- **Dark/light mode toggle** — theme persists

---

## 📊 Key Decisions

### Agents judge, functions write
- **Every agent is read-only** with structured `output_schema`
- **Every side-effect is a deterministic function** (Python)
- **Why?** LLM tool-calling for writes is flaky; functions never fail. Agents get least-privilege. Writes are auditable.

### Nothing ships without human approval
- Escalation-agent can mark a ticket `auto_send`
- But the **function doesn't email it**
- Instead, it marks the ticket `approved`
- An operator must click **"Approve & Send"** in the dashboard
- Only then does the email go out
- **Why?** "Safe by AI" ≠ "safe by business." Pricing, refunds, apologies need a human's name.

### Billing always routes to human review
- Even 99% confidence, even a happy repeat customer
- If `category = billing`, it routes to human review
- **Why?** Money is sensitive. One bad guidance could lose a customer forever.

### Silent email intake (no auto-replies)
- Gmail surface auto-replies to **every** inbound message
- If you bind it to your personal inbox, it replies to recruiter emails (true story 😅)
- **Solution:** webhook trigger + function
  - New email arrives → LLM filters out noise (newsletters, OTPs)
  - Real support email → function silently files it
  - **No customer-facing reply** — just a ticket
  - The operator replies manually via "Approve & Send"
- **Why?** Anonymous inbound needs silent intake. Known users conversing can have surfaces with auto-replies.

---

## 💻 Tech Stack

**Frontend:**
- React 19 + Vite + TypeScript
- `lemma-sdk/react` hooks (`useLiveRecords`, `useFunctionRun`, `useFilePreview`, etc.)
- lucide-react icons
- Inter typography (Google Fonts)
- CSS 3D transforms for landing page parallax

**Backend:**
- Lemma Pod (serverless event-driven)
- 5 AI agents (read-only judgment)
- 5 deterministic Python functions
- Event-driven + webhook + cron schedules
- Lemma datastore (structured tables)

**Connectors:**
- **Gmail** via Composio (email intake + outbound send)
- **Slack** via Lemma-native (DM/channel intake)

**Hosting:**
- Lemma Cloud (pod + React app on CDN)

---

## 📚 Documentation

For full architecture, agent instructions, function code, and workflow definitions:

**[📓 NotebookLM: SupportPilot Deep Dive](https://notebooklm.google.com/notebook/e2204b0e-c288-4a91-88f7-5d46786aa745)**

Interactive notebook with:
- Agent instructions & decision rules
- Function code (Python + Lemma SDK patterns)
- Workflow & schedule definitions
- Database schema (tables, enums, relationships)
- Connector setup (OAuth, account IDs)
- Troubleshooting & common gotchas
- Design decisions & trade-offs

---

## 🔧 Setup

### 1. Install Lemma CLI
```bash
pip install uv && uv tool install lemma-terminal
lemma servers cloud --use
lemma auth login
lemma orgs select --save-default
```

### 2. Create and import the pod
```bash
lemma pods create supportpilot
cd d:\downloads\gappy\supportpilot
lemma pods import . --pod supportpilot
lemma pods doctor supportpilot
```

### 3. Seed knowledge base and demo tickets
```bash
# macOS / Linux
bash seed/seed.sh

# Windows (handles UTF-8 BOM, escapes $ amounts)
powershell -File seed\seed.ps1
```

### 4. Connect channels (Gmail + Slack)
Connectors/surfaces are runtime state, must be set up after import:

```bash
# Create auth configs
lemma connectors auth-configs create gmail --name supportpilot-gmail --provider COMPOSIO
lemma connectors auth-configs create slack --name supportpilot-slack --provider LEMMA

# Connect accounts via web UI (Connectors → Connect account)
# Then bind surfaces to the intake-agent
lemma surfaces upsert gmail --agent intake-agent --account <account-id> --enabled --pod supportpilot
lemma surfaces upsert slack --agent intake-agent --account <account-id> --enabled --pod supportpilot
lemma surfaces setup gmail --pod supportpilot
lemma surfaces setup slack --pod supportpilot
```

### 5. Deploy the React app
```bash
cd apps/ops-app
# Set VITE_LEMMA_POD_ID in .env.local to your pod UUID, then:
npm run build
lemma apps deploy ops-app . --dist-dir dist --yes --pod supportpilot
```

---

## 🧪 Verification

Create a test ticket and watch the pipeline fire itself:

```bash
lemma record create tickets --pod supportpilot \
  --data '{
    "subject":"How do I export my data?",
    "body":"I need all my data in CSV format.",
    "customer_email":"test@example.com",
    "source":"api",
    "status":"new"
  }'

# Check the schedule fired
lemma schedules get ticket-insert-pipeline --pod supportpilot
# → Last Fire Status: TRIGGERED

# Check the workflow ran
lemma workflows runs list ticket-pipeline --pod supportpilot
# → a COMPLETED run appears

# Re-read the ticket — status is now approved/auto_sent with draft grounded in KB
```

---

## 💬 Contact & Support

- **📧 Test Email:** [supportpilotdemo@gmail.com](mailto:supportpilotdemo@gmail.com) — send a support question
- **💬 Test Slack:** [Open #social channel & @mention the bot](https://app.slack.com/client/T0BCDMEK7YPP/C0BDMEK7YPP)
- **🚀 Live Demo:** https://ops-app.apps.lemma.work
- **📓 Docs:** [NotebookLM architecture notebook](https://notebooklm.google.com/notebook/e2204b0e-c288-4a91-88f7-5d46786aa745)

---

## 📊 By The Numbers

- **4** live channels (email, Slack, web form, API)
- **5** AI agents (triage, draft, escalation, analytics, intake)
- **5** deterministic functions (apply_triage, apply_draft, apply_escalation, intake_email, send_reply)
- **4** data tables (tickets, customers, knowledge_base, responses)
- **3** scheduled workflows (ticket-pipeline, daily-digest, email-intake)
- **1** Lemma pod (full backend)
- **1** React app (operator dashboard + landing page)
- **100%** human-approved sends (nothing ships without a click)

---

## 🎓 What This Shows

This is a complete, production-grade example of building agentic products on modern infrastructure:

✅ **Event-driven autonomy** — triggers fire automatically; no human polls anything  
✅ **Multi-channel unification** — email, Slack, web, API → one queue  
✅ **Reliable AI integration** — agents judge (read-only), functions execute (deterministic)  
✅ **Human-in-the-loop** — AI proposes, human approves, system executes  
✅ **Premium UX** — dark mode, animations, 3D effects, real-time updates  
✅ **Production safety** — least-privilege, audit logs, no auto-send, billing rules  
✅ **Scalable architecture** — Lemma serverless, no servers to manage  

---

## 🎬 Demo Video

[7-minute walkthrough](https://ops-app.apps.lemma.work):
1. Landing page (3D hero, reveal-on-scroll)
2. Multi-channel intake (email + Slack → dashboard in seconds)
3. Autonomous pipeline (triage → draft → escalate)
4. Human approval (review, edit, send)
5. Knowledge base & daily digest

---

## 🛠️ Built With

- [Lemma SDK](https://lemma.work) — AI-native workspace (agents, functions, workflows, schedules, surfaces)
- [React 19](https://react.dev) + [Vite](https://vitejs.dev) — frontend
- [Composio](https://composio.dev) — Gmail connector
- [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter) — typography
- [lucide-react](https://lucide.dev) — icons
- [TanStack Query](https://tanstack.com/query) — data sync

---

**Built by Rohan Jain** for the [Gappy AI Hackathon](https://gappy.ai) · June 2026  
**Powered by [Lemma SDK](https://lemma.work)** — AI-native infrastructure for humans and machines  

---

## 📁 Project Structure

```
supportpilot/
├── README.md (this file)
├── .lemma/                # Lemma pod configuration
├── agents/                # AI agents (read-only judgment)
│   ├── triage-agent/
│   ├── draft-agent/
│   ├── escalation-agent/
│   ├── analytics-agent/
│   └── intake-agent/
├── functions/             # Deterministic Python functions (side-effects)
│   ├── apply_triage/
│   ├── apply_draft/
│   ├── apply_escalation/
│   ├── intake_email/
│   └── send_reply/
├── workflows/             # Event-driven workflows
│   ├── ticket-pipeline/
│   ├── daily-digest/
│   └── email-intake/
├── schedules/             # Cron + datastore triggers
├── apps/ops-app/          # React dashboard + landing page
│   ├── src/Landing.tsx    # 3D animated intro
│   ├── src/App.tsx        # Main dashboard
│   ├── src/styles.css     # Design system + dark mode
│   └── dist/              # Built app
└── seed/                  # Demo KB articles + tickets
    ├── seed.sh (macOS/Linux)
    └── seed.ps1 (Windows)
```

---

**Let's turn noisy support into a calm queue. 🎯**
