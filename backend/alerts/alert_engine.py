"""
APEX - Payment Alert Engine
Runs nightly to evaluate every obligation and fire intelligent alerts.
Knows the CONSEQUENCES of missing payments, not just the due dates.
"""

import os
import logging
from datetime import datetime, timedelta
from supabase import Client
from twilio.rest import Client as TwilioClient

logger = logging.getLogger(__name__)

# ─── Alert Severity Levels ────────────────────────────────────────────────────

CRITICAL = "critical"
WARNING = "warning"
INFO = "info"


# ─── Core Alert Types ─────────────────────────────────────────────────────────


class PaymentAlert:
    def __init__(
        self,
        user_id,
        account_id,
        severity,
        title,
        message,
        amount=None,
        due_date=None,
        action=None,
        alert_type=None,
    ):
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


# ─── APR Data ─────────────────────────────────────────────────────────────────

PENALTY_APR_THRESHOLDS = {
    "Chase Sapphire Reserve": {"standard": 22.49, "penalty": 29.99, "late_fee": 40},
    "Chase Sapphire Preferred": {"standard": 21.49, "penalty": 29.99, "late_fee": 40},
    "Citi Double Cash": {"standard": 19.99, "penalty": 29.99, "late_fee": 41},
    "Amex Gold": {"standard": 0, "penalty": 0, "late_fee": 40},
    "Capital One Venture": {"standard": 19.99, "penalty": 29.99, "late_fee": 40},
    "DEFAULT": {"standard": 20.99, "penalty": 29.99, "late_fee": 40},
}


def get_apr_data(card_name: str) -> dict:
    for key in PENALTY_APR_THRESHOLDS:
        if key.lower() in card_name.lower():
            return PENALTY_APR_THRESHOLDS[key]
    return PENALTY_APR_THRESHOLDS["DEFAULT"]


def monthly_interest_cost(balance: float, apr: float) -> float:
    return round(balance * (apr / 100) / 12, 2)


def annual_interest_cost(balance: float, apr: float) -> float:
    return round(balance * (apr / 100), 2)


# ─── Main Alert Evaluation Engine ─────────────────────────────────────────────


async def evaluate_payment_alerts(user_id: str, sb: Client) -> list[PaymentAlert]:
    alerts = []
    today = datetime.now()

    # Fetch credit card accounts
    resp = (
        sb.table("accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("type", "credit")
        .execute()
    )
    accounts = resp.data or []

    # Fetch checking balance
    checking_resp = (
        sb.table("accounts")
        .select("balance_current")
        .eq("user_id", user_id)
        .eq("type", "depository")
        .eq("subtype", "checking")
        .limit(1)
        .execute()
    )
    checking_balance = (
        checking_resp.data[0]["balance_current"] if checking_resp.data else 0
    )

    for account in accounts:
        account_id = account["plaid_account_id"]
        balance = abs(account.get("balance_current", 0))
        card_name = account.get("name", "Credit Card")

        # Get detailed credit card data
        details_resp = (
            sb.table("credit_card_details")
            .select("*")
            .eq("account_id", account_id)
            .limit(1)
            .execute()
        )
        if not details_resp.data:
            continue
        details = details_resp.data[0]

        due_date_str = details.get("next_payment_due_date")
        if not due_date_str:
            continue

        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
        days_until_due = (due_date - today).days
        min_payment = details.get("minimum_payment", 25) or 25

        # Get APR data
        aprs = details.get("aprs", []) or []
        purchase_apr = next(
            (a.get("apr") for a in aprs if a.get("type") == "purchase"), None
        )
        penalty_apr_data = get_apr_data(card_name)
        standard_apr = purchase_apr or penalty_apr_data["standard"]
        penalty_apr = penalty_apr_data["penalty"]
        late_fee = penalty_apr_data["late_fee"]

        # T-1 CRITICAL: Due tomorrow
        if days_until_due == 1:
            apr_increase_cost = annual_interest_cost(
                balance, penalty_apr - standard_apr
            )
            alerts.append(
                PaymentAlert(
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
                    alert_type="due_tomorrow",
                )
            )

        # T-3 CRITICAL
        elif days_until_due <= 3:
            interest_if_min = monthly_interest_cost(balance - min_payment, standard_apr)
            alerts.append(
                PaymentAlert(
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
                    alert_type="due_soon_critical",
                )
            )

        # T-7 WARNING
        elif days_until_due <= 7:
            can_pay_full = checking_balance >= balance
            alerts.append(
                PaymentAlert(
                    user_id=user_id,
                    account_id=account_id,
                    severity=WARNING,
                    title=f"{card_name} Due in {days_until_due} Days",
                    message=(
                        f"Balance ${balance:,.2f} due {due_date.strftime('%b %d')}. "
                        + (
                            f"Your checking (${checking_balance:,.2f}) covers the full balance — pay in full to avoid interest."
                            if can_pay_full
                            else f"Your checking (${checking_balance:,.2f}) is tight. Pay at minimum ${min_payment} to avoid the late fee."
                        )
                    ),
                    amount=balance,
                    due_date=due_date_str,
                    action="Schedule Payment",
                    alert_type="due_7_days",
                )
            )

        # T-14 INFO
        elif days_until_due <= 14:
            alerts.append(
                PaymentAlert(
                    user_id=user_id,
                    account_id=account_id,
                    severity=INFO,
                    title=f"{card_name} Coming Up",
                    message=f"${balance:,.2f} due {due_date.strftime('%b %d')} ({days_until_due} days). Plan accordingly.",
                    amount=balance,
                    due_date=due_date_str,
                    action="View",
                    alert_type="due_14_days",
                )
            )

    # Check for recent late payments
    late_payment_check = await check_recent_late_payments(user_id, sb)
    alerts.extend(late_payment_check)

    # Cash flow stress check
    upcoming_obligations = sum(a.amount for a in alerts if a.amount) if alerts else 0
    if checking_balance > 0 and checking_balance < upcoming_obligations * 0.5:
        alerts.append(
            PaymentAlert(
                user_id=user_id,
                account_id=None,
                severity=CRITICAL,
                title="Cash Flow Warning",
                message=(
                    f"You have ${upcoming_obligations:,.2f} in obligations due soon "
                    f"but only ${checking_balance:,.2f} in checking. Transfer from savings or prioritize."
                ),
                alert_type="cash_flow_stress",
            )
        )

    order = {CRITICAL: 0, WARNING: 1, INFO: 2}
    alerts.sort(key=lambda a: order.get(a.severity, 3))
    return alerts


# ─── Penalty APR Detection ────────────────────────────────────────────────────


async def check_recent_late_payments(user_id: str, sb: Client) -> list[PaymentAlert]:
    alerts = []
    cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()

    resp = (
        sb.table("payment_history")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "late")
        .gte("date", cutoff)
        .execute()
    )
    late_payments = resp.data or []

    for lp in late_payments:
        on_time_resp = (
            sb.table("payment_history")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("account_id", lp["account_id"])
            .eq("status", "on_time")
            .gte("date", lp["date"])
            .execute()
        )
        on_time_since = on_time_resp.count or 0

        if on_time_since >= 2:
            days_ago = (
                datetime.utcnow()
                - datetime.fromisoformat(lp["date"].replace("Z", "+00:00")).replace(
                    tzinfo=None
                )
            ).days
            alerts.append(
                PaymentAlert(
                    user_id=user_id,
                    account_id=lp["account_id"],
                    severity=WARNING,
                    title="Penalty APR — Eligible for Removal",
                    message=(
                        f"You had a late payment on {lp['account_id']} ~{days_ago} days ago. "
                        f"You've made {on_time_since} on-time payments since. "
                        f"Call the number on the back of your card and say: "
                        f"'I'd like to request a goodwill adjustment to remove my penalty APR. "
                        f"I've made all my payments on time since then and would like to be restored to my standard rate.' "
                        f"This works ~70% of the time."
                    ),
                    action="Call Now",
                    alert_type="penalty_apr_eligible",
                )
            )

    return alerts


# ─── Subscription Escalation Detection ───────────────────────────────────────


async def detect_subscription_escalations(
    user_id: str, sb: Client
) -> list[PaymentAlert]:
    """Find subscriptions that increased in price recently via Postgres function."""
    resp = sb.rpc("detect_subscription_escalations", {"p_user_id": user_id}).execute()
    alerts = []

    for row in resp.data or []:
        alerts.append(
            PaymentAlert(
                user_id=user_id,
                account_id=None,
                severity=WARNING,
                title=f"Price Increase: {row['merchant']}",
                message=(
                    f"Charge increased from ${row['prev_amount']:.2f} → ${row['latest_amount']:.2f} "
                    f"(+${row['increase']:.2f}/mo · +${row['annual_increase']:.0f}/yr). "
                    f"Consider reviewing whether this service is worth the new price."
                ),
                amount=row["latest_amount"],
                alert_type="subscription_escalation",
            )
        )

    return alerts


# ─── Notification Dispatch ────────────────────────────────────────────────────


async def send_sms_alert(phone: str, message: str):
    client = TwilioClient(
        os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN")
    )
    client.messages.create(
        body=f"[APEX] {message}", from_=os.getenv("TWILIO_PHONE_NUMBER"), to=phone
    )
    logger.info(f"SMS sent to {phone}")


def _in_quiet_hours(prefs: dict) -> bool:
    """Check if current hour falls within quiet hours."""
    start = prefs.get("quiet_hours_start")
    end = prefs.get("quiet_hours_end")
    if start is None or end is None:
        return False
    hour = datetime.utcnow().hour
    if start <= end:
        return start <= hour < end
    # Wraps midnight (e.g., 22 to 7)
    return hour >= start or hour < end


async def dispatch_alerts(user_id: str, alerts: list[PaymentAlert], sb: Client):
    twenty_hours_ago = (datetime.utcnow() - timedelta(hours=20)).isoformat()

    # Check SMS consent from sms_consent table
    consent_resp = (
        sb.table("sms_consent").select("*").eq("user_id", user_id).limit(1).execute()
    )
    consent = consent_resp.data[0] if consent_resp.data else None

    can_send_sms = (
        consent
        and consent.get("phone_verified")
        and consent.get("consent_given")
        and not consent.get("revoked_at")
    )

    # Check alert preferences
    prefs_resp = (
        sb.table("alert_preferences")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    prefs = prefs_resp.data[0] if prefs_resp.data else {
        "sms_enabled": True,
        "sms_critical_only": True,
    }

    for alert in alerts:
        # Deduplicate within 20 hours
        existing_resp = (
            sb.table("alerts")
            .select("id")
            .eq("user_id", user_id)
            .eq("alert_type", alert.alert_type)
            .eq("account_id", alert.account_id)
            .gte("created_at", twenty_hours_ago)
            .limit(1)
            .execute()
        )
        if existing_resp.data:
            continue

        # Save to DB
        sb.table("alerts").insert(
            {
                "user_id": user_id,
                "account_id": alert.account_id,
                "severity": alert.severity,
                "title": alert.title,
                "message": alert.message,
                "amount": alert.amount,
                "due_date": alert.due_date,
                "action": alert.action,
                "alert_type": alert.alert_type,
                "created_at": alert.created_at.isoformat(),
                "acknowledged": False,
            }
        ).execute()

        # SMS dispatch — check consent + preferences + quiet hours
        should_sms = (
            can_send_sms
            and prefs.get("sms_enabled", True)
            and not _in_quiet_hours(prefs)
        )

        if prefs.get("sms_critical_only", True):
            should_sms = should_sms and alert.severity == CRITICAL

        if should_sms:
            await send_sms_alert(
                consent["phone"], f"{alert.title}: {alert.message[:120]}"
            )

        logger.info(
            f"Alert dispatched: [{alert.severity}] {alert.title} for user {user_id}"
        )


# ─── Nightly Job Entry Point ─────────────────────────────────────────────────


async def run_nightly_alert_job(sb: Client):
    resp = sb.table("users_profile").select("id").eq("active", True).execute()
    users = resp.data or []
    logger.info(f"Running nightly alert job for {len(users)} users")

    for user in users:
        try:
            user_id = user["id"]
            alerts = await evaluate_payment_alerts(user_id, sb)
            sub_alerts = await detect_subscription_escalations(user_id, sb)
            all_alerts = alerts + sub_alerts
            await dispatch_alerts(user_id, all_alerts, sb)
        except Exception as e:
            logger.error(f"Alert job failed for user {user['id']}: {e}")
