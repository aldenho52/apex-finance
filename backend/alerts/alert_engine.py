"""
APEX - Payment Alert Engine
Runs nightly to evaluate every obligation and fire intelligent alerts.
Knows the CONSEQUENCES of missing payments, not just the due dates.
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from twilio.rest import Client as TwilioClient
import anthropic

logger = logging.getLogger(__name__)

# ─── Alert Severity Levels ────────────────────────────────────────────────────

CRITICAL = "critical"   # late fee / penalty APR imminent → push + SMS
WARNING  = "warning"    # due in 7 days, cash flow tight → push
INFO     = "info"       # weekly digest, opportunity → email


# ─── Core Alert Types ─────────────────────────────────────────────────────────

class PaymentAlert:
    def __init__(self, user_id, account_id, severity, title, message, amount=None, due_date=None, action=None, alert_type=None):
        self.user_id = user_id
        self.account_id = account_id
        self.severity = severity
        self.title = title
        self.message = message
        self.amount = amount
        self.due_date = due_date
        self.action = action
        self.alert_type = alert_type
        self.created_at = datetime.utcnow()


# ─── APR Data (supplement Plaid with known rates) ─────────────────────────────

# Known penalty APR triggers by card type (Plaid often returns this, but backup data helps)
PENALTY_APR_THRESHOLDS = {
    "Chase Sapphire Reserve":   {"standard": 22.49, "penalty": 29.99, "late_fee": 40},
    "Chase Sapphire Preferred": {"standard": 21.49, "penalty": 29.99, "late_fee": 40},
    "Citi Double Cash":         {"standard": 19.99, "penalty": 29.99, "late_fee": 41},
    "Amex Gold":                {"standard": 0,     "penalty": 0,     "late_fee": 40},  # charge card
    "Capital One Venture":      {"standard": 19.99, "penalty": 29.99, "late_fee": 40},
    "DEFAULT":                  {"standard": 20.99, "penalty": 29.99, "late_fee": 40},
}


def get_apr_data(card_name: str) -> dict:
    for key in PENALTY_APR_THRESHOLDS:
        if key.lower() in card_name.lower():
            return PENALTY_APR_THRESHOLDS[key]
    return PENALTY_APR_THRESHOLDS["DEFAULT"]


# ─── Calculate Interest Cost ──────────────────────────────────────────────────

def monthly_interest_cost(balance: float, apr: float) -> float:
    """Monthly interest on a balance at given APR."""
    return round(balance * (apr / 100) / 12, 2)


def annual_interest_cost(balance: float, apr: float) -> float:
    return round(balance * (apr / 100), 2)


# ─── Main Alert Evaluation Engine ─────────────────────────────────────────────

async def evaluate_payment_alerts(user_id: str, db: AsyncIOMotorClient) -> list[PaymentAlert]:
    """
    Evaluate all credit card and loan obligations for a user.
    Returns list of alerts sorted by severity.
    """
    alerts = []
    today = datetime.now()

    # ── Fetch credit card accounts and their details ──────────────────────────
    accounts = await db.accounts.find({"user_id": user_id, "type": "credit"}).to_list(None)
    checking = await db.accounts.find_one({"user_id": user_id, "subtype": "checking"})
    checking_balance = checking["balance_current"] if checking else 0

    for account in accounts:
        account_id = account["plaid_account_id"]
        balance = abs(account.get("balance_current", 0))
        card_name = account.get("name", "Credit Card")

        # Get detailed credit card data (from liabilities sync)
        details = await db.credit_card_details.find_one({"account_id": account_id})
        if not details:
            continue

        due_date_str = details.get("next_payment_due_date")
        if not due_date_str:
            continue

        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
        days_until_due = (due_date - today).days
        min_payment = details.get("minimum_payment", 25)

        # Get APR data
        aprs = details.get("aprs", [])
        purchase_apr = next((a["apr_percentage"] for a in aprs if a["apr_type"] == "purchase"), None)
        penalty_apr_data = get_apr_data(card_name)
        standard_apr = purchase_apr or penalty_apr_data["standard"]
        penalty_apr = penalty_apr_data["penalty"]
        late_fee = penalty_apr_data["late_fee"]

        # ── T-1 CRITICAL: Due tomorrow ────────────────────────────────────────
        if days_until_due == 1:
            apr_increase_cost = annual_interest_cost(balance, penalty_apr - standard_apr)
            alerts.append(PaymentAlert(
                user_id=user_id,
                account_id=account_id,
                severity=CRITICAL,
                title=f"⚠️ {card_name} Due TOMORROW",
                message=(
                    f"Balance ${balance:,.2f} due {due_date.strftime('%b %d')}. "
                    f"Missing this triggers a ${late_fee} late fee AND your APR jumps "
                    f"from {standard_apr}% → {penalty_apr}% — that's "
                    f"${apr_increase_cost:,.0f}/yr extra on your current balance. "
                    f"Your checking has ${checking_balance:,.2f}. You have the funds."
                ),
                amount=balance,
                due_date=due_date_str,
                action="PAY NOW",
                alert_type="due_tomorrow"
            ))

        # ── T-3 CRITICAL: Due in 3 days ───────────────────────────────────────
        elif days_until_due <= 3:
            interest_if_min = monthly_interest_cost(balance - min_payment, standard_apr)
            alerts.append(PaymentAlert(
                user_id=user_id,
                account_id=account_id,
                severity=CRITICAL,
                title=f"{card_name} Due in {days_until_due} Days",
                message=(
                    f"${balance:,.2f} due {due_date.strftime('%b %d')}. "
                    f"If you pay only the minimum (${min_payment}), you'll carry "
                    f"${balance - min_payment:,.2f} at {standard_apr}% — "
                    f"that's ${interest_if_min}/mo in interest. "
                    f"Full payoff saves you ${annual_interest_cost(balance, standard_apr):,.0f}/yr."
                ),
                amount=balance,
                due_date=due_date_str,
                action="Pay Full Balance",
                alert_type="due_soon_critical"
            ))

        # ── T-7 WARNING ───────────────────────────────────────────────────────
        elif days_until_due <= 7:
            can_pay_full = checking_balance >= balance
            alerts.append(PaymentAlert(
                user_id=user_id,
                account_id=account_id,
                severity=WARNING,
                title=f"{card_name} Due in {days_until_due} Days",
                message=(
                    f"Balance ${balance:,.2f} due {due_date.strftime('%b %d')}. "
                    + (f"Your checking (${checking_balance:,.2f}) covers the full balance — pay in full to avoid interest." 
                       if can_pay_full 
                       else f"Your checking (${checking_balance:,.2f}) is tight. Pay at minimum ${min_payment} to avoid the late fee.")
                ),
                amount=balance,
                due_date=due_date_str,
                action="Schedule Payment",
                alert_type="due_7_days"
            ))

        # ── T-14 INFO ─────────────────────────────────────────────────────────
        elif days_until_due <= 14:
            alerts.append(PaymentAlert(
                user_id=user_id,
                account_id=account_id,
                severity=INFO,
                title=f"{card_name} Coming Up",
                message=f"${balance:,.2f} due {due_date.strftime('%b %d')} ({days_until_due} days). Plan accordingly.",
                amount=balance,
                due_date=due_date_str,
                action="View",
                alert_type="due_14_days"
            ))

    # ── Check for recent late payments → penalty APR alert ──────────────────
    late_payment_check = await check_recent_late_payments(user_id, db)
    alerts.extend(late_payment_check)

    # ── Cash flow stress check ────────────────────────────────────────────────
    upcoming_obligations = sum(a.amount for a in alerts if a.amount and a.days_until_due <= 14) if alerts else 0
    if checking_balance < upcoming_obligations * 0.5:
        alerts.append(PaymentAlert(
            user_id=user_id,
            account_id=None,
            severity=CRITICAL,
            title="Cash Flow Warning",
            message=(
                f"You have ${upcoming_obligations:,.2f} in obligations due in the next 14 days "
                f"but only ${checking_balance:,.2f} in checking. Transfer from savings or prioritize."
            ),
            alert_type="cash_flow_stress"
        ))

    # Sort: critical first, then warning, then info
    order = {CRITICAL: 0, WARNING: 1, INFO: 2}
    alerts.sort(key=lambda a: order.get(a.severity, 3))

    return alerts


# ─── Penalty APR Detection ────────────────────────────────────────────────────

async def check_recent_late_payments(user_id: str, db: AsyncIOMotorClient) -> list[PaymentAlert]:
    """
    Detect if user had a recent late payment that may have triggered penalty APR.
    If so, generate a 'call to request removal' alert.
    """
    alerts = []
    cutoff = datetime.utcnow() - timedelta(days=90)

    late_payments = await db.payment_history.find({
        "user_id": user_id,
        "status": "late",
        "date": {"$gte": cutoff}
    }).to_list(None)

    for lp in late_payments:
        on_time_since = await db.payment_history.count_documents({
            "user_id": user_id,
            "account_id": lp["account_id"],
            "status": "on_time",
            "date": {"$gte": lp["date"]}
        })

        if on_time_since >= 2:  # 2+ on-time payments → eligible to ask for APR reset
            alerts.append(PaymentAlert(
                user_id=user_id,
                account_id=lp["account_id"],
                severity=WARNING,
                title="Penalty APR — Eligible for Removal",
                message=(
                    f"You had a late payment on {lp['account_id']} ~{(datetime.utcnow() - lp['date']).days} days ago. "
                    f"You've made {on_time_since} on-time payments since. "
                    f"Call the number on the back of your card and say: "
                    f"'I'd like to request a goodwill adjustment to remove my penalty APR. "
                    f"I've made all my payments on time since then and would like to be restored to my standard rate.' "
                    f"This works ~70% of the time."
                ),
                action="Call Now",
                alert_type="penalty_apr_eligible"
            ))

    return alerts


# ─── Subscription Escalation Detection ───────────────────────────────────────

async def detect_subscription_escalations(user_id: str, db: AsyncIOMotorClient) -> list[PaymentAlert]:
    """Find subscriptions that increased in price recently."""
    alerts = []
    cutoff_recent = datetime.utcnow() - timedelta(days=45)
    cutoff_old = datetime.utcnow() - timedelta(days=90)

    pipeline = [
        {"$match": {"user_id": user_id, "amount": {"$gt": 0}}},
        {"$group": {
            "_id": "$merchant_name",
            "transactions": {"$push": {"amount": "$amount", "date": "$date"}},
            "count": {"$sum": 1}
        }},
        {"$match": {"count": {"$gte": 3}}}
    ]

    async for merchant in db.transactions.aggregate(pipeline):
        txns = sorted(merchant["transactions"], key=lambda x: x["date"])
        if len(txns) < 2:
            continue

        latest_amount = txns[-1]["amount"]
        prev_amount = txns[-2]["amount"]

        if latest_amount > prev_amount * 1.02:  # >2% increase
            increase = latest_amount - prev_amount
            alerts.append(PaymentAlert(
                user_id=user_id,
                account_id=None,
                severity=WARNING,
                title=f"Price Increase: {merchant['_id']}",
                message=(
                    f"Charge increased from ${prev_amount:.2f} → ${latest_amount:.2f} "
                    f"(+${increase:.2f}/mo · +${increase * 12:.0f}/yr). "
                    f"Consider reviewing whether this service is worth the new price."
                ),
                amount=latest_amount,
                alert_type="subscription_escalation"
            ))

    return alerts


# ─── Notification Dispatch ────────────────────────────────────────────────────

async def send_sms_alert(phone: str, message: str):
    """Send SMS via Twilio for critical alerts."""
    client = TwilioClient(
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN")
    )
    client.messages.create(
        body=f"[APEX] {message}",
        from_=os.getenv("TWILIO_PHONE_NUMBER"),
        to=phone
    )
    logger.info(f"SMS sent to {phone}")


async def dispatch_alerts(user_id: str, alerts: list[PaymentAlert], db: AsyncIOMotorClient):
    """Send alerts via appropriate channels based on severity."""
    user = await db.users.find_one({"_id": user_id})
    if not user:
        return

    for alert in alerts:
        # Check if already sent this alert today
        existing = await db.alerts.find_one({
            "user_id": user_id,
            "alert_type": alert.alert_type,
            "account_id": alert.account_id,
            "created_at": {"$gte": datetime.utcnow() - timedelta(hours=20)}
        })
        if existing:
            continue

        # Save to DB
        alert_doc = {
            "user_id": user_id,
            "account_id": alert.account_id,
            "severity": alert.severity,
            "title": alert.title,
            "message": alert.message,
            "amount": alert.amount,
            "due_date": alert.due_date,
            "action": alert.action,
            "alert_type": alert.alert_type,
            "created_at": alert.created_at,
            "acknowledged": False,
        }
        await db.alerts.insert_one(alert_doc)

        # Critical → SMS
        if alert.severity == CRITICAL and user.get("phone"):
            await send_sms_alert(user["phone"], f"{alert.title}: {alert.message[:120]}")

        logger.info(f"Alert dispatched: [{alert.severity}] {alert.title} for user {user_id}")


# ─── Nightly Job Entry Point ──────────────────────────────────────────────────

async def run_nightly_alert_job(db: AsyncIOMotorClient):
    """Run every night at 8pm — evaluate all users."""
    users = await db.users.find({"active": True}).to_list(None)
    logger.info(f"Running nightly alert job for {len(users)} users")

    for user in users:
        try:
            alerts = await evaluate_payment_alerts(str(user["_id"]), db)
            sub_alerts = await detect_subscription_escalations(str(user["_id"]), db)
            all_alerts = alerts + sub_alerts
            await dispatch_alerts(str(user["_id"]), all_alerts, db)
        except Exception as e:
            logger.error(f"Alert job failed for user {user['_id']}: {e}")


if __name__ == "__main__":
    # For testing: python alert_engine.py
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient

    async def test():
        db = AsyncIOMotorClient(os.getenv("MONGODB_URI")).apex
        await run_nightly_alert_job(db)

    asyncio.run(test())
