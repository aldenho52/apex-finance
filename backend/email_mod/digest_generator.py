"""
Weekly digest — data gathering, AI insight generation, and HTML email rendering.
"""

import os
import logging
from datetime import datetime, timedelta

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


async def gather_digest_data(user_id: str, sb) -> dict:
    """Gather all data needed for the weekly digest."""
    today = datetime.utcnow()
    week_ago = (today - timedelta(days=7)).strftime("%Y-%m-%d")

    accounts_resp = sb.table("accounts").select("*").eq("user_id", user_id).execute()
    accounts = accounts_resp.data or []

    asset_types = {"depository", "investment"}
    liability_types = {"credit", "loan"}
    net_worth = sum(
        a["balance_current"] if a["type"] in asset_types
        else -abs(a["balance_current"]) if a["type"] in liability_types
        else 0
        for a in accounts
    )

    prev_week_start = (today - timedelta(days=14)).strftime("%Y-%m-%d")
    prev_resp = (
        sb.table("weekly_snapshots")
        .select("net_worth, total_debt, total_spending")
        .eq("user_id", user_id)
        .gte("week_start", prev_week_start)
        .order("week_start", desc=True)
        .limit(1)
        .execute()
    )
    prev_snapshot = prev_resp.data[0] if prev_resp.data else None

    txn_resp = (
        sb.table("transactions")
        .select("amount, merchant_name, category, date")
        .eq("user_id", user_id)
        .gte("date", week_ago)
        .execute()
    )
    transactions = txn_resp.data or []
    total_spending = sum(t["amount"] for t in transactions if t["amount"] > 0)

    category_totals: dict[str, float] = {}
    for t in transactions:
        if t["amount"] > 0:
            cats = t.get("category")
            cat = cats[0] if isinstance(cats, list) and cats else "Uncategorized"
            category_totals[cat] = category_totals.get(cat, 0) + t["amount"]
    top_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    alerts_resp = (
        sb.table("alerts")
        .select("severity, title, message, due_date")
        .eq("user_id", user_id)
        .eq("acknowledged", False)
        .order("severity")
        .limit(5)
        .execute()
    )

    total_debt = sum(abs(a["balance_current"]) for a in accounts if a["type"] in liability_types)

    return {
        "net_worth": round(net_worth, 2),
        "net_worth_prev": prev_snapshot["net_worth"] if prev_snapshot else None,
        "total_debt": round(total_debt, 2),
        "total_spending": round(total_spending, 2),
        "top_categories": top_categories,
        "alerts": alerts_resp.data or [],
        "accounts_count": len(accounts),
        "transaction_count": len(transactions),
    }


async def generate_ai_insight(digest_data: dict) -> str:
    """Generate a single AI-powered insight for the digest."""
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    nw_prev = digest_data.get("net_worth_prev")
    nw_str = f"${nw_prev:,.0f}" if nw_prev else "N/A"

    prompt = (
        "Based on this weekly financial summary, write ONE concise, actionable insight "
        "(2-3 sentences max). Be specific with numbers. Direct tone, like a CFO friend.\n\n"
        f"Net worth: ${digest_data['net_worth']:,.0f} (prev: {nw_str})\n"
        f"Total debt: ${digest_data['total_debt']:,.0f}\n"
        f"This week's spending: ${digest_data['total_spending']:,.0f}\n"
        f"Top categories: {digest_data['top_categories'][:3]}\n"
        f"Active alerts: {len(digest_data['alerts'])}"
    )

    response = await client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
    )
    return response.choices[0].message.content


def render_digest_html(digest_data: dict, ai_insight: str) -> str:
    """Render the weekly digest as a dark-themed HTML email."""
    nw = digest_data["net_worth"]
    nw_prev = digest_data.get("net_worth_prev")
    nw_change = ""
    if nw_prev is not None:
        diff = nw - nw_prev
        direction = "+" if diff >= 0 else ""
        color = "#22c55e" if diff >= 0 else "#ef4444"
        nw_change = f'<span style="color:{color};font-size:14px">({direction}${diff:,.0f})</span>'

    cat_rows = ""
    for cat, amount in digest_data["top_categories"]:
        cat_rows += (
            f'<tr><td style="padding:6px 0;color:#d1d5db;font-size:13px;font-family:monospace">{cat}</td>'
            f'<td style="padding:6px 0;color:#f87171;font-size:13px;text-align:right;font-family:monospace">'
            f'${amount:,.2f}</td></tr>'
        )

    alert_rows = ""
    sev_colors = {"critical": "#ef4444", "warning": "#f59e0b", "info": "#60a5fa"}
    for a in digest_data["alerts"][:3]:
        color = sev_colors.get(a["severity"], "#6b7280")
        alert_rows += (
            f'<div style="padding:8px 12px;background:#111318;border-radius:6px;margin-bottom:6px;'
            f'border-left:3px solid {color}">'
            f'<span style="color:#d1d5db;font-size:12px;font-family:monospace">{a["title"]}</span></div>'
        )

    alerts_section = ""
    if alert_rows:
        alerts_section = f"""
        <div style="background:#0d0f14;border:1px solid #111827;border-radius:12px;padding:20px;margin-bottom:16px">
            <p style="color:#9ca3af;font-size:10px;letter-spacing:0.1em;font-weight:700;margin:0 0 12px;font-family:monospace">UPCOMING ALERTS</p>
            {alert_rows}
        </div>
        """

    categories_section = ""
    if cat_rows:
        categories_section = f"""
        <div style="background:#0d0f14;border:1px solid #111827;border-radius:12px;padding:20px;margin-bottom:16px">
            <p style="color:#9ca3af;font-size:10px;letter-spacing:0.1em;font-weight:700;margin:0 0 12px;font-family:monospace">TOP SPENDING</p>
            <table style="width:100%;border-collapse:collapse">{cat_rows}</table>
        </div>
        """

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#08090d;font-family:'Courier New',monospace">
<div style="max-width:560px;margin:0 auto;padding:30px 20px">

    <div style="text-align:center;margin-bottom:24px">
        <h1 style="font-size:18px;font-weight:800;letter-spacing:0.2em;color:white;margin:0">APEX</h1>
        <p style="color:#6b7280;font-size:11px;margin:4px 0 0">Weekly Financial Digest</p>
    </div>

    <div style="background:#0d0f14;border:1px solid #111827;border-radius:12px;padding:20px;margin-bottom:16px">
        <p style="color:#9ca3af;font-size:10px;letter-spacing:0.1em;font-weight:700;margin:0 0 8px">NET WORTH</p>
        <p style="font-size:24px;font-weight:800;color:#22c55e;margin:0">${nw:,.0f} {nw_change}</p>
    </div>

    <table style="width:100%;border-collapse:separate;border-spacing:12px 0;margin-bottom:4px"><tr>
        <td style="width:50%;background:#0d0f14;border:1px solid #111827;border-radius:12px;padding:16px;vertical-align:top">
            <p style="color:#9ca3af;font-size:10px;letter-spacing:0.1em;font-weight:700;margin:0 0 6px;font-family:monospace">SPENT THIS WEEK</p>
            <p style="font-size:18px;font-weight:800;color:#f87171;margin:0">${digest_data['total_spending']:,.0f}</p>
        </td>
        <td style="width:50%;background:#0d0f14;border:1px solid #111827;border-radius:12px;padding:16px;vertical-align:top">
            <p style="color:#9ca3af;font-size:10px;letter-spacing:0.1em;font-weight:700;margin:0 0 6px;font-family:monospace">TOTAL DEBT</p>
            <p style="font-size:18px;font-weight:800;color:#f59e0b;margin:0">${digest_data['total_debt']:,.0f}</p>
        </td>
    </tr></table>

    {categories_section}

    {alerts_section}

    <div style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:20px;margin-bottom:16px">
        <p style="color:#93c5fd;font-size:10px;letter-spacing:0.1em;font-weight:700;margin:0 0 8px;font-family:monospace">APEX AI INSIGHT</p>
        <p style="color:#d1d5db;font-size:13px;line-height:1.6;margin:0;font-family:monospace">{ai_insight}</p>
    </div>

    <p style="text-align:center;color:#4b5563;font-size:10px;margin-top:24px;font-family:monospace">
        Sent by APEX Finance &middot; Manage preferences in Settings
    </p>

</div>
</body></html>"""
