import { useState, useEffect, useRef } from "react";
import { getAlertPreferences, updateAlertPreferences } from "../../lib/api";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

interface Preferences {
  sms_enabled: boolean;
  sms_critical_only: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

export default function AlertPreferences() {
  const [prefs, setPrefs] = useState<Preferences>({
    sms_enabled: true,
    sms_critical_only: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    getAlertPreferences()
      .then(data => setPrefs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateAlertPreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save preferences:", e);
    }
    setSaving(false);
  };

  if (loading) {
    return <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Loading preferences...</p>;
  }

  const toggleStyle = (enabled: boolean) => ({
    width: 36,
    height: 20,
    borderRadius: 10,
    background: enabled ? colors.positive : colors.textMuted,
    position: "relative" as const,
    cursor: "pointer",
    transition: "background 0.2s",
    border: "none",
    padding: 0,
  });

  const dotStyle = (enabled: boolean) => ({
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "white",
    position: "absolute" as const,
    top: 2,
    left: enabled ? 18 : 2,
    transition: "left 0.2s",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${colors.border}` }}>
        <div>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSizes.small, fontWeight: 600 }}>SMS Alerts</p>
          <p style={{ margin: "2px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>Receive text messages for payment alerts</p>
        </div>
        <button style={toggleStyle(prefs.sms_enabled)} onClick={() => setPrefs(p => ({ ...p, sms_enabled: !p.sms_enabled }))}>
          <div style={dotStyle(prefs.sms_enabled)} />
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${colors.border}` }}>
        <div>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSizes.small, fontWeight: 600 }}>Critical Only</p>
          <p style={{ margin: "2px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>Only send SMS for critical/urgent alerts</p>
        </div>
        <button style={toggleStyle(prefs.sms_critical_only)} onClick={() => setPrefs(p => ({ ...p, sms_critical_only: !p.sms_critical_only }))}>
          <div style={dotStyle(prefs.sms_critical_only)} />
        </button>
      </div>

      <div style={{ padding: "12px 0" }}>
        <p style={{ margin: "0 0 8px", color: colors.textSecondary, fontSize: fontSizes.small, fontWeight: 600 }}>Quiet Hours</p>
        <p style={{ margin: "0 0 10px", color: colors.textTertiary, fontSize: fontSizes.caption }}>Don't send SMS during these hours</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div>
            <label style={{ color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600 }}>FROM</label>
            <select
              value={prefs.quiet_hours_start ?? ""}
              onChange={e => setPrefs(p => ({ ...p, quiet_hours_start: e.target.value ? Number(e.target.value) : null }))}
              style={{ display: "block", background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: 5, padding: "6px 8px", color: colors.textPrimary, fontSize: fontSizes.caption, fontFamily: fonts.body, marginTop: 4 }}
            >
              <option value="">Off</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}</option>
              ))}
            </select>
          </div>
          <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 14 }}>to</span>
          <div>
            <label style={{ color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600 }}>UNTIL</label>
            <select
              value={prefs.quiet_hours_end ?? ""}
              onChange={e => setPrefs(p => ({ ...p, quiet_hours_end: e.target.value ? Number(e.target.value) : null }))}
              style={{ display: "block", background: colors.elevatedBg, border: `1px solid ${colors.border}`, borderRadius: 5, padding: "6px 8px", color: colors.textPrimary, fontSize: fontSizes.caption, fontFamily: fonts.body, marginTop: 4 }}
            >
              <option value="">Off</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: 12, background: "#1d6b45", border: "none", borderRadius: radius.button, padding: "8px 24px", color: "white", fontSize: fontSizes.small, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body, opacity: saving ? 0.5 : 1 }}
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save Preferences"}
      </button>
    </div>
  );
}
