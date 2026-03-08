import os
import secrets
import logging
from datetime import datetime, timedelta
from twilio.rest import Client as TwilioClient

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 3

SMS_CONSENT_TEXT = (
    "I agree to receive SMS payment alerts from APEX Finance. "
    "Message frequency varies. Message and data rates may apply. "
    "Reply STOP to unsubscribe at any time."
)


def _get_twilio_client():
    return TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


async def send_verification_code(phone: str, user_id: str, sb) -> str:
    """Send verification code via Twilio Verify (managed service)."""
    # TODO: Switch to self-managed OTP when ready (uncomment below, comment out Verify)
    # --- Self-managed OTP (disabled for now) ---
    # code = f"{secrets.randbelow(900000) + 100000}"
    # expires_at = (datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()
    # sb.table("otp_codes").update({"verified": True}).eq("user_id", user_id).eq("verified", False).execute()
    # sb.table("otp_codes").insert({
    #     "user_id": user_id, "phone": phone, "code": code,
    #     "expires_at": expires_at, "verified": False, "attempts": 0,
    # }).execute()
    # client = _get_twilio_client()
    # message = client.messages.create(
    #     body=f"[APEX] Your verification code is: {code}. Expires in {OTP_EXPIRY_MINUTES} minutes.",
    #     from_=TWILIO_PHONE_NUMBER, to=phone,
    # )
    # logger.info(f"OTP sent to {phone}, message_sid={message.sid}")
    # return message.sid

    # --- Twilio Verify (active) ---
    client = _get_twilio_client()
    verification = client.verify.v2.services(
        os.getenv("TWILIO_VERIFY_SERVICE_SID")
    ).verifications.create(to=phone, channel="sms")
    logger.info(f"Twilio Verify sent to {phone}, sid={verification.sid}")
    return verification.sid


async def check_verification_code(phone: str, code: str, user_id: str, sb) -> bool:
    """Verify code via Twilio Verify (managed service). Returns True if valid."""
    # TODO: Switch to self-managed OTP when ready (uncomment below, comment out Verify)
    # --- Self-managed OTP (disabled for now) ---
    # resp = (
    #     sb.table("otp_codes").select("*")
    #     .eq("user_id", user_id).eq("phone", phone).eq("verified", False)
    #     .order("created_at", desc=True).limit(1).execute()
    # )
    # if not resp.data:
    #     return False
    # otp = resp.data[0]
    # if otp["attempts"] >= OTP_MAX_ATTEMPTS:
    #     return False
    # sb.table("otp_codes").update({"attempts": otp["attempts"] + 1}).eq("id", otp["id"]).execute()
    # expires = datetime.fromisoformat(otp["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
    # if datetime.utcnow() > expires:
    #     return False
    # if otp["code"] != code:
    #     return False
    # sb.table("otp_codes").update({"verified": True}).eq("id", otp["id"]).execute()
    # return True

    # --- Twilio Verify (active) ---
    try:
        client = _get_twilio_client()
        check = client.verify.v2.services(
            os.getenv("TWILIO_VERIFY_SERVICE_SID")
        ).verification_checks.create(to=phone, code=code)
        return check.status == "approved"
    except Exception as e:
        logger.error(f"Twilio Verify check failed: {e}")
        return False


async def save_phone_and_consent(user_id: str, phone: str, verification_sid: str, sb) -> dict:
    """After verification succeeds, save phone + consent record."""
    now = datetime.utcnow().isoformat()

    sb.table("sms_consent").upsert(
        {
            "user_id": user_id,
            "phone": phone,
            "phone_verified": True,
            "consent_given": True,
            "consent_text": SMS_CONSENT_TEXT,
            "consented_at": now,
            "verification_sid": verification_sid,
            "verified_at": now,
            "revoked_at": None,
        },
        on_conflict="user_id",
    ).execute()

    # Keep users_profile.phone in sync
    sb.table("users_profile").update({"phone": phone}).eq("id", user_id).execute()

    logger.info(f"Phone verified and consent saved for user {user_id}")
    return {"status": "verified", "phone": phone}


async def revoke_sms_consent(user_id: str, sb) -> dict:
    """Revoke consent — sets revoked_at, clears phone from profile."""
    now = datetime.utcnow().isoformat()

    sb.table("sms_consent").update(
        {"revoked_at": now, "consent_given": False}
    ).eq("user_id", user_id).execute()

    sb.table("users_profile").update({"phone": None}).eq("id", user_id).execute()

    logger.info(f"SMS consent revoked for user {user_id}")
    return {"status": "revoked"}


async def get_sms_status(user_id: str, sb) -> dict:
    """Get current phone/verification/consent status for user."""
    resp = (
        sb.table("sms_consent")
        .select("phone, phone_verified, consent_given, revoked_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if resp.data:
        return resp.data[0]

    return {
        "phone": None,
        "phone_verified": False,
        "consent_given": False,
        "revoked_at": None,
    }


async def get_alert_preferences(user_id: str, sb) -> dict:
    """Get alert delivery preferences."""
    resp = (
        sb.table("alert_preferences")
        .select("sms_enabled, sms_critical_only, quiet_hours_start, quiet_hours_end")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if resp.data:
        return resp.data[0]

    return {
        "sms_enabled": True,
        "sms_critical_only": True,
        "quiet_hours_start": None,
        "quiet_hours_end": None,
    }


async def update_alert_preferences(user_id: str, prefs: dict, sb) -> dict:
    """Update alert delivery preferences."""
    now = datetime.utcnow().isoformat()

    sb.table("alert_preferences").upsert(
        {
            "user_id": user_id,
            "sms_enabled": prefs.get("sms_enabled", True),
            "sms_critical_only": prefs.get("sms_critical_only", True),
            "quiet_hours_start": prefs.get("quiet_hours_start"),
            "quiet_hours_end": prefs.get("quiet_hours_end"),
            "updated_at": now,
        },
        on_conflict="user_id",
    ).execute()

    return {"status": "updated"}
