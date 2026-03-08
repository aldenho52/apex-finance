import { useState } from "react";
import { startPhoneVerification, confirmPhoneVerification, removePhone } from "../../lib/api";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

interface SmsStatus {
  phone: string | null;
  phone_verified: boolean;
  consent_given: boolean;
  revoked_at: string | null;
}

interface PhoneVerificationProps {
  smsStatus: SmsStatus | null;
  onStatusChange: () => void;
}

type Step = "idle" | "entering_phone" | "awaiting_code" | "verified";

const SMS_CONSENT_TEXT =
  "I agree to receive SMS payment alerts from APEX Finance. " +
  "Message frequency varies. Message and data rates may apply. " +
  "Reply STOP to unsubscribe at any time.";

export default function PhoneVerification({ smsStatus, onStatusChange }: PhoneVerificationProps) {
  const isVerified = smsStatus?.phone_verified && smsStatus?.consent_given && !smsStatus?.revoked_at;

  const [step, setStep] = useState<Step>(isVerified ? "verified" : "idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phone.trim() || !consentChecked) return;
    setError("");
    setLoading(true);
    try {
      await startPhoneVerification(phone);
      setStep("awaiting_code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      await confirmPhoneVerification(phone, code);
      setStep("verified");
      onStatusChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await removePhone();
      setStep("idle");
      setPhone("");
      setCode("");
      setConsentChecked(false);
      onStatusChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove phone");
    }
    setLoading(false);
  };

  if (step === "verified" || isVerified) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.positive }} />
              <span style={{ color: colors.positive, fontSize: fontSizes.small, fontWeight: 600 }}>VERIFIED</span>
            </div>
            <p style={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: fontSizes.body }}>{smsStatus?.phone || phone}</p>
            <p style={{ margin: "2px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>SMS alerts are active for critical payment alerts</p>
          </div>
          <button
            onClick={handleRemove}
            disabled={loading}
            style={{ background: "transparent", border: `1px solid ${colors.negativeBorder}`, borderRadius: radius.button, padding: "6px 12px", color: colors.negative, fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (step === "awaiting_code") {
    return (
      <div>
        <p style={{ margin: "0 0 8px", color: colors.textSecondary, fontSize: fontSizes.small }}>
          Enter the 6-digit code sent to <span style={{ color: colors.info }}>{phone}</span>
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            style={{ flex: 1, background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "10px 12px", color: colors.textPrimary, fontSize: 16, fontFamily: fonts.body, outline: "none", textAlign: "center", letterSpacing: "0.3em" }}
          />
          <button
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            style={{ background: "#1d6b45", border: "none", borderRadius: radius.button, padding: "10px 20px", color: "white", fontSize: fontSizes.small, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body, opacity: loading || code.length < 6 ? 0.5 : 1 }}
          >
            {loading ? "..." : "Verify"}
          </button>
        </div>
        <button
          onClick={() => { setStep("entering_phone"); setCode(""); }}
          style={{ background: "transparent", border: "none", color: colors.textTertiary, fontSize: fontSizes.caption, cursor: "pointer", fontFamily: fonts.body, padding: 0 }}
        >
          ← Use different number
        </button>
        {error && <p style={{ color: colors.negative, fontSize: fontSizes.caption, marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {step === "idle" && (
        <button
          onClick={() => setStep("entering_phone")}
          style={{ background: colors.infoBg, border: `1px solid ${colors.infoBorder}`, borderRadius: radius.button, padding: "12px 20px", color: colors.info, fontSize: fontSizes.small, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body, width: "100%" }}
        >
          + Add Phone Number for SMS Alerts
        </button>
      )}

      {step === "entering_phone" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600, letterSpacing: "0.1em", marginBottom: 6 }}>
              PHONE NUMBER
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              style={{ width: "100%", background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "10px 12px", color: colors.textPrimary, fontSize: fontSizes.body, fontFamily: fonts.body, outline: "none" }}
            />
          </div>

          <div style={{ background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "12px", marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                style={{ marginTop: 2, accentColor: colors.info }}
              />
              <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption, lineHeight: 1.5 }}>{SMS_CONSENT_TEXT}</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setStep("idle"); setPhone(""); setConsentChecked(false); setError(""); }}
              style={{ background: "transparent", border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "8px 16px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendCode}
              disabled={loading || !phone.trim() || !consentChecked}
              style={{ flex: 1, background: "#1d6b45", border: "none", borderRadius: radius.button, padding: "8px 16px", color: "white", fontSize: fontSizes.small, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body, opacity: loading || !phone.trim() || !consentChecked ? 0.5 : 1 }}
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
          {error && <p style={{ color: colors.negative, fontSize: fontSizes.caption, marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
