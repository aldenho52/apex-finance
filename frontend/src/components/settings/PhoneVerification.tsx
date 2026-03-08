import { useState } from "react";
import { startPhoneVerification, confirmPhoneVerification, removePhone } from "../../lib/api";

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
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>VERIFIED</span>
            </div>
            <p style={{ margin: "4px 0 0", color: "#d1d5db", fontSize: 13 }}>{smsStatus?.phone || phone}</p>
            <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 10 }}>SMS alerts are active for critical payment alerts</p>
          </div>
          <button
            onClick={handleRemove}
            disabled={loading}
            style={{ background: "transparent", border: "1px solid #3f1515", borderRadius: 6, padding: "5px 12px", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
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
        <p style={{ margin: "0 0 8px", color: "#d1d5db", fontSize: 12 }}>
          Enter the 6-digit code sent to <span style={{ color: "#93c5fd" }}>{phone}</span>
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 7, padding: "10px 12px", color: "white", fontSize: 16, fontFamily: "inherit", outline: "none", textAlign: "center", letterSpacing: "0.3em" }}
          />
          <button
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            style={{ background: "#1d4ed8", border: "none", borderRadius: 7, padding: "10px 20px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: loading || code.length < 6 ? 0.5 : 1 }}
          >
            {loading ? "..." : "Verify"}
          </button>
        </div>
        <button
          onClick={() => { setStep("entering_phone"); setCode(""); }}
          style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
        >
          ← Use different number
        </button>
        {error && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {step === "idle" && (
        <button
          onClick={() => setStep("entering_phone")}
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "12px 20px", color: "#93c5fd", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
        >
          + Add Phone Number for SMS Alerts
        </button>
      )}

      {step === "entering_phone" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: "#9ca3af", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>
              PHONE NUMBER
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid #1a1f2e", borderRadius: 7, padding: "10px 12px", color: "white", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1f2e", borderRadius: 8, padding: "12px", marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#3b82f6" }}
              />
              <span style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.5 }}>{SMS_CONSENT_TEXT}</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setStep("idle"); setPhone(""); setConsentChecked(false); setError(""); }}
              style={{ background: "transparent", border: "1px solid #1a1f2e", borderRadius: 7, padding: "8px 16px", color: "#9ca3af", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendCode}
              disabled={loading || !phone.trim() || !consentChecked}
              style={{ flex: 1, background: "#1d4ed8", border: "none", borderRadius: 7, padding: "8px 16px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: loading || !phone.trim() || !consentChecked ? 0.5 : 1 }}
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
