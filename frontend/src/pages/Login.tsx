import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

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
        fontFamily: "'DM Mono', 'Courier New', monospace",
        background: "#08090d",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #374151; }`}
      </style>

      <div
        style={{
          background: "#0d0f14",
          border: "1px solid #111827",
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
                background: "#22c55e",
                boxShadow: "0 0 8px #22c55e",
              }}
            />
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "0.2em",
                color: "white",
              }}
            >
              APEX
            </span>
          </div>
          <p style={{ color: "#374151", fontSize: 11, margin: 0 }}>
            FINANCE + HEALTH OS
          </p>
        </div>

        {confirmEmail ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
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
                color: "#e5e7eb",
                fontSize: 14,
                fontWeight: 500,
                margin: "0 0 8px",
              }}
            >
              Account created
            </p>
            <p
              style={{
                color: "#6b7280",
                fontSize: 12,
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Check <span style={{ color: "#9ca3af" }}>{email}</span> for a
              confirmation link, then sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmEmail(false);
                setIsSignUp(false);
              }}
              style={{
                width: "100%",
                background: "#1d4ed8",
                border: "none",
                borderRadius: 8,
                padding: "12px",
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
        <>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #1a1f2e",
              borderRadius: 8,
              padding: "12px 14px",
              color: "white",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              marginBottom: 12,
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #1a1f2e",
              borderRadius: 8,
              padding: "12px 14px",
              color: "white",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              marginBottom: 16,
            }}
          />

          {error && (
            <p
              style={{
                color: "#ef4444",
                fontSize: 12,
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
              background: "#1d4ed8",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 16,
            color: "#4b5563",
            fontSize: 12,
          }}
        >
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#60a5fa",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              textDecoration: "underline",
            }}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
        </>
        )}
      </div>
    </div>
  );
}
