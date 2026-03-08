"""
APEX - AI Assistant Module
Claude-powered conversational layer with full financial context.
"""

import os
import json
from datetime import datetime
from supabase import Client
import anthropic

SYSTEM_PROMPT = """
You are APEX, an AI-powered personal finance assistant. You help users manage their money,
understand their financial position, and make smarter decisions.

PERSONALITY:
- Direct, no-fluff. Like a CFO who's also your friend.
- Give concrete numbers, not vague advice.
- Proactive — surface things they didn't think to ask.
- Never hedge unnecessarily. If you don't know something, say so.

FINANCIAL CONTEXT (always available):
{financial_context}

RULES:
1. For payments: always state the CONSEQUENCE of missing (late fee + APR, not just "it's due")
2. For rental properties: always frame as "effective cost" after depreciation, not raw cash flow loss
3. Keep responses under 150 words unless the user asks for depth
4. If you see a financial opportunity or risk the user hasn't asked about, mention it briefly at the end
"""


async def get_financial_context(user_id: str, sb: Client) -> str:
    accounts_resp = sb.table("accounts").select("name, type, balance_current").eq("user_id", user_id).execute()
    alerts_resp = (
        sb.table("alerts")
        .select("severity, title, message")
        .eq("user_id", user_id)
        .eq("acknowledged", False)
        .order("severity")
        .limit(5)
        .execute()
    )
    rental_resp = (
        sb.table("rental_reports")
        .select("analysis, pnl")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    latest_rental = rental_resp.data[0] if rental_resp.data else None

    context = {
        "accounts": [
            {"name": a["name"], "type": a["type"], "balance": a["balance_current"]}
            for a in (accounts_resp.data or [])
        ],
        "active_alerts": [
            {"severity": al["severity"], "title": al["title"], "message": al["message"][:100]}
            for al in (alerts_resp.data or [])
        ],
        "rental_summary": {
            "verdict": latest_rental["analysis"]["verdict"] if latest_rental else "unknown",
            "monthly_cash_flow": latest_rental["pnl"]["cash_flow"] if latest_rental else None,
            "effective_cost": latest_rental["pnl"]["effective_cost"] if latest_rental else None,
        } if latest_rental else {}
    }

    return json.dumps(context, indent=2)


async def chat(user_id: str, message: str, conversation_history: list, sb: Client) -> str:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    financial_ctx = await get_financial_context(user_id, sb)

    system = SYSTEM_PROMPT.format(financial_context=financial_ctx)

    messages = conversation_history[-20:] + [{"role": "user", "content": message}]

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=system,
        messages=messages
    )

    reply = response.content[0].text

    # Save to conversation history
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
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    financial_ctx = await get_financial_context(user_id, sb)

    prompt = f"""
Based on this financial context, write a morning brief for today.
Format: 3 bullets max. Each bullet = one concrete thing to do or know today.
Be specific with numbers. Under 80 words total.

Financial context: {financial_ctx}
Today: {datetime.now().strftime('%A, %B %d')}
"""

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text
