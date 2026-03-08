"""
Debt payoff calculator — pure functions, no database access.
Implements minimum-only, snowball, and avalanche strategies.
"""

from dataclasses import dataclass


@dataclass
class DebtAccount:
    account_id: str
    name: str
    balance: float
    apr: float
    minimum_payment: float


@dataclass
class PayoffSchedule:
    strategy: str
    total_months: int
    total_interest_paid: float
    total_paid: float
    monthly_breakdown: list[dict]
    payoff_order: list[str]


def _simulate_payoff(
    debts: list[DebtAccount], extra_monthly: float, sort_key: str
) -> PayoffSchedule:
    """
    Core simulation loop used by all strategies.
    sort_key: 'balance' for snowball (smallest first), 'apr' for avalanche (highest first).
    """
    active = [
        {
            "id": d.account_id,
            "name": d.name,
            "balance": d.balance,
            "apr": d.apr,
            "min_payment": d.minimum_payment,
            "original_min": d.minimum_payment,
        }
        for d in debts
        if d.balance > 0
    ]

    if not active:
        return PayoffSchedule(
            strategy=sort_key,
            total_months=0,
            total_interest_paid=0,
            total_paid=0,
            monthly_breakdown=[],
            payoff_order=[],
        )

    month = 0
    total_interest = 0.0
    total_paid = 0.0
    payoff_order = []
    monthly_breakdown = []
    freed_payment = 0.0
    MAX_MONTHS = 360  # 30-year cap

    while any(d["balance"] > 0.01 for d in active) and month < MAX_MONTHS:
        month += 1

        # Sort by strategy priority
        if sort_key == "balance":
            active.sort(key=lambda d: d["balance"] if d["balance"] > 0.01 else float("inf"))
        else:  # apr — highest first
            active.sort(key=lambda d: -d["apr"] if d["balance"] > 0.01 else float("inf"))

        month_interest = 0.0
        month_principal = 0.0
        month_payment = 0.0
        newly_freed = 0.0

        # Phase 1: accrue interest + pay minimums
        for debt in active:
            if debt["balance"] <= 0.01:
                continue

            interest = debt["balance"] * (debt["apr"] / 100.0 / 12.0)
            debt["balance"] += interest
            month_interest += interest

            payment = min(debt["min_payment"], debt["balance"])
            debt["balance"] -= payment
            month_payment += payment

            principal_portion = max(payment - interest, 0)
            month_principal += principal_portion

            if debt["balance"] <= 0.01:
                debt["balance"] = 0
                newly_freed += debt["original_min"]
                if debt["id"] not in payoff_order:
                    payoff_order.append(debt["id"])

        # Phase 2: apply extra + freed payments to priority debt
        available_extra = extra_monthly + freed_payment + newly_freed
        for debt in active:
            if debt["balance"] <= 0.01 or available_extra <= 0.01:
                continue

            payment = min(available_extra, debt["balance"])
            debt["balance"] -= payment
            available_extra -= payment
            month_payment += payment
            month_principal += payment

            if debt["balance"] <= 0.01:
                debt["balance"] = 0
                newly_freed += debt["original_min"]
                if debt["id"] not in payoff_order:
                    payoff_order.append(debt["id"])

        freed_payment += newly_freed
        total_interest += month_interest
        total_paid += month_payment

        monthly_breakdown.append(
            {
                "month": month,
                "total_payment": round(month_payment, 2),
                "interest": round(month_interest, 2),
                "principal": round(month_principal, 2),
                "remaining_balance": round(
                    sum(max(d["balance"], 0) for d in active), 2
                ),
            }
        )

    return PayoffSchedule(
        strategy=sort_key,
        total_months=month,
        total_interest_paid=round(total_interest, 2),
        total_paid=round(total_paid, 2),
        monthly_breakdown=monthly_breakdown,
        payoff_order=payoff_order,
    )


def calculate_minimum_only_payoff(debts: list[DebtAccount]) -> PayoffSchedule:
    """Baseline: paying only minimums, no extra."""
    result = _simulate_payoff(debts, 0, "balance")
    result.strategy = "minimum_only"
    return result


def calculate_snowball_payoff(debts: list[DebtAccount], extra_monthly: float) -> PayoffSchedule:
    """Snowball: extra goes to smallest balance first."""
    result = _simulate_payoff(debts, extra_monthly, "balance")
    result.strategy = "snowball"
    return result


def calculate_avalanche_payoff(debts: list[DebtAccount], extra_monthly: float) -> PayoffSchedule:
    """Avalanche: extra goes to highest APR first."""
    result = _simulate_payoff(debts, extra_monthly, "apr")
    result.strategy = "avalanche"
    return result


def compare_strategies(debts: list[DebtAccount], extra_monthly: float) -> dict:
    """Run all three strategies and return comparison metrics."""
    minimum = calculate_minimum_only_payoff(debts)
    snowball = calculate_snowball_payoff(debts, extra_monthly)
    avalanche = calculate_avalanche_payoff(debts, extra_monthly)

    def _to_dict(schedule: PayoffSchedule, baseline: PayoffSchedule | None = None) -> dict:
        result = {
            "total_months": schedule.total_months,
            "total_interest": schedule.total_interest_paid,
            "total_paid": schedule.total_paid,
            "payoff_order": schedule.payoff_order,
            "monthly_breakdown": schedule.monthly_breakdown,
        }
        if baseline:
            result["interest_saved_vs_minimum"] = round(
                baseline.total_interest_paid - schedule.total_interest_paid, 2
            )
            result["months_saved_vs_minimum"] = baseline.total_months - schedule.total_months
        return result

    # Recommendation logic
    interest_delta = snowball.total_interest_paid - avalanche.total_interest_paid

    if interest_delta < 50:
        recommendation = {
            "strategy": "snowball",
            "reason": (
                f"Both strategies cost nearly the same in interest "
                f"(${interest_delta:.0f} difference). Snowball gives you faster wins "
                f"by eliminating your smallest balance first — better for motivation."
            ),
        }
    else:
        recommendation = {
            "strategy": "avalanche",
            "reason": (
                f"Avalanche saves you ${interest_delta:,.0f} more in interest. "
                f"It targets your highest-APR debt first, which is mathematically optimal."
            ),
        }

    return {
        "debts": [
            {
                "account_id": d.account_id,
                "name": d.name,
                "balance": d.balance,
                "apr": d.apr,
                "minimum_payment": d.minimum_payment,
            }
            for d in debts
        ],
        "extra_monthly_payment": extra_monthly,
        "strategies": {
            "minimum_only": _to_dict(minimum),
            "snowball": _to_dict(snowball, minimum),
            "avalanche": _to_dict(avalanche, minimum),
        },
        "recommendation": recommendation,
    }
