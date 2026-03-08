import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

import asyncio
import hashlib
import hmac
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.responses import JSONResponse

from auth import get_supabase, get_current_user
from plaid_mod.plaid_client import (
    create_link_token,
    exchange_public_token,
    sync_accounts,
    sync_transactions,
)
from alerts.alert_engine import run_nightly_alert_job, evaluate_payment_alerts
from rental.rental_intelligence import run_monthly_rental_report
from ai.assistant import chat, generate_daily_brief
from sms.sms_service import (
    send_verification_code,
    check_verification_code,
    save_phone_and_consent,
    revoke_sms_consent,
    get_sms_status,
    get_alert_preferences,
    update_alert_preferences,
)
from debt.debt_calculator import DebtAccount, compare_strategies
from debt.balance_transfer_offers import BALANCE_TRANSFER_OFFERS
from email_mod.weekly_job import run_weekly_digest_job
from email_mod.digest_generator import gather_digest_data, generate_ai_insight, render_digest_html
from learning.article_generator import generate_daily_article
from compensation.salary_tracker import (
    calculate_compensation,
    get_progress_stages,
    TARGET_SALARY,
)

logger = logging.getLogger(__name__)


# ─── Scheduler (Nightly Jobs) ─────────────────────────────────────────────────

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    sb = get_supabase()

    # Nightly alert job — 8pm every day
    scheduler.add_job(
        lambda: asyncio.create_task(run_nightly_alert_job(sb)),
        "cron",
        hour=20,
        minute=0,
    )

    # Monthly rental report — 1st of each month
    scheduler.add_job(
        lambda: asyncio.create_task(run_monthly_rental_report(sb)),
        "cron",
        day=1,
        hour=6,
        minute=0,
    )

    # Weekly email digest — Sunday 9am
    scheduler.add_job(
        lambda: asyncio.create_task(run_weekly_digest_job(sb)),
        "cron",
        day_of_week="sun",
        hour=9,
        minute=0,
    )

    # Daily learning article — 6am every day
    scheduler.add_job(
        lambda: asyncio.create_task(generate_daily_article(sb)),
        "cron",
        hour=6,
        minute=0,
    )

    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="APEX Finance", lifespan=lifespan)

# ─── Rate Limiting ────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


# ─── CORS ─────────────────────────────────────────────────────────────────────

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Security Headers ────────────────────────────────────────────────────────


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ─── Plaid Routes ─────────────────────────────────────────────────────────────


@app.post("/api/plaid/link-token")
async def get_link_token(user_id: str = Depends(get_current_user)):
    token = await create_link_token(user_id)
    return {"link_token": token}


class ExchangeTokenRequest(BaseModel):
    public_token: str


@app.post("/api/plaid/exchange")
async def exchange_token(
    body: ExchangeTokenRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    # Remove any existing Plaid items + accounts to prevent duplicates
    existing = sb.table("plaid_items").select("id").eq("user_id", user_id).execute()
    if existing.data:
        sb.table("accounts").delete().eq("user_id", user_id).execute()
        sb.table("plaid_items").delete().eq("user_id", user_id).execute()
        logger.info(f"Cleared {len(existing.data)} old Plaid items for user {user_id}")

    result = await exchange_public_token(user_id, body.public_token, sb)
    background_tasks.add_task(initial_sync, user_id, result["item_id"], sb)
    return result


async def initial_sync(user_id: str, item_id: str, sb):
    resp = (
        sb.table("plaid_items")
        .select("access_token")
        .eq("item_id", item_id)
        .single()
        .execute()
    )
    if resp.data:
        await sync_accounts(user_id, resp.data["access_token"], sb)
        await sync_transactions(user_id, resp.data["access_token"], sb, days_back=90)


@app.post("/api/plaid/sync")
@limiter.limit("5/minute")
async def manual_sync(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    resp = (
        sb.table("plaid_items").select("access_token").eq("user_id", user_id).execute()
    )
    items = resp.data or []
    for item in items:
        background_tasks.add_task(sync_accounts, user_id, item["access_token"], sb)
        background_tasks.add_task(sync_transactions, user_id, item["access_token"], sb)
    return {"status": "sync_started", "items": len(items)}


PLAID_WEBHOOK_SECRET = os.getenv("PLAID_WEBHOOK_SECRET", "")


@app.post("/api/plaid/webhook")
async def plaid_webhook(request: Request):
    """Plaid webhook handler with signature verification."""
    body = await request.body()

    if PLAID_WEBHOOK_SECRET:
        signature = request.headers.get("plaid-verification", "")
        expected = hmac.new(
            PLAID_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            logger.warning("Plaid webhook signature mismatch")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    logger.info(f"Plaid webhook received: {body[:200]}")
    return {"status": "ok"}


# ─── Account Routes ───────────────────────────────────────────────────────────


ASSET_TYPES = {"depository", "investment"}
LIABILITY_TYPES = {"credit", "loan"}


@app.get("/api/accounts")
async def get_accounts(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    resp = sb.table("accounts").select("*").eq("user_id", user_id).execute()
    raw_accounts = resp.data or []

    # Deduplicate by plaid_account_id (keep most recently synced)
    seen = {}
    for a in raw_accounts:
        key = a["plaid_account_id"]
        if key not in seen or (a.get("last_synced") or "") > (
            seen[key].get("last_synced") or ""
        ):
            seen[key] = a
    accounts = list(seen.values())

    net_worth = sum(
        a["balance_current"]
        if a["type"] in ASSET_TYPES
        else -abs(a["balance_current"])
        if a["type"] in LIABILITY_TYPES
        else 0
        for a in accounts
    )
    return {"accounts": accounts, "net_worth": round(net_worth, 2)}


# ─── Alert Routes ─────────────────────────────────────────────────────────────


@app.get("/api/alerts")
async def get_alerts(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    resp = (
        sb.table("alerts")
        .select("*")
        .eq("user_id", user_id)
        .eq("acknowledged", False)
        .order("severity")
        .execute()
    )
    alerts = resp.data or []
    return {
        "alerts": alerts,
        "critical_count": sum(1 for a in alerts if a["severity"] == "critical"),
    }


@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    sb.table("alerts").update(
        {
            "acknowledged": True,
            "acknowledged_at": datetime.utcnow().isoformat(),
        }
    ).eq("id", alert_id).eq("user_id", user_id).execute()
    return {"status": "acknowledged"}


@app.post("/api/alerts/run-now")
async def run_alerts_now(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    alerts = await evaluate_payment_alerts(user_id, sb)
    return {"alerts_generated": len(alerts)}


# ─── Rental Routes ────────────────────────────────────────────────────────────


@app.get("/api/rental")
async def get_rental_summary(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    resp = (
        sb.table("rental_reports")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    reports = resp.data or []
    if not reports:
        raise HTTPException(404, "No rental report found. Run monthly job first.")
    return reports[0]


@app.post("/api/rental/refresh")
async def refresh_rental_report(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    background_tasks.add_task(run_monthly_rental_report, sb)
    return {"status": "refresh_started"}


# ─── AI Chat Routes ───────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    message: str = Field(max_length=4000)


@app.post("/api/chat")
@limiter.limit("20/minute")
async def chat_endpoint(
    request: Request,
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    resp = (
        sb.table("conversations")
        .select("role, content")
        .eq("user_id", user_id)
        .order("timestamp")
        .limit(20)
        .execute()
    )
    history = resp.data or []

    reply = await chat(user_id, body.message, history, sb)
    return {"reply": reply}


@app.get("/api/daily-brief")
async def get_daily_brief(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    brief = await generate_daily_brief(user_id, sb)
    return {"brief": brief, "date": datetime.now().strftime("%A, %B %d")}


# ─── Balance Transfer Optimizer ──────────────────────────────────────────────────


@app.get("/api/balance-transfer/analyze")
async def analyze_balance_transfers(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    resp = (
        sb.table("accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("type", "credit")
        .execute()
    )
    credit_cards = resp.data or []

    if not credit_cards:
        return {
            "has_debt": False,
            "message": "No credit card accounts found. Connect your bank first.",
            "recommendations": [],
        }

    # Get credit card details for user's cards only
    user_account_ids = [
        c["plaid_account_id"] for c in credit_cards if c.get("plaid_account_id")
    ]
    cc_details_resp = (
        sb.table("credit_card_details")
        .select("*")
        .in_("account_id", user_account_ids)
        .execute()
    )
    cc_details = {d["account_id"]: d for d in (cc_details_resp.data or [])}

    debt_analysis = []
    total_balance = 0
    total_annual_interest = 0

    for card in credit_cards:
        balance = card.get("balance_current", 0) or 0
        if balance <= 0:
            continue

        details = cc_details.get(card["plaid_account_id"], {})
        aprs = details.get("aprs", [])

        purchase_apr = 24.99
        if aprs:
            for apr_entry in aprs:
                if apr_entry.get("type") == "purchase":
                    purchase_apr = float(apr_entry.get("apr", 24.99))
                    break

        monthly_rate = purchase_apr / 100 / 12
        monthly_interest = balance * monthly_rate
        annual_interest = monthly_interest * 12

        total_balance += balance
        total_annual_interest += annual_interest

        debt_analysis.append(
            {
                "account_id": card["plaid_account_id"],
                "name": card.get("name", "Unknown Card"),
                "balance": round(balance, 2),
                "apr": purchase_apr,
                "monthly_interest": round(monthly_interest, 2),
                "annual_interest": round(annual_interest, 2),
            }
        )

    if total_balance <= 0:
        return {
            "has_debt": False,
            "message": "No outstanding credit card balances found.",
            "recommendations": [],
        }

    recommendations = []
    for offer in BALANCE_TRANSFER_OFFERS:
        transfer_fee = total_balance * offer["transfer_fee"]
        promo_months = offer["promo_months"]
        interest_saved_promo = (total_annual_interest / 12) * promo_months
        net_savings = interest_saved_promo - transfer_fee
        monthly_payment = total_balance / promo_months

        recommendations.append(
            {
                "offer_name": offer["name"],
                "promo_apr": offer["apr"],
                "promo_months": promo_months,
                "transfer_fee_pct": offer["transfer_fee"],
                "transfer_fee_dollar": round(transfer_fee, 2),
                "interest_saved": round(interest_saved_promo, 2),
                "net_savings": round(net_savings, 2),
                "monthly_payment_needed": round(monthly_payment, 2),
                "payoff_date_months": promo_months,
            }
        )

    recommendations.sort(key=lambda x: x["net_savings"], reverse=True)
    best = recommendations[0] if recommendations else None

    return {
        "has_debt": True,
        "total_balance": round(total_balance, 2),
        "total_annual_interest": round(total_annual_interest, 2),
        "debt_analysis": debt_analysis,
        "recommendations": recommendations,
        "best_recommendation": best,
    }


# ─── SMS & Settings Routes ────────────────────────────────────────────────────


class PhoneSubmitRequest(BaseModel):
    phone: str = Field(max_length=20)


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str


class AlertPreferencesRequest(BaseModel):
    sms_enabled: bool = True
    sms_critical_only: bool = True
    quiet_hours_start: int | None = None
    quiet_hours_end: int | None = None


@app.post("/api/settings/phone/verify")
@limiter.limit("3/minute")
async def start_phone_verification(
    request: Request,
    body: PhoneSubmitRequest,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    try:
        sid = await send_verification_code(body.phone, user_id, sb)
        return {"status": "code_sent", "message_sid": sid}
    except Exception as e:
        logger.error(f"Phone verification failed for {user_id}: {e}")
        raise HTTPException(
            400, "Failed to send verification code. Check phone number format."
        )


@app.post("/api/settings/phone/confirm")
async def confirm_phone_verification(
    body: VerifyCodeRequest,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    try:
        valid = await check_verification_code(body.phone, body.code, user_id, sb)
        if not valid:
            raise HTTPException(400, "Invalid or expired verification code.")
        result = await save_phone_and_consent(user_id, body.phone, "", sb)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Phone confirmation failed for {user_id}: {e}")
        raise HTTPException(400, "Verification failed. Try again.")


@app.delete("/api/settings/phone")
async def remove_phone(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    result = await revoke_sms_consent(user_id, sb)
    return result


@app.get("/api/settings/sms-status")
async def get_sms_status_endpoint(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    return await get_sms_status(user_id, sb)


@app.get("/api/settings/alert-preferences")
async def get_alert_prefs(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    return await get_alert_preferences(user_id, sb)


@app.put("/api/settings/alert-preferences")
async def update_alert_prefs(
    body: AlertPreferencesRequest,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    return await update_alert_preferences(
        user_id,
        {
            "sms_enabled": body.sms_enabled,
            "sms_critical_only": body.sms_critical_only,
            "quiet_hours_start": body.quiet_hours_start,
            "quiet_hours_end": body.quiet_hours_end,
        },
        sb,
    )


# ─── Email Digest Routes ──────────────────────────────────────────────────


class EmailPreferencesRequest(BaseModel):
    digest_enabled: bool = True
    digest_day: str = "sunday"
    digest_hour: int = 9


@app.get("/api/settings/email-preferences")
async def get_email_prefs(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    resp = (
        sb.table("email_preferences")
        .select("digest_enabled, digest_day, digest_hour, email_override, last_digest_sent_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    return {"digest_enabled": True, "digest_day": "sunday", "digest_hour": 9, "email_override": None, "last_digest_sent_at": None}


@app.put("/api/settings/email-preferences")
async def update_email_prefs(
    body: EmailPreferencesRequest,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    sb.table("email_preferences").upsert(
        {
            "user_id": user_id,
            "digest_enabled": body.digest_enabled,
            "digest_day": body.digest_day,
            "digest_hour": body.digest_hour,
            "updated_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id",
    ).execute()
    return {"status": "updated"}


@app.post("/api/settings/email-preview")
async def preview_digest(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    """Generate a preview of the weekly digest without sending."""
    digest_data = await gather_digest_data(user_id, sb)
    ai_insight = await generate_ai_insight(digest_data)
    html = render_digest_html(digest_data, ai_insight)
    return {"html": html, "data": digest_data, "insight": ai_insight}


# ─── Learning Routes ──────────────────────────────────────────────────────


@app.get("/api/learning/today")
async def get_todays_article(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    resp = sb.table("learning_articles").select("*").eq("date", today).limit(1).execute()

    if not resp.data:
        # Generate on-demand if scheduled job hasn't run yet
        await generate_daily_article(sb)
        resp = sb.table("learning_articles").select("*").eq("date", today).limit(1).execute()

    if not resp.data:
        raise HTTPException(404, "No article available today.")

    article = resp.data[0]

    # Check if user has read it
    progress_resp = (
        sb.table("learning_progress")
        .select("read_at, bookmarked")
        .eq("user_id", user_id)
        .eq("article_id", article["id"])
        .limit(1)
        .execute()
    )
    article["user_read"] = bool(progress_resp.data)
    article["user_bookmarked"] = progress_resp.data[0]["bookmarked"] if progress_resp.data else False

    return article


@app.get("/api/learning/archive")
async def get_article_archive(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
    limit: int = 7,
):
    resp = (
        sb.table("learning_articles")
        .select("id, date, title, summary, topic, difficulty, reading_time_minutes")
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    articles = resp.data or []

    # Get user's reading progress
    article_ids = [a["id"] for a in articles]
    if article_ids:
        progress_resp = (
            sb.table("learning_progress")
            .select("article_id, bookmarked")
            .eq("user_id", user_id)
            .in_("article_id", article_ids)
            .execute()
        )
        read_map = {p["article_id"]: p for p in (progress_resp.data or [])}
        for article in articles:
            article["user_read"] = article["id"] in read_map
            article["user_bookmarked"] = read_map.get(article["id"], {}).get("bookmarked", False)
    else:
        for article in articles:
            article["user_read"] = False
            article["user_bookmarked"] = False

    return {"articles": articles}


@app.post("/api/learning/{article_id}/mark-read")
async def mark_article_read(
    article_id: int,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    sb.table("learning_progress").upsert(
        {
            "user_id": user_id,
            "article_id": article_id,
            "read_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id,article_id",
    ).execute()
    return {"status": "marked_read"}


@app.post("/api/learning/{article_id}/bookmark")
async def toggle_bookmark(
    article_id: int,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    existing = (
        sb.table("learning_progress")
        .select("bookmarked")
        .eq("user_id", user_id)
        .eq("article_id", article_id)
        .limit(1)
        .execute()
    )
    currently_bookmarked = existing.data[0]["bookmarked"] if existing.data else False

    sb.table("learning_progress").upsert(
        {
            "user_id": user_id,
            "article_id": article_id,
            "bookmarked": not currently_bookmarked,
            "read_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id,article_id",
    ).execute()
    return {"bookmarked": not currently_bookmarked}


# ─── Debt Manager Routes ────────────────────────────────────────────────────


async def _get_user_credit_card_debts(user_id: str, sb) -> list[dict]:
    """Shared helper: fetch credit card debts with balances, APRs, minimums."""
    resp = (
        sb.table("accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("type", "credit")
        .execute()
    )
    cards = resp.data or []

    if not cards:
        return []

    account_ids = [c["plaid_account_id"] for c in cards if c.get("plaid_account_id")]
    cc_details_resp = (
        sb.table("credit_card_details")
        .select("*")
        .in_("account_id", account_ids)
        .execute()
    )
    cc_details = {d["account_id"]: d for d in (cc_details_resp.data or [])}

    debts = []
    for card in cards:
        balance = abs(card.get("balance_current", 0) or 0)
        if balance <= 0:
            continue

        details = cc_details.get(card["plaid_account_id"], {})
        aprs = details.get("aprs", []) or []

        purchase_apr = 24.99
        for apr_entry in aprs:
            if apr_entry.get("type") == "purchase":
                purchase_apr = float(apr_entry.get("apr", 24.99))
                break

        min_payment = details.get("minimum_payment", 25) or 25

        debts.append(
            {
                "account_id": card["plaid_account_id"],
                "name": card.get("name", "Unknown Card"),
                "balance": round(balance, 2),
                "apr": purchase_apr,
                "minimum_payment": round(float(min_payment), 2),
                "due_date": details.get("next_payment_due_date"),
                "credit_limit": card.get("balance_limit"),
                "utilization": round(balance / card["balance_limit"] * 100, 1)
                if card.get("balance_limit")
                else None,
            }
        )

    return debts


@app.get("/api/debt/overview")
async def get_debt_overview(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    debts = await _get_user_credit_card_debts(user_id, sb)
    total_balance = sum(d["balance"] for d in debts)

    return {
        "debts": debts,
        "total_balance": round(total_balance, 2),
        "total_minimum_payments": round(sum(d["minimum_payment"] for d in debts), 2),
        "weighted_avg_apr": round(
            sum(d["balance"] * d["apr"] for d in debts) / total_balance, 2
        )
        if total_balance > 0
        else 0,
    }


class DebtPayoffRequest(BaseModel):
    extra_monthly_payment: float = 0


@app.post("/api/debt/payoff-calculator")
async def calculate_payoff(
    body: DebtPayoffRequest,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    debts = await _get_user_credit_card_debts(user_id, sb)

    if not debts:
        return {"has_debt": False, "message": "No credit card debt found."}

    debt_accounts = [
        DebtAccount(
            account_id=d["account_id"],
            name=d["name"],
            balance=d["balance"],
            apr=d["apr"],
            minimum_payment=d["minimum_payment"],
        )
        for d in debts
    ]

    return compare_strategies(debt_accounts, body.extra_monthly_payment)


@app.post("/api/debt/save-plan")
async def save_payoff_plan(
    body: dict,
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    sb.table("debt_payoff_plans").upsert(
        {
            "user_id": user_id,
            "strategy": body["strategy"],
            "extra_monthly_payment": body["extra_monthly_payment"],
            "snapshot": body.get("snapshot", {}),
            "created_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id,strategy",
    ).execute()
    return {"status": "saved"}


# ─── Dev / Cleanup Routes ────────────────────────────────────────────────────


@app.post("/api/plaid/cleanup-duplicates")
async def cleanup_duplicate_plaid_items(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    """Remove duplicate Plaid items, keeping only the newest. Deletes orphan accounts."""
    resp = (
        sb.table("plaid_items")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    items = resp.data or []

    if len(items) <= 1:
        return {"status": "no_duplicates", "items": len(items)}

    # Keep the newest, delete the rest
    keep = items[0]
    to_delete = items[1:]
    deleted_item_ids = []

    for item in to_delete:
        sb.table("plaid_items").delete().eq("id", item["id"]).execute()
        deleted_item_ids.append(item["item_id"])

    # Delete accounts that don't belong to the kept item by re-syncing
    # First, get all account IDs from the kept item
    access_token = keep["access_token"]
    try:
        synced = await sync_accounts(user_id, access_token, sb)
        kept_account_ids = {a["plaid_account_id"] for a in synced}

        # Delete any accounts not in the kept set
        all_accounts_resp = (
            sb.table("accounts")
            .select("id, plaid_account_id")
            .eq("user_id", user_id)
            .execute()
        )
        for acct in all_accounts_resp.data or []:
            if acct["plaid_account_id"] not in kept_account_ids:
                sb.table("accounts").delete().eq("id", acct["id"]).execute()
    except Exception as e:
        logger.error(f"Re-sync after cleanup failed: {e}")

    return {
        "status": "cleaned",
        "kept_item": keep["item_id"],
        "deleted_items": deleted_item_ids,
    }


@app.post("/api/dev/seed-alerts")
async def seed_alert_data(
    user_id: str = Depends(get_current_user),
    sb=Depends(get_supabase),
):
    """DEV ONLY: Seed credit card due dates and generate alerts for testing."""
    from alerts.alert_engine import evaluate_payment_alerts, dispatch_alerts

    resp = (
        sb.table("accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("type", "credit")
        .execute()
    )
    cards = resp.data or []

    if not cards:
        return {"status": "no_credit_cards"}

    today = datetime.now()
    seeded = []

    for i, card in enumerate(cards):
        # Stagger due dates: 1 day, 3 days, 7 days, 12 days from now
        days_offsets = [1, 3, 7, 12]
        days_out = days_offsets[i % len(days_offsets)]
        due_date = (today + timedelta(days=days_out)).strftime("%Y-%m-%d")

        sb.table("credit_card_details").upsert(
            {
                "account_id": card["plaid_account_id"],
                "minimum_payment": 25 + (i * 10),
                "next_payment_due_date": due_date,
                "last_statement_balance": card.get("balance_current", 0),
                "last_payment_amount": 50,
                "last_payment_date": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
                "aprs": [
                    {"apr": 24.99, "type": "purchase"},
                    {"apr": 29.99, "type": "penalty"},
                ],
            },
            on_conflict="account_id",
        ).execute()

        seeded.append(
            {"card": card["name"], "due_date": due_date, "days_out": days_out}
        )

    # Now generate and save alerts
    alerts = await evaluate_payment_alerts(user_id, sb)
    await dispatch_alerts(user_id, alerts, sb)

    return {
        "status": "seeded",
        "cards_updated": len(seeded),
        "alerts_generated": len(alerts),
        "details": seeded,
    }


# ─── Tax Calculator Routes ────────────────────────────────────────────────────


# ─── Health Check ─────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "operational", "time": datetime.utcnow().isoformat()}


