"""
Quant Job Salary Tracker

Tracks compensation components and compares against $250K target.
"""

from dataclasses import dataclass


TARGET_SALARY = 250000


@dataclass
class CompensationBreakdown:
    base_salary: float
    annual_bonus: float
    stock_rsus: float
    other_compensation: float
    total_compensation: float
    target: float
    shortfall: float
    percent_of_target: float


def calculate_compensation(
    base_salary: float,
    annual_bonus: float = 0,
    stock_rsus: float = 0,
    other_compensation: float = 0,
) -> CompensationBreakdown:
    """Calculate total compensation and compare to $250K target."""

    total = base_salary + annual_bonus + stock_rsus + other_compensation
    shortfall = max(0, TARGET_SALARY - total)
    percent = (total / TARGET_SALARY * 100) if TARGET_SALARY > 0 else 0

    return CompensationBreakdown(
        base_salary=base_salary,
        annual_bonus=annual_bonus,
        stock_rsus=stock_rsus,
        other_compensation=other_compensation,
        total_compensation=total,
        target=TARGET_SALARY,
        shortfall=shortfall,
        percent_of_target=percent,
    )


def get_progress_stages(percent: float) -> list[dict]:
    """Get stages of progress toward $250K target."""
    stages = [
        {"threshold": 0, "label": "Starting", "color": "#ef4444"},
        {"threshold": 50, "label": "Halfway there", "color": "#f59e0b"},
        {"threshold": 75, "label": "Almost there", "color": "#60a5fa"},
        {"threshold": 90, "label": "Near target", "color": "#4ade80"},
        {"threshold": 100, "label": "Target reached!", "color": "#22c55e"},
    ]

    completed = []
    for stage in stages:
        if percent >= stage["threshold"]:
            completed.append(stage)

    return completed


def format_currency(amount: float) -> str:
    """Format amount as currency."""
    return f"${amount:,.0f}"
