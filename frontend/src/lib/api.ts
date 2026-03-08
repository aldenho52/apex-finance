import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authFetch(path: string, options: RequestInit = {}, retried = false): Promise<any> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (res.status === 401 && !retried) {
    const { error } = await supabase.auth.refreshSession();
    if (!error) return authFetch(path, options, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// Accounts
export const fetchAccounts = () => authFetch("/api/accounts");

// Alerts
export const fetchAlerts = () => authFetch("/api/alerts");

export const acknowledgeAlert = (alertId: number) =>
  authFetch(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });

// Rental
export const fetchRentalSummary = () => authFetch("/api/rental");

// Chat
export const sendChatMessage = (message: string) =>
  authFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

// Daily Brief
export const fetchDailyBrief = () => authFetch("/api/daily-brief");

// Plaid
export const createPlaidLinkToken = () =>
  authFetch("/api/plaid/link-token", { method: "POST" });

export const exchangePlaidToken = (publicToken: string) =>
  authFetch("/api/plaid/exchange", {
    method: "POST",
    body: JSON.stringify({ public_token: publicToken }),
  });

export const triggerSync = () =>
  authFetch("/api/plaid/sync", { method: "POST" });

// Balance Transfer Optimizer
export const fetchBalanceTransferAnalysis = () =>
  authFetch("/api/balance-transfer/analyze");

// Debt Manager
export const fetchDebtOverview = () => authFetch("/api/debt/overview");

export const calculatePayoff = (extraMonthlyPayment: number) =>
  authFetch("/api/debt/payoff-calculator", {
    method: "POST",
    body: JSON.stringify({ extra_monthly_payment: extraMonthlyPayment }),
  });

export const savePayoffPlan = (strategy: string, extraMonthlyPayment: number, snapshot: unknown) =>
  authFetch("/api/debt/save-plan", {
    method: "POST",
    body: JSON.stringify({ strategy, extra_monthly_payment: extraMonthlyPayment, snapshot }),
  });

// SMS & Settings
export const startPhoneVerification = (phone: string) =>
  authFetch("/api/settings/phone/verify", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const confirmPhoneVerification = (phone: string, code: string) =>
  authFetch("/api/settings/phone/confirm", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

export const removePhone = () =>
  authFetch("/api/settings/phone", { method: "DELETE" });

export const getSmsStatus = () => authFetch("/api/settings/sms-status");

export const getAlertPreferences = () => authFetch("/api/settings/alert-preferences");

export const updateAlertPreferences = (prefs: {
  sms_enabled: boolean;
  sms_critical_only: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}) =>
  authFetch("/api/settings/alert-preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });

// Email Digest
export const getEmailPreferences = () => authFetch("/api/settings/email-preferences");

export const updateEmailPreferences = (prefs: {
  digest_enabled: boolean;
  digest_day: string;
  digest_hour: number;
}) =>
  authFetch("/api/settings/email-preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });

export const previewDigest = () =>
  authFetch("/api/settings/email-preview", { method: "POST" });

// Cash Flow
export const fetchCashFlow = (period: string = "monthly") =>
  authFetch(`/api/cash-flow?period=${period}`);

// Learning
export const fetchTodaysArticle = () => authFetch("/api/learning/today");

export const fetchArticleArchive = (limit = 7) =>
  authFetch(`/api/learning/archive?limit=${limit}`);

export const markArticleRead = (articleId: number) =>
  authFetch(`/api/learning/${articleId}/mark-read`, { method: "POST" });

export const toggleArticleBookmark = (articleId: number) =>
  authFetch(`/api/learning/${articleId}/bookmark`, { method: "POST" });
