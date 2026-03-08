import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { createPlaidLinkToken, exchangePlaidToken, triggerSync } from "../lib/api";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export default function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToken = async () => {
    setLoading(true);
    try {
      const { link_token } = await createPlaidLinkToken();
      setLinkToken(link_token);
    } catch (e) {
      console.error("Failed to create link token:", e);
    }
    setLoading(false);
  };

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      try {
        await exchangePlaidToken(publicToken);
        await triggerSync();
        // Background sync needs a moment to write accounts to DB
        await new Promise((r) => setTimeout(r, 3000));
        onSuccess?.();
      } catch (e) {
        console.error("Plaid exchange failed:", e);
      }
    },
    [onSuccess],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  // Auto-open Plaid Link as soon as the SDK is ready
  useEffect(() => {
    if (ready && linkToken) {
      open();
    }
  }, [ready, linkToken, open]);

  return (
    <button
      onClick={linkToken && ready ? () => open() : fetchToken}
      disabled={loading}
      style={{
        background: "rgba(34,197,94,0.1)",
        border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: 8,
        padding: "10px 16px",
        color: "#4ade80",
        fontSize: 12,
        fontWeight: 700,
        cursor: loading ? "wait" : "pointer",
        fontFamily: "inherit",
        letterSpacing: "0.05em",
      }}
    >
      {loading ? "..." : "+ Connect Bank"}
    </button>
  );
}
