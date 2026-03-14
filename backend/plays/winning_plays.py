"""
APEX - Winning Plays Module
AI-generated actionable financial moves personalized to the user's data.
"""

import hashlib
import json
import logging
import re
from datetime import datetime, timedelta

from supabase import Client
from openai import AsyncOpenAI

from ai.assistant import get_financial_context

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        import os
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


MODEL = "gpt-4o-mini"

PLAYS_PROMPT = """You are a sharp financial advisor inside the APEX personal finance app.
Analyze this user's REAL financial data and generate 5-7 specific, actionable financial moves they should make THIS WEEK.

Financial data:
{financial_context}

Each play must reference their ACTUAL numbers — specific account names, balances, APRs, spending amounts. No generic advice.

Return ONLY a valid JSON array where each item has:
{{
  "title": "short action title (under 50 chars)",
  "description": "2-3 sentences explaining WHY this matters, referencing their specific numbers",
  "impact": "HIGH" or "MEDIUM" or "QUICK_WIN",
  "reward_amount": dollar amount saved or earned (number, no dollar sign),
  "reward_timeframe": "per month" or "per year" or "one-time" or "in 10 years",
  "time_to_complete": "5 min" or "15 min" or "30 min" or "1 hour" or "1 week",
  "category": "debt" or "savings" or "spending" or "investing" or "credit",
  "cta_label": "action button text (e.g. 'Pay Now', 'Set Up Autopay', 'Review')"
}}

Rules:
- Sort by impact: HIGH first, then MEDIUM, then QUICK_WIN
- HIGH = saves/earns >$500/year or prevents significant financial damage
- MEDIUM = saves/earns $100-500/year
- QUICK_WIN = saves <$100/year but takes <10 min
- If they have high-APR debt, a debt payoff play MUST be first
- If cash flow is negative or breaking even, a spending cut play MUST be included
- If they have idle cash or aren't maximizing investments, include an investing play
- Reference specific account names, balances, and amounts from the data
- Return ONLY the JSON array, no markdown fences, no explanation"""


def _generate_play_id(title: str) -> str:
    return hashlib.md5(title.lower().strip().encode()).hexdigest()[:12]


async def _generate_plays(user_id: str, sb: Client) -> list[dict]:
    """Generate personalized plays using OpenAI and the user's financial context."""
    client = _get_client()

    financial_ctx = await get_financial_context(user_id, sb)
    prompt = PLAYS_PROMPT.format(financial_context=financial_ctx)

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
        )
        text = response.choices[0].message.content.strip()

        # Strip markdown fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        plays = json.loads(text)

        # Assign deterministic play_id to each
        for play in plays:
            play["play_id"] = _generate_play_id(play.get("title", ""))

        return plays
    except Exception as e:
        logger.error(f"Failed to generate winning plays for {user_id}: {e}")
        return []


async def get_winning_plays(
    user_id: str, sb: Client, force_refresh: bool = False
) -> list[dict]:
    """Get winning plays for a user, using cache when available."""
    now = datetime.utcnow()

    # Check cache
    if not force_refresh:
        try:
            cached = (
                sb.table("winning_plays")
                .select("plays, expires_at")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if cached.data:
                expires = cached.data[0].get("expires_at", "")
                if expires and expires > now.isoformat():
                    plays = cached.data[0].get("plays", [])
                    return _filter_dismissed(user_id, plays, sb)
        except Exception as e:
            logger.error(f"Failed to read plays cache for {user_id}: {e}")

    # Generate fresh plays
    plays = await _generate_plays(user_id, sb)

    # Cache them
    if plays:
        try:
            sb.table("winning_plays").upsert(
                {
                    "user_id": user_id,
                    "plays": plays,
                    "generated_at": now.isoformat(),
                    "expires_at": (now + timedelta(hours=24)).isoformat(),
                },
                on_conflict="user_id",
            ).execute()
        except Exception as e:
            logger.error(f"Failed to cache plays for {user_id}: {e}")

    return _filter_dismissed(user_id, plays, sb)


def _filter_dismissed(user_id: str, plays: list[dict], sb: Client) -> list[dict]:
    """Remove plays the user has dismissed."""
    try:
        dismissed_resp = (
            sb.table("winning_plays_dismissed")
            .select("play_id")
            .eq("user_id", user_id)
            .execute()
        )
        dismissed_ids = {d["play_id"] for d in (dismissed_resp.data or [])}
        return [p for p in plays if p.get("play_id") not in dismissed_ids]
    except Exception as e:
        logger.error(f"Failed to fetch dismissed plays for {user_id}: {e}")
        return plays


async def dismiss_play(user_id: str, play_id: str, sb: Client) -> dict:
    """Dismiss a play so it doesn't appear again."""
    sb.table("winning_plays_dismissed").upsert(
        {
            "user_id": user_id,
            "play_id": play_id,
            "dismissed_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id,play_id",
    ).execute()
    return {"status": "dismissed"}
