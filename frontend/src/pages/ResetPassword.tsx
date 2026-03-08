import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, fontSizes, radius } from "../lib/theme";

const inputStyle = {
  width: "100%",
  background: colors.elevatedBg,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.input,
  padding: "12px 40px 12px 14px",
  color: colors.textPrimary,
  fontSize: fontSizes.body,
  fontFamily: fonts.body,
  outline: "none",
} as const;

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    }
    setLoading(false);
  };

  const eyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: "absolute" as const,
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: colors.textTertiary,
        fontSize: 16,
        padding: 0,
        lineHeight: 1,
      }}
      tabIndex={-1}
    >
      {show ? "◡" : "⊙"}
    </button>
  );

  return (
    <div
      style={{
        fontFamily: fonts.body,
        background: colors.pageBg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 40,
          width: 380,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: colors.brand,
                boxShadow: colors.brandGlow,
              }}
            />
            <span
              style={{
                fontFamily: fonts.brand,
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "0.2em",
                color: colors.textPrimary,
              }}
            >
              APEX
            </span>
          </div>
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption, margin: 0 }}>
            RESET PASSWORD
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: colors.positiveBg,
                border: `1px solid ${colors.positiveBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 20,
                color: colors.positive,
              }}
            >
              ✓
            </div>
            <p
              style={{
                color: colors.textPrimary,
                fontSize: fontSizes.h3,
                fontWeight: 500,
                margin: "0 0 8px",
              }}
            >
              Password updated
            </p>
            <p
              style={{
                color: colors.textTertiary,
                fontSize: fontSizes.small,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: colors.textTertiary, fontSize: fontSizes.small, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
              Enter your new password below.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={inputStyle}
                />
                {eyeButton(showPassword, () => setShowPassword(!showPassword))}
              </div>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  style={inputStyle}
                />
                {eyeButton(showConfirm, () => setShowConfirm(!showConfirm))}
              </div>

              {error && (
                <p
                  style={{
                    color: colors.negative,
                    fontSize: fontSizes.small,
                    marginBottom: 12,
                    textAlign: "center",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#1d6b45",
                  border: "none",
                  borderRadius: radius.button,
                  padding: "12px",
                  color: "white",
                  fontSize: fontSizes.body,
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                  fontFamily: fonts.body,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "..." : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
