import os
import logging
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("APEX_FROM_EMAIL", "APEX Finance <onboarding@resend.dev>")


def send_email(to: str, subject: str, html: str) -> str:
    """Send an email via Resend. Returns the message ID."""
    resend.api_key = RESEND_API_KEY
    params = {
        "from": FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    result = resend.Emails.send(params)
    logger.info(f"Email sent to {to}, id={result['id']}")
    return result["id"]
