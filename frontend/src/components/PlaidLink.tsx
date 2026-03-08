import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { createPlaidLinkToken, exchangePlaidToken, triggerSync } from "../lib/api";
import { colors, fonts, fontSizes, radius } from "../lib/theme";

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
        background: colors.positiveBg,
        border: `1px solid ${colors.positiveBorder}`,
        borderRadius: radius.button,
        padding: "10px 16px",
        color: colors.positive,
        fontSize: fontSizes.small,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        fontFamily: fonts.body,
        letterSpacing: "0.04em",
      }}
    >
      {loading ? "..." : "+ Connect Bank"}
    </button>
  );
}
