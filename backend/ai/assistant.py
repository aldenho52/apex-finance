"""
APEX - AI Assistant Module
OpenAI-powered conversational layer with full financial context.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from supabase import Client
from openai import AsyncOpenAI

from cashflow.cash_flow import get_cash_flow_summary

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """You are APEX, a personal finance AI assistant. You have real-time access to the user's financial data.

PERSONALITY:
- Direct, sharp, no filler. Like a CFO who genuinely wants them to win.
- Always use their actual numbers — never give generic advice.
- Proactive: if you see a risk or opportunity they didn't ask about, mention it briefly.
- Never hedge with "it depends." Give your best recommendation, then note caveats.
- Confident but honest — if you don't have enough data, say so.

YOUR FINANCIAL DATA (refreshed each message):
{financial_context}

HOW TO USE THE DATA:
- Accounts: reference specific balances. Net worth = assets - liabilities.
- Alerts: if critical/high alerts exist, mention them even if not asked.
- Recent transactions: spot patterns, flag unusual spending, identify recurring charges.
- Cash flow: assess whether they're building wealth or bleeding money. Reference the status.
- Debt: know their APRs, due dates, utilization. Recommend payoff strategy when relevant.
- Weekly trend: reference week-over-week changes in net worth and spending.

RESPONSE RULES:
1. Lead with the specific number or fact, then explain.
2. For payment questions: state the CONSEQUENCE of missing (late fee amount + penalty APR).
3. Keep answers under 150 words unless the user asks for depth or the question requires it.
4. End with one concrete action step when appropriate.
5. Use markdown sparingly — **bold** key numbers, bullet points for lists.
6. Today is {today}."""


async def get_financial_context(user_id: str, sb: Client) -> str:
    """Gather comprehensive financial context for the AI."""
    context: dict = {}
    today = datetime.utcnow()

    try:
        accounts_resp = (
            sb.table("accounts")
            .select("id, name, type, balance_current, balance_limit, institution_name")
            .eq("user_id", user_id)
            .execute()
        )
        raw_accounts = accounts_resp.data or []
        context["accounts"] = [
            {
                "id": a["id"],
                "name": a["name"],
                "type": a["type"],
                "balance": a["balance_current"],
                "limit": a.get("balance_limit"),
                "institution": a.get("institution_name"),
            }
            for a in raw_accounts
        ]
    except Exception as e:
        logger.error(f"Failed to fetch accounts for context: {e}")
        context["accounts"] = []

    try:
        alerts_resp = (
            sb.table("alerts")
            .select("severity, title, message")
            .eq("user_id", user_id)
            .eq("acknowledged", False)
            .order("severity")
            .limit(5)
            .execute()
        )
        context["active_alerts"] = [
            {"severity": al["severity"], "title": al["title"], "message": al["message"][:100]}
            for al in (alerts_resp.data or [])
        ]
    except Exception as e:
        logger.error(f"Failed to fetch alerts for context: {e}")
        context["active_alerts"] = []

    try:
        thirty_days_ago = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        txn_resp = (
            sb.table("transactions")
            .select("name, merchant_name, amount, date, category")
            .eq("user_id", user_id)
            .gte("date", thirty_days_ago)
            .order("date", desc=True)
            .limit(15)
            .execute()
        )
        context["recent_transactions"] = [
            {
                "merchant": t.get("merchant_name") or t.get("name") or "Unknown",
                "amount": t["amount"],
                "date": t["date"],
                "category": t["category"][0] if isinstance(t.get("category"), list) and t["category"] else "Uncategorized",
            }
            for t in (txn_resp.data or [])
        ]
    except Exception as e:
        logger.error(f"Failed to fetch transactions for context: {e}")
        context["recent_transactions"] = []

    try:
        cash_flow = await get_cash_flow_summary(user_id, "monthly", sb)
        context["cash_flow"] = {
            "total_income": cash_flow["total_income"],
            "total_expenses": cash_flow["total_expenses"],
            "net_cash_flow": cash_flow["net_cash_flow"],
            "status": cash_flow["status"],
            "top_expense_categories": cash_flow["top_expense_categories"][:5],
        }
    except Exception as e:
        logger.error(f"Failed to fetch cash flow for context: {e}")
        context["cash_flow"] = {}

    try:
        credit_accounts = [a for a in context.get("accounts", []) if a["type"] == "credit" and (a["balance"] or 0) > 0]
        if credit_accounts:
            # Scope query to only this user's account IDs
            account_ids = [a["id"] for a in credit_accounts]
            details_resp = (
                sb.table("credit_card_details")
                .select("account_id, minimum_payment, next_payment_due_date, aprs")
                .in_("account_id", account_ids)
                .execute()
            )
            details_map = {d["account_id"]: d for d in (details_resp.data or [])}

            cards = []
            for acc in credit_accounts:
                card = {"name": acc["name"], "balance": acc["balance"], "limit": acc.get("limit")}
                detail = details_map.get(acc["id"])
                if detail:
                    card["due_date"] = detail.get("next_payment_due_date")
                    card["min_payment"] = detail.get("minimum_payment")
                    aprs = detail.get("aprs", [])
                    if aprs and isinstance(aprs, list):
                        card["apr"] = aprs[0].get("apr_percentage") if isinstance(aprs[0], dict) else None
                cards.append(card)

            context["debt"] = {
                "total_balance": round(sum(c["balance"] for c in cards), 2),
                "cards": cards,
            }

            plan_resp = (
                sb.table("debt_payoff_plans")
                .select("strategy, extra_monthly_payment")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if plan_resp.data:
                context["debt"]["active_payoff_plan"] = plan_resp.data[0]
        else:
            context["debt"] = {"total_balance": 0, "cards": []}
    except Exception as e:
        logger.error(f"Failed to fetch debt for context: {e}")
        context["debt"] = {}

    try:
        snapshot_resp = (
            sb.table("weekly_snapshots")
            .select("week_start, net_worth, total_debt, total_spending, top_categories")
            .eq("user_id", user_id)
            .order("week_start", desc=True)
            .limit(1)
            .execute()
        )
        if snapshot_resp.data:
            snap = snapshot_resp.data[0]
            context["weekly_trend"] = {
                "week_of": snap["week_start"],
                "net_worth": snap["net_worth"],
                "total_debt": snap["total_debt"],
                "total_spending": snap["total_spending"],
            }
    except Exception as e:
        logger.error(f"Failed to fetch weekly snapshot for context: {e}")

    context["today"] = today.strftime("%A, %B %d, %Y")

    return json.dumps(context, indent=2)


async def chat(user_id: str, message: str, conversation_history: list, sb: Client) -> str:
    client = _get_client()

    financial_ctx = await get_financial_context(user_id, sb)
    today_str = datetime.utcnow().strftime("%A, %B %d, %Y")

    system = SYSTEM_PROMPT.format(financial_context=financial_ctx, today=today_str)

    messages = [{"role": "system", "content": system}]
    for msg in conversation_history[-20:]:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1024,
    )

    reply = response.choices[0].message.content or "I couldn't generate a response. Please try again."

    now = datetime.utcnow().isoformat()
    sb.table("conversations").insert({
        "user_id": user_id,
        "role": "user",
        "content": message,
        "timestamp": now,
    }).execute()
    sb.table("conversations").insert({
        "user_id": user_id,
        "role": "assistant",
        "content": reply,
        "timestamp": now,
    }).execute()

    return reply


# ─── Proactive Daily Brief ────────────────────────────────────────────────────

async def generate_daily_brief(user_id: str, sb: Client) -> str:
    client = _get_client()

    financial_ctx = await get_financial_context(user_id, sb)

    prompt = f"""Based on this financial data, write a sharp morning brief for today.

Financial data:
{financial_ctx}

FORMAT:
- 3 bullets max. Each bullet = one concrete thing to do or know today.
- Reference specific numbers from the data (balances, amounts, due dates).
- If there are critical alerts, lead with those.
- If cash flow status is "building_debt", flag it.
- Under 100 words total. No fluff."""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
    )

    return response.choices[0].message.content or "No brief available today."
