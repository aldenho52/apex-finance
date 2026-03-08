import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, fontSizes, radius } from "../lib/theme";

const inputStyle = {
  width: "100%",
  background: colors.elevatedBg,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.input,
  padding: "12px 14px",
  color: colors.textPrimary,
  fontSize: fontSizes.body,
  fontFamily: fonts.body,
  outline: "none",
} as const;

const primaryButton = {
  width: "100%",
  background: "#1d6b45",
  border: "none",
  borderRadius: radius.button,
  padding: "12px",
  color: "white",
  fontSize: fontSizes.body,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: fonts.body,
} as const;

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (forgotPassword) {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setConfirmEmail(true);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    }
    setLoading(false);
  };

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
            FINANCE + HEALTH OS
          </p>
        </div>

        {resetSent ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: colors.infoBg,
                border: `1px solid ${colors.infoBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 20,
                color: colors.info,
              }}
            >
              ✉
            </div>
            <p
              style={{
                color: colors.textPrimary,
                fontSize: fontSizes.h3,
                fontWeight: 500,
                margin: "0 0 8px",
              }}
            >
              Reset link sent
            </p>
            <p
              style={{
                color: colors.textTertiary,
                fontSize: fontSizes.small,
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Check <span style={{ color: colors.textSecondary }}>{email}</span> for a
              password reset link.
            </p>
            <button
              type="button"
              onClick={() => {
                setResetSent(false);
                setForgotPassword(false);
              }}
              style={primaryButton}
            >
              Back to Sign In
            </button>
          </div>
        ) : confirmEmail ? (
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
              Account created
            </p>
            <p
              style={{
                color: colors.textTertiary,
                fontSize: fontSizes.small,
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Check <span style={{ color: colors.textSecondary }}>{email}</span> for a
              confirmation link, then sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmEmail(false);
                setIsSignUp(false);
              }}
              style={primaryButton}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
        <>
        {forgotPassword && (
          <p style={{ color: colors.textTertiary, fontSize: fontSizes.small, textAlign: "center", marginBottom: 16, lineHeight: 1.5 }}>
            Enter your email and we'll send you a secure link to reset your password.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              ...inputStyle,
              marginBottom: forgotPassword ? 16 : 12,
            }}
          />
          {!forgotPassword && (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  ...inputStyle,
                  paddingRight: 40,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
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
                {showPassword ? "◡" : "⊙"}
              </button>
            </div>
          )}

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
              ...primaryButton,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : forgotPassword ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        {!forgotPassword && !isSignUp && (
          <p style={{ textAlign: "center", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { setForgotPassword(true); setError(""); }}
              style={{
                background: "none",
                border: "none",
                color: colors.textTertiary,
                cursor: "pointer",
                fontFamily: fonts.body,
                fontSize: fontSizes.caption,
              }}
            >
              Forgot password?
            </button>
          </p>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: forgotPassword ? 16 : 8,
            color: colors.textTertiary,
            fontSize: fontSizes.small,
          }}
        >
          {forgotPassword ? (
            <button
              type="button"
              onClick={() => { setForgotPassword(false); setError(""); }}
              style={{
                background: "none",
                border: "none",
                color: colors.link,
                cursor: "pointer",
                fontFamily: fonts.body,
                fontSize: fontSizes.small,
                textDecoration: "underline",
              }}
            >
              Back to Sign In
            </button>
          ) : (
            <>
              {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.link,
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  fontSize: fontSizes.small,
                  textDecoration: "underline",
                }}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </>
          )}
        </p>
        </>
        )}
      </div>
    </div>
  );
}
