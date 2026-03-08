"""Weekly digest job — runs every Sunday at 9am."""

import logging
from datetime import datetime, timedelta

from email_mod.digest_generator import gather_digest_data, generate_ai_insight, render_digest_html
from email_mod.email_service import send_email

logger = logging.getLogger(__name__)


async def run_weekly_digest_job(sb):
    """Send weekly email digest to all opted-in users."""
    # Get users with digest enabled
    prefs_resp = (
        sb.table("email_preferences")
        .select("user_id, email_override")
        .eq("digest_enabled", True)
        .execute()
    )
    users = prefs_resp.data or []

    # Fallback: if no preferences exist, send to all active users
    if not users:
        users_resp = sb.table("users_profile").select("id").eq("active", True).execute()
        users = [{"user_id": u["id"], "email_override": None} for u in (users_resp.data or [])]

    logger.info(f"Running weekly digest for {len(users)} users")

    for user_pref in users:
        try:
            user_id = user_pref["user_id"]

            # Get user email from Supabase Auth
            user_resp = sb.auth.admin.get_user_by_id(user_id)
            user_email = user_pref.get("email_override") or user_resp.user.email

            if not user_email:
                continue

            # Gather data and generate digest
            digest_data = await gather_digest_data(user_id, sb)
            ai_insight = await generate_ai_insight(digest_data)
            html = render_digest_html(digest_data, ai_insight)

            # Save weekly snapshot
            today = datetime.utcnow()
            week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
            sb.table("weekly_snapshots").upsert(
                {
                    "user_id": user_id,
                    "week_start": week_start,
                    "net_worth": digest_data["net_worth"],
                    "total_debt": digest_data["total_debt"],
                    "total_spending": digest_data["total_spending"],
                    "top_categories": [
                        {"name": c[0], "amount": c[1]} for c in digest_data["top_categories"]
                    ],
                },
                on_conflict="user_id,week_start",
            ).execute()

            # Send email
            subject = f"APEX Weekly Digest — {today.strftime('%b %d')}"
            send_email(user_email, subject, html)

            # Update last sent timestamp
            sb.table("email_preferences").upsert(
                {
                    "user_id": user_id,
                    "last_digest_sent_at": datetime.utcnow().isoformat(),
                },
                on_conflict="user_id",
            ).execute()

            logger.info(f"Weekly digest sent to {user_email}")

        except Exception as e:
            logger.error(f"Weekly digest failed for user {user_pref.get('user_id')}: {e}")
