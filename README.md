# APEX — Personal AI Finance OS

Your full-stack AI personal finance assistant.

## What It Does

- **Account Aggregation** via Plaid — all banks, credit cards, investments in one place
- **Payment Alert Engine** — knows the CONSEQUENCES of missing payments (late fees, penalty APR spikes), not just due dates. SMS for critical alerts via Twilio.
- **Debt Manager** — snowball vs. avalanche payoff strategies, interest projections, custom plan saving
- **Balance Transfer Optimizer** — identifies 0% APR card arbitrage opportunities across your credit cards
- **Rental Intelligence** — monthly P&L, sell vs. hold analysis, rent optimization, depreciation tax tracking
- **Daily Learning** — AI-generated finance education articles on a 52-week rotating curriculum
- **Weekly Email Digest** — AI-generated weekly financial review with net worth trends, spending breakdown, and personalized insights via Resend
- **AI Financial Assistant** — ask anything about your money, get CFO-level answers powered by Claude

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 19 + TypeScript |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL + RLS) |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Financial Data | Plaid API |
| Market Data | Rentcast + Zillow via RapidAPI |
| SMS Alerts | Twilio (Verify + SMS) |
| Email | Resend |
| Scheduler | APScheduler |

---

## Setup

### 1. Clone and configure

```bash
git clone <your-repo>
cd apex-finance
cp .env.example .env
# Fill in your API keys
```

### 2. Install dependencies and run

```bash
bun run install:all   # installs backend (pip) + frontend (bun)
bun run dev           # starts both servers (backend :8000, frontend :3000)
```

### 3. Run database migrations

Run in order via SQL Pro Studio / Supabase SQL Editor:
1. `supabase/schema.sql` — core tables (users_profile, accounts, transactions, etc.)
2. `supabase/migrations/001_sms_and_debt.sql` — SMS consent, alert preferences, debt plans
3. `supabase/migrations/002_otp_and_features.sql` — OTP codes, email preferences, weekly snapshots, learning articles/progress

### 4. Get API Keys

1. **Supabase** — free tier at supabase.com (URL + anon key + service role key + JWT secret)
2. **Plaid** — free sandbox at dashboard.plaid.com (production access takes ~1 week)
3. **Anthropic** — console.anthropic.com
4. **Twilio** — twilio.com, get a phone number (~$1/mo) + SID + auth token
5. **Resend** — resend.com, free tier (3K emails/month)
6. **Rentcast** — app.rentcast.io, free tier (50 calls/mo)
7. **Zillow/RapidAPI** — rapidapi.com, free tier available

### 5. Plaid Sandbox Test Credentials

| Field | Value |
|-------|-------|
| Phone | `(415) 555-0123` (or any `555-01xx` number) |
| Verification code | `123456` |
| Username | `user_good` |
| Password | `pass_good` |

---

## Architecture

```
Frontend (Vite + React)
    │
    ▼
FastAPI Backend
    ├── /api/plaid/*               Plaid Link flow + transaction sync
    ├── /api/accounts              Account balances + net worth
    ├── /api/alerts/*              Payment alerts + acknowledgment
    ├── /api/debt/*                Debt overview, payoff calculator, save plans
    ├── /api/rental/*              Property P&L + sell/hold analysis
    ├── /api/balance-transfer/*    0% APR card optimization
    ├── /api/learning/*            Daily articles, archive, read/bookmark
    ├── /api/chat                  AI assistant (Claude)
    ├── /api/daily-brief           Morning summary
    └── /api/settings/*            Phone verify, SMS, alerts, email digest
    │
    ▼
Scheduled Jobs
    ├── Nightly 8pm   → Payment alert engine
    ├── Monthly 1st   → Rental market report
    ├── Daily 6am     → Learning article generation
    └── Sunday 9am    → Weekly email digest
    │
    ▼
External APIs
    ├── Plaid          → bank/credit card data
    ├── Anthropic      → AI assistant + article generation + digest insights
    ├── Rentcast       → market rent estimates
    ├── Zillow         → property valuations
    ├── Twilio         → SMS for critical alerts + OTP
    └── Resend         → weekly email digest
```

---

## Key Files

```
apex-finance/
├── .env.example
├── backend/
│   ├── main.py                            ← FastAPI app, all routes, scheduler
│   ├── auth.py                            ← JWT validation + Supabase client deps
│   ├── requirements.txt
│   ├── plaid_mod/
│   │   └── plaid_client.py                ← Account sync, transactions, recurring
│   ├── alerts/
│   │   └── alert_engine.py                ← Payment alerts with consequence logic
│   ├── rental/
│   │   └── rental_intelligence.py         ← P&L, sell/hold model, market data
│   ├── ai/
│   │   └── assistant.py                   ← Claude chat, daily brief
│   ├── sms/
│   │   └── sms_service.py                 ← Twilio Verify OTP + SMS sending
│   ├── email_mod/
│   │   ├── email_service.py               ← Resend email sending
│   │   ├── digest_generator.py            ← Weekly digest data + AI insight + HTML
│   │   └── weekly_job.py                  ← Sunday scheduled job
│   └── learning/
│       ├── curriculum.py                  ← 52-week finance topic rotation
│       └── article_generator.py           ← Claude-generated daily articles
│
├── frontend/src/
│   ├── main.tsx                           ← Router + AuthProvider
│   ├── Dashboard.tsx                      ← Main dashboard (5 tabs)
│   ├── contexts/AuthContext.tsx            ← Auth state management
│   ├── lib/
│   │   ├── api.ts                         ← Authenticated fetch + all API functions
│   │   └── supabase.ts                    ← Supabase client init
│   ├── hooks/
│   │   ├── useAccounts.ts                 ← Account data hook
│   │   ├── useAlerts.ts                   ← Alert data hook
│   │   └── useLearning.ts                 ← Learning article hook
│   ├── components/
│   │   ├── alerts/AlertsTab.tsx           ← Alert list + acknowledge
│   │   ├── accounts/AccountsTab.tsx       ← Account list + Plaid connect
│   │   ├── debt/DebtTab.tsx               ← Debt overview + payoff strategies
│   │   ├── rental/RentalTab.tsx           ← Rental P&L + sell/hold
│   │   ├── learning/LearningTab.tsx       ← Daily article + archive
│   │   ├── chat/AiChat.tsx                ← AI assistant sidebar
│   │   ├── settings/
│   │   │   └── EmailPreferences.tsx       ← Digest toggle + preview
│   │   ├── ui/
│   │   │   ├── StatusDot.tsx
│   │   │   └── MarkdownRenderer.tsx       ← Safe markdown→React renderer
│   │   └── PlaidLink.tsx                  ← Plaid Link bank connection
│   └── pages/
│       ├── Login.tsx                      ← Login/signup page
│       └── Settings.tsx                   ← Profile, phone, alerts, email digest
│
└── supabase/
    ├── schema.sql                         ← Core Postgres schema + RLS
    └── migrations/
        ├── 001_sms_and_debt.sql           ← SMS consent, alert prefs, debt plans
        └── 002_otp_and_features.sql       ← OTP, email, learning tables
```

---

## Dashboard Tabs

| Tab | What It Shows |
|-----|---------------|
| **ALERTS** | Payment due date alerts with consequence severity (critical/warning/info), acknowledge actions |
| **ACCOUNTS** | Linked bank accounts, balances, Plaid connect button |
| **DEBT** | Total debt overview, snowball vs. avalanche strategies, interest projections |
| **RENTAL** | Property P&L, sell vs. hold analysis, market rent comparison |
| **LEARN** | Today's AI-generated finance article, 7-day archive, read/bookmark tracking |

Additional pages: **Settings** (profile, phone verification, alert preferences, email digest)

---

## Nightly Alert Logic

The alert engine runs at 8pm daily and evaluates every credit card:

| Days Until Due | Severity | What It Says |
|---------------|----------|-------------|
| 1 day | CRITICAL | Exact late fee + APR spike calculation + "you have the funds" check |
| 2-3 days | CRITICAL | Full balance vs. minimum payment interest comparison |
| 4-7 days | WARNING | Cash flow check — can you pay in full? |
| 8-14 days | INFO | Heads up, plan accordingly |

SMS goes out for CRITICAL alerts (via Twilio).

---

## Next Up

- [ ] iOS app with push notifications
- [ ] NYC → NJ relocation tax savings calculator
- [ ] Quant job salary tracker
- [ ] Subscription scanner (price escalation detection)
- [ ] Investment portfolio analytics
