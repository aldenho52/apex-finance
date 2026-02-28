"""
APEX - AI Assistant Module
Claude-powered conversational layer with full financial + health context.
Knows about your accounts, rental, diet, and goals.
"""

import os
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import anthropic

SYSTEM_PROMPT = """
You are APEX, a personal AI operating system for Alden — a 32-year-old full-stack engineer 
and former CTO living in NYC, moving to Cherry Hill NJ. You manage his finances and health.

PERSONALITY:
- Direct, no-fluff. Like a CFO who's also your friend.
- Give concrete numbers, not vague advice.
- Proactive — surface things he didn't think to ask.
- Never hedge unnecessarily. If you don't know something, say so.

FINANCIAL CONTEXT (always available):
{financial_context}

HEALTH CONTEXT:
{health_context}

GOALS:
- Income: $135K now → $250-350K within 12 months (targeting quant/AI/big tech roles)
- Wealth: Long-term $100M+ target
- Health: Carnivore diet, daily Muay Thai, high protein/fat macros
- Faith: Christian, daily prayer
- Moving: NYC → Cherry Hill, NJ (tax savings: no NYC city tax)

RULES:
1. For payments: always state the CONSEQUENCE of missing (late fee + APR, not just "it's due")
2. For the rental: always frame as "effective cost" after depreciation, not raw cash flow loss
3. For carnivore diet: NEVER suggest vegetables, grains, or supplements. Animal-based only.
4. For career: focus on actionable moves toward the $250-350K target
5. Keep responses under 150 words unless the user asks for depth
6. If you see a financial opportunity or risk the user hasn't asked about, mention it briefly at the end
"""


async def get_financial_context(user_id: str, db: AsyncIOMotorClient) -> str:
    """Build a JSON summary of current financial state for the AI context."""
    accounts = await db.accounts.find({"user_id": user_id}).to_list(None)
    alerts = await db.alerts.find({"user_id": user_id, "acknowledged": False}).sort("severity", 1).limit(5).to_list(None)
    latest_rental = await db.rental_reports.find_one({"user_id": user_id}, sort=[("created_at", -1)])
    
    context = {
        "accounts": [
            {
                "name": a["name"],
                "type": a["type"],
                "balance": a["balance_current"],
                "apr": a.get("apr"),
                "due_date": a.get("next_payment_due_date"),
            }
            for a in accounts
        ],
        "active_alerts": [
            {"severity": al["severity"], "title": al["title"], "message": al["message"][:100]}
            for al in alerts
        ],
        "rental_summary": {
            "verdict": latest_rental["analysis"]["verdict"] if latest_rental else "unknown",
            "monthly_cash_flow": latest_rental["pnl"]["cash_flow"] if latest_rental else None,
            "effective_cost": latest_rental["pnl"]["effective_cost"] if latest_rental else None,
        } if latest_rental else {}
    }
    
    return json.dumps(context, indent=2)


async def get_health_context(user_id: str, db: AsyncIOMotorClient) -> str:
    """Build health/carnivore context."""
    today_log = await db.food_logs.find_one({"user_id": user_id, "date": datetime.now().strftime("%Y-%m-%d")})
    streak = await db.streaks.find_one({"user_id": user_id, "type": "carnivore"})
    
    return json.dumps({
        "today_protein": today_log.get("total_protein", 0) if today_log else 0,
        "today_fat": today_log.get("total_fat", 0) if today_log else 0,
        "target_protein": 220,
        "target_fat": 160,
        "carnivore_streak_days": streak.get("current_streak", 0) if streak else 0,
        "meals_today": today_log.get("meals", []) if today_log else [],
    })


async def chat(user_id: str, message: str, conversation_history: list, db: AsyncIOMotorClient) -> str:
    """
    Main chat function — takes user message, returns AI response.
    Injects full financial + health context on every call.
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    financial_ctx = await get_financial_context(user_id, db)
    health_ctx = await get_health_context(user_id, db)
    
    system = SYSTEM_PROMPT.format(
        financial_context=financial_ctx,
        health_context=health_ctx
    )
    
    # Build messages array (last 10 turns for context)
    messages = conversation_history[-20:] + [{"role": "user", "content": message}]
    
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=system,
        messages=messages
    )
    
    reply = response.content[0].text
    
    # Save to conversation history
    await db.conversations.insert_one({
        "user_id": user_id,
        "role": "user",
        "content": message,
        "timestamp": datetime.utcnow()
    })
    await db.conversations.insert_one({
        "user_id": user_id,
        "role": "assistant",
        "content": reply,
        "timestamp": datetime.utcnow()
    })
    
    return reply


# ─── Proactive Daily Brief ────────────────────────────────────────────────────

async def generate_daily_brief(user_id: str, db: AsyncIOMotorClient) -> str:
    """
    Morning brief — surfaces the 3 most important things for today.
    Delivered via push notification + available in app.
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    financial_ctx = await get_financial_context(user_id, db)
    health_ctx = await get_health_context(user_id, db)
    
    prompt = f"""
Based on this financial and health context, write a morning brief for today.
Format: 3 bullets max. Each bullet = one concrete thing to do or know today.
Be specific with numbers. Under 80 words total.

Financial context: {financial_ctx}
Health context: {health_ctx}
Today: {datetime.now().strftime('%A, %B %d')}
"""
    
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text


# ─── Carnivore Food Classifier ────────────────────────────────────────────────

async def classify_carnivore(food: str) -> dict:
    """
    Is this carnivore? Returns classification + explanation.
    Respects different carnivore tiers (strict beef-only vs. animal-based).
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=150,
        system="""You are a carnivore diet expert. Classify foods strictly.
Respond with JSON: {"carnivore": true/false, "tier": "strict/animal-based/borderline/no", "explanation": "one sentence"}
Strict = beef/lamb/pork/organs only. Animal-based = any animal product. Borderline = spices, coffee, etc.""",
        messages=[{"role": "user", "content": f"Is '{food}' carnivore?"}]
    )
    
    import json
    try:
        return json.loads(response.content[0].text)
    except:
        return {"carnivore": None, "explanation": response.content[0].text}
