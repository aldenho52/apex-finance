"""Cash flow aggregation — income vs expenses by period."""

import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

PERIOD_DAYS = {
    "monthly": 30,
    "3months": 90,
    "6months": 180,
    "1year": 365,
    "2years": 730,
    "3years": 1095,
}

PERIOD_MONTHS = {
    "monthly": 1,
    "3months": 3,
    "6months": 6,
    "1year": 12,
    "2years": 24,
    "3years": 36,
}


def _get_start_date(period: str) -> tuple[str, float]:
    """Return (start_date YYYY-MM-DD, months_in_period)."""
    if period == "ytd":
        now = datetime.utcnow()
        start = now.strftime("%Y-01-01")
        months = now.month + (now.day - 1) / 30.0
        return start, max(months, 1)

    days = PERIOD_DAYS.get(period, 30)
    start = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    months = PERIOD_MONTHS.get(period, 1)
    return start, months


async def get_cash_flow_summary(user_id: str, period: str, sb) -> dict:
    """Aggregate income vs expenses for a given period."""
    start_date, months_in_period = _get_start_date(period)

    txn_resp = (
        sb.table("transactions")
        .select("amount, merchant_name, category, date")
        .eq("user_id", user_id)
        .gte("date", start_date)
        .order("date", desc=True)
        .execute()
    )
    transactions = txn_resp.data or []

    total_expenses = 0.0
    total_income = 0.0
    category_totals: dict[str, float] = {}
    income_sources: dict[str, float] = {}

    for t in transactions:
        amount = t["amount"]
        if amount > 0:
            # Expense / outflow
            total_expenses += amount
            cats = t.get("category")
            cat = cats[0] if isinstance(cats, list) and cats else "Uncategorized"
            category_totals[cat] = category_totals.get(cat, 0) + amount
        elif amount < 0:
            # Income / deposit
            inc = abs(amount)
            total_income += inc
            source = t.get("merchant_name") or t.get("name") or "Unknown"
            income_sources[source] = income_sources.get(source, 0) + inc

    net_cash_flow = total_income - total_expenses

    if net_cash_flow > 0:
        status = "building_wealth"
    elif net_cash_flow < 0:
        status = "building_debt"
    else:
        status = "breaking_even"

    top_expense_categories = [
        {"category": cat, "amount": round(amt, 2)}
        for cat, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    top_income_sources = [
        {"source": src, "amount": round(amt, 2)}
        for src, amt in sorted(income_sources.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_cash_flow": round(net_cash_flow, 2),
        "monthly_avg_income": round(total_income / months_in_period, 2),
        "monthly_avg_expenses": round(total_expenses / months_in_period, 2),
        "status": status,
        "top_expense_categories": top_expense_categories,
        "top_income_sources": top_income_sources,
        "period": period,
        "start_date": start_date,
        "transaction_count": len(transactions),
    }
