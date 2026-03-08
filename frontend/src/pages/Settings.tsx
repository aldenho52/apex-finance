import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getSmsStatus } from "../lib/api";
import StatusDot from "../components/ui/StatusDot";
import PhoneVerification from "../components/settings/PhoneVerification";
import AlertPreferences from "../components/settings/AlertPreferences";
import EmailPreferences from "../components/settings/EmailPreferences";

interface SmsStatus {
  phone: string | null;
  phone_verified: boolean;
  consent_given: boolean;
  revoked_at: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [smsStatus, setSmsStatus] = useState<SmsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = () => {
    getSmsStatus()
      .then(setSmsStatus)
      .catch(() => setSmsStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStatus(); }, []);

  const isPhoneVerified = smsStatus?.phone_verified && smsStatus?.consent_given && !smsStatus?.revoked_at;

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#08090d", minHeight: "100vh", color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1f2937;border-radius:2px}
        button:hover{opacity:0.8!important}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #111827", background: "#08090d", position: "sticky", top: 0, zIndex: 50, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusDot color="#22c55e" pulse />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.2em" }}>APEX</span>
          <span style={{ color: "#6b7280", fontSize: 11 }}>/ PROFILE</span>
        </div>
        <button
          onClick={() => navigate("/")}
          style={{ background: "transparent", border: "1px solid #1f2937", borderRadius: 6, padding: "4px 10px", color: "#9ca3af", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          ← Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "30px 20px" }}>

        {/* Profile Info */}
        <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>YOUR PROFILE</h3>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#93c5fd",
            }}>
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <p style={{ margin: 0, color: "white", fontSize: 14, fontWeight: 600 }}>{user?.email || "—"}</p>
              <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 10 }}>
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#111318", borderRadius: 8, padding: "12px" }}>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>PHONE</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <StatusDot color={isPhoneVerified ? "#22c55e" : "#6b7280"} size={6} />
                <p style={{ margin: 0, color: isPhoneVerified ? "#d1d5db" : "#6b7280", fontSize: 12 }}>
                  {isPhoneVerified ? smsStatus?.phone : "Not set up"}
                </p>
              </div>
            </div>
            <div style={{ background: "#111318", borderRadius: 8, padding: "12px" }}>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>SMS ALERTS</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <StatusDot color={isPhoneVerified ? "#22c55e" : "#6b7280"} size={6} />
                <p style={{ margin: 0, color: isPhoneVerified ? "#22c55e" : "#6b7280", fontSize: 12 }}>
                  {isPhoneVerified ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone & SMS Section */}
        <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>SMS ALERTS</h3>
          <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 11 }}>
            Get text messages when payments are due. Never miss a due date.
          </p>
          {loading ? (
            <p style={{ color: "#6b7280", fontSize: 11 }}>Loading...</p>
          ) : (
            <PhoneVerification smsStatus={smsStatus} onStatusChange={loadStatus} />
          )}
        </div>

        {/* Alert Preferences Section */}
        <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>ALERT PREFERENCES</h3>
          <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 11 }}>
            Control when and how you receive payment alerts.
          </p>
          <AlertPreferences />
        </div>

        {/* Email Digest Section */}
        <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>EMAIL DIGEST</h3>
          <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 11 }}>
            Get a weekly AI-powered summary of your finances delivered to your inbox.
          </p>
          <EmailPreferences />
        </div>

        {/* Sign Out */}
        <div style={{ background: "#0d0f14", border: "1px solid #111827", borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>ACCOUNT</h3>
          <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 11 }}>
            Manage your account settings.
          </p>
          <button
            onClick={signOut}
            style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 8, padding: "10px 20px", color: "#ef4444",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
