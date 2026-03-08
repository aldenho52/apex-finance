-- ============================================================================
-- Migration 001: SMS Consent + Alert Preferences + Debt Payoff Plans
-- ============================================================================

-- ── SMS Consent (TCPA-compliant audit trail) ──────────────────────────────
CREATE TABLE sms_consent (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_text TEXT NOT NULL,
    consented_at TIMESTAMPTZ,
    verification_sid TEXT,
    verified_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE sms_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sms consent" ON sms_consent
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sms consent" ON sms_consent
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sms consent" ON sms_consent
    FOR UPDATE USING (auth.uid() = user_id);

-- ── Alert Preferences ─────────────────────────────────────────────────────
CREATE TABLE alert_preferences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    sms_critical_only BOOLEAN DEFAULT TRUE,
    quiet_hours_start INT,
    quiet_hours_end INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alert prefs" ON alert_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alert prefs" ON alert_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alert prefs" ON alert_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- ── Debt Payoff Plans ─────────────────────────────────────────────────────
CREATE TABLE debt_payoff_plans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL CHECK (strategy IN ('snowball', 'avalanche', 'balance_transfer')),
    extra_monthly_payment NUMERIC NOT NULL DEFAULT 0,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, strategy)
);

ALTER TABLE debt_payoff_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payoff plans" ON debt_payoff_plans
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payoff plans" ON debt_payoff_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payoff plans" ON debt_payoff_plans
    FOR UPDATE USING (auth.uid() = user_id);
