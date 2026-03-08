import { useState, useEffect } from "react";
import { getEmailPreferences, updateEmailPreferences, previewDigest } from "../../lib/api";
import { colors, fonts, fontSizes, radius } from "../../lib/theme";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface EmailPrefs {
  digest_enabled: boolean;
  digest_day: string;
  digest_hour: number;
}

export default function EmailPreferences() {
  const [prefs, setPrefs] = useState<EmailPrefs>({ digest_enabled: true, digest_day: "sunday", digest_hour: 9 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    getEmailPreferences()
      .then((data: EmailPrefs) => setPrefs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = (updated: EmailPrefs) => {
    setPrefs(updated);
    setSaving(true);
    updateEmailPreferences(updated)
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const handlePreview = () => {
    setPreviewing(true);
    previewDigest()
      .then((data: { html: string }) => setPreviewHtml(data.html))
      .catch(() => setPreviewHtml(null))
      .finally(() => setPreviewing(false));
  };

  if (loading) return <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Loading...</p>;

  const inputStyle = {
    background: colors.elevatedBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "6px 10px",
    color: colors.textSecondary,
    fontSize: fontSizes.small,
    fontFamily: fonts.body,
    cursor: "pointer",
  } as const;

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSizes.small, fontWeight: 600 }}>Weekly Email Digest</p>
          <p style={{ margin: "2px 0 0", color: colors.textTertiary, fontSize: fontSizes.caption }}>
            AI-powered summary of your finances, sent weekly
          </p>
        </div>
        <button
          onClick={() => save({ ...prefs, digest_enabled: !prefs.digest_enabled })}
          style={{
            width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
            background: prefs.digest_enabled ? colors.positive : colors.textMuted,
            position: "relative", transition: "background 0.2s",
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 8, background: "white",
            position: "absolute", top: 3,
            left: prefs.digest_enabled ? 21 : 3,
            transition: "left 0.2s",
          }} />
        </button>
      </div>

      {prefs.digest_enabled && (
        <>
          {/* Day + Hour */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600, letterSpacing: "0.1em" }}>DAY</p>
              <select
                value={prefs.digest_day}
                onChange={(e) => save({ ...prefs, digest_day: e.target.value })}
                style={inputStyle}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600, letterSpacing: "0.1em" }}>TIME</p>
              <select
                value={prefs.digest_hour}
                onChange={(e) => save({ ...prefs, digest_hour: Number(e.target.value) })}
                style={inputStyle}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <button
            onClick={handlePreview}
            disabled={previewing}
            style={{
              background: colors.infoBg, border: `1px solid ${colors.infoBorder}`,
              borderRadius: radius.button, padding: "8px 16px", color: colors.info,
              fontSize: fontSizes.caption, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body,
              opacity: previewing ? 0.5 : 1,
            }}
          >
            {previewing ? "Generating..." : "Preview Digest"}
          </button>

          {previewHtml && (
            <div style={{ marginTop: 12, borderRadius: radius.button, overflow: "hidden", border: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: colors.elevatedBg }}>
                <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption, fontWeight: 600, letterSpacing: "0.1em" }}>PREVIEW</span>
                <button
                  onClick={() => setPreviewHtml(null)}
                  style={{ background: "none", border: "none", color: colors.textTertiary, cursor: "pointer", fontSize: fontSizes.small, fontFamily: fonts.body }}
                >
                  Close
                </button>
              </div>
              <iframe
                srcDoc={previewHtml}
                style={{ width: "100%", height: 500, border: "none", background: colors.pageBg }}
                title="Digest Preview"
              />
            </div>
          )}
        </>
      )}

      {saving && <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, marginTop: 8 }}>Saving...</p>}
    </div>
  );
}
