# APEX — Personal AI Finance + Health OS

Your full-stack AI that manages your money and your body.

## What It Does

### Finance
- **Account Aggregation** via Plaid — all banks, credit cards, investments in one place
- **Payment Alert Engine** — knows the CONSEQUENCES of missing payments (late fees, penalty APR spikes), not just due dates
- **Subscription Scanner** — detects hidden charges, price escalations, zombie subscriptions
- **Rental Intelligence** — monthly P&L, sell vs. hold analysis, rent optimization alerts, depreciation tax tracking
- **AI Financial Assistant** — ask anything about your money, get CFO-level answers

### Health
- **Carnivore Tracker** — protein/fat logging, streak tracking, no-BS macros
- **Food Classifier** — "Is X carnivore?" with strict/animal-based/borderline tiers
- **Budget Optimizer** — track food spend against monthly targets

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js + React + Tailwind |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas (motor async driver) |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Financial Data | Plaid API |
| Market Data | Rentcast + Zillow via RapidAPI |
| SMS Alerts | Twilio |
| Scheduler | APScheduler |

---

## Setup

### 1. Clone and configure

```bash
git clone <your-repo>
cd apex
cp .env.example .env
# Fill in your API keys
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Get API Keys (in order of priority)

1. **MongoDB Atlas** — free tier at mongodb.com/atlas, create a cluster, get connection string
2. **Plaid** — free sandbox at dashboard.plaid.com. For production access, apply (takes ~1 week)
3. **Anthropic** — console.anthropic.com, API keys section
4. **Twilio** — twilio.com, get a phone number (~$1/mo), get SID + auth token
5. **Rentcast** — app.rentcast.io, free tier gives 50 calls/mo (enough for testing)
6. **Zillow/RapidAPI** — rapidapi.com/apimaker/api/zillow-com1, free tier available

---

## Architecture

```
Frontend (Next.js)
    │
    ▼
FastAPI Backend
    ├── /api/plaid/*         Plaid Link flow + transaction sync
    ├── /api/accounts/*      Account balances + net worth
    ├── /api/alerts/*        Payment alerts + acknowledgment
    ├── /api/rental/*        Property P&L + sell/hold analysis
    ├── /api/chat            AI assistant (Claude)
    ├── /api/daily-brief     Morning summary
    └── /api/carnivore/*     Diet tracking + food classifier
    │
    ▼
Scheduled Jobs
    ├── Nightly 8pm  → run_nightly_alert_job (payment alerts)
    └── Monthly 1st  → run_monthly_rental_report (rental analysis)
    │
    ▼
External APIs
    ├── Plaid        → bank/credit card data
    ├── Rentcast     → market rent estimates
    ├── Zillow       → property valuations
    └── Twilio       → SMS for critical alerts
```

---

## Key Files

```
apex/
├── .env.example
├── backend/
│   ├── main.py                          ← FastAPI app + all routes
│   ├── requirements.txt
│   ├── plaid/
│   │   └── plaid_client.py              ← Account sync, transaction ingestion, recurring detection
│   ├── alerts/
│   │   └── alert_engine.py              ← Payment alerts with consequence logic
│   ├── rental/
│   │   └── rental_intelligence.py       ← P&L, sell/hold model, market data, tax alerts
│   └── ai/
│       └── assistant.py                 ← Claude integration, daily brief, food classifier
└── frontend/
    └── Dashboard.jsx                    ← React dashboard (all modules)
```

---

## Nightly Alert Logic

The alert engine runs at 8pm daily and evaluates every credit card:

| Days Until Due | Severity | What It Says |
|---------------|----------|-------------|
| 1 day | 🔴 CRITICAL | Exact late fee + APR spike calculation + "you have the funds" check |
| 2-3 days | 🔴 CRITICAL | Full balance vs. minimum payment interest comparison |
| 4-7 days | 🟡 WARNING | Cash flow check — can you pay in full? |
| 8-14 days | 🟢 INFO | Heads up, plan accordingly |

SMS goes out for CRITICAL alerts. Push notification for WARNING. Email digest for INFO.

---

## Rental Sell vs. Hold Model

Updated monthly with fresh Rentcast + Zillow data:

```
Hold scenario annual return =
  cash_flow * 12
  + depreciation_tax_savings * 12
  + appreciation (from Zillow)
  + equity_buildup * 12

Sell scenario annual return =
  net_proceeds * 7%  (invested in market)

Verdict: HOLD if hold > sell by >$3K/yr
         SELL if sell > hold by >$5K/yr
         MONITOR otherwise
```

---

## Next Features to Build

- [ ] Balance transfer optimizer (0% APR card arbitrage)
- [ ] NYC → NJ relocation tax savings calculator  
- [ ] Quant job salary tracker (vs. $250K target)
- [ ] Muay Thai training log integration
- [ ] Weekly email digest with AI-generated financial review
- [ ] iOS app with push notifications
