import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getSmsStatus } from "../lib/api";
import { colors, fonts, fontSizes, spacing, radius } from "../lib/theme";
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
  const hasFetched = useRef(false);

  const loadStatus = () => {
    getSmsStatus()
      .then(setSmsStatus)
      .catch(() => setSmsStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadStatus();
  }, []);

  const isPhoneVerified = smsStatus?.phone_verified && smsStatus?.consent_given && !smsStatus?.revoked_at;

  return (
    <div style={{ fontFamily: fonts.body, background: colors.pageBg, minHeight: "100vh", color: colors.textPrimary }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.pageBg, position: "sticky", top: 0, zIndex: 50, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }} onClick={() => navigate("/")}>
          <StatusDot color={colors.brand} pulse />
          <span style={{ fontFamily: fonts.brand, fontWeight: 800, fontSize: 16, letterSpacing: "0.2em" }}>APEX</span>
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 500 }}>/ PROFILE</span>
        </div>
        <button
          onClick={() => navigate("/")}
          style={{ background: "transparent", border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: "5px 12px", color: colors.textSecondary, fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}
        >
          ← Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "30px 24px" }}>

        {/* Profile Info */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding, marginBottom: spacing.sectionGap }}>
          <h3 style={{ margin: "0 0 16px", fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>YOUR PROFILE</h3>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: radius.card,
              background: colors.infoBg, border: `1px solid ${colors.infoBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: fonts.brand, fontSize: 18, fontWeight: 800, color: colors.info,
            }}>
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <p style={{ margin: 0, color: colors.textPrimary, fontSize: fontSizes.h3, fontWeight: 600 }}>{user?.email || "—"}</p>
              <p style={{ margin: "2px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: colors.elevatedBg, borderRadius: radius.button, padding: "12px" }}>
              <p style={{ margin: 0, color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600, letterSpacing: "0.1em" }}>PHONE</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <StatusDot color={isPhoneVerified ? colors.positive : colors.textTertiary} size={6} />
                <p style={{ margin: 0, color: isPhoneVerified ? colors.textSecondary : colors.textTertiary, fontSize: fontSizes.small }}>
                  {isPhoneVerified ? smsStatus?.phone : "Not set up"}
                </p>
              </div>
            </div>
            <div style={{ background: colors.elevatedBg, borderRadius: radius.button, padding: "12px" }}>
              <p style={{ margin: 0, color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600, letterSpacing: "0.1em" }}>SMS ALERTS</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <StatusDot color={isPhoneVerified ? colors.positive : colors.textTertiary} size={6} />
                <p style={{ margin: 0, color: isPhoneVerified ? colors.positive : colors.textTertiary, fontSize: fontSizes.small }}>
                  {isPhoneVerified ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone & SMS Section */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding, marginBottom: spacing.sectionGap }}>
          <h3 style={{ margin: "0 0 4px", fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>SMS ALERTS</h3>
          <p style={{ margin: "0 0 16px", color: colors.textTertiary, fontSize: fontSizes.caption }}>
            Get text messages when payments are due. Never miss a due date.
          </p>
          {loading ? (
            <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Loading...</p>
          ) : (
            <PhoneVerification smsStatus={smsStatus} onStatusChange={loadStatus} />
          )}
        </div>

        {/* Alert Preferences Section */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding, marginBottom: spacing.sectionGap }}>
          <h3 style={{ margin: "0 0 4px", fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>ALERT PREFERENCES</h3>
          <p style={{ margin: "0 0 16px", color: colors.textTertiary, fontSize: fontSizes.caption }}>
            Control when and how you receive payment alerts.
          </p>
          <AlertPreferences />
        </div>

        {/* Email Digest Section */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding, marginBottom: spacing.sectionGap }}>
          <h3 style={{ margin: "0 0 4px", fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>EMAIL DIGEST</h3>
          <p style={{ margin: "0 0 16px", color: colors.textTertiary, fontSize: fontSizes.caption }}>
            Get a weekly AI-powered summary of your finances delivered to your inbox.
          </p>
          <EmailPreferences />
        </div>

        {/* Sign Out */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: radius.card, padding: spacing.cardPadding }}>
          <h3 style={{ margin: "0 0 4px", fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>ACCOUNT</h3>
          <p style={{ margin: "0 0 16px", color: colors.textTertiary, fontSize: fontSizes.caption }}>
            Manage your account settings.
          </p>
          <button
            onClick={signOut}
            style={{
              background: colors.negativeBg, border: `1px solid ${colors.negativeBorder}`,
              borderRadius: radius.button, padding: "10px 20px", color: colors.negative,
              fontSize: fontSizes.small, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body, width: "100%",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
