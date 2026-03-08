-- ============================================================================
-- APEX Finance + Health OS — Supabase Postgres Schema
-- Run this in your Supabase SQL Editor after creating a project.
-- ============================================================================

-- ── Users Profile ───────────────────────────────────────────────────────────
CREATE TABLE users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    active BOOLEAN DEFAULT TRUE,
    owner_income NUMERIC DEFAULT 135000,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users_profile (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ── Plaid Items ─────────────────────────────────────────────────────────────
CREATE TABLE plaid_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    institution_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plaid_items_user ON plaid_items(user_id);

-- ── Accounts ────────────────────────────────────────────────────────────────
CREATE TABLE accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    official_name TEXT,
    type TEXT NOT NULL,
    subtype TEXT,
    balance_current NUMERIC DEFAULT 0,
    balance_available NUMERIC,
    balance_limit NUMERIC,
    currency TEXT DEFAULT 'USD',
    institution_id TEXT,
    institution_name TEXT,
    last_synced TIMESTAMPTZ DEFAULT now(),
    UNIQUE(plaid_account_id, user_id)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(user_id, type);

-- ── Transactions ────────────────────────────────────────────────────────────
CREATE TABLE transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_transaction_id TEXT NOT NULL UNIQUE,
    account_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    name TEXT,
    merchant_name TEXT,
    category JSONB DEFAULT '[]',
    category_id TEXT,
    pending BOOLEAN DEFAULT FALSE,
    payment_channel TEXT,
    is_recurring BOOLEAN,
    recurring_frequency TEXT
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_merchant ON transactions(user_id, merchant_name);

-- ── Credit Card Details ─────────────────────────────────────────────────────
CREATE TABLE credit_card_details (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id TEXT NOT NULL UNIQUE,
    minimum_payment NUMERIC,
    next_payment_due_date TEXT,
    last_statement_balance NUMERIC,
    last_payment_amount NUMERIC,
    last_payment_date TEXT,
    aprs JSONB DEFAULT '[]'
);

-- ── Alerts ──────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT,
    property_id TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    amount NUMERIC,
    due_date TEXT,
    action TEXT,
    alert_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_user_active ON alerts(user_id, acknowledged) WHERE acknowledged = FALSE;

-- ── Payment History ─────────────────────────────────────────────────────────
CREATE TABLE payment_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'missed')),
    date TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_payment_history_user ON payment_history(user_id);

-- ── Conversations ───────────────────────────────────────────────────────────
CREATE TABLE conversations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_user ON conversations(user_id, timestamp DESC);

-- ── Food Logs ───────────────────────────────────────────────────────────────
CREATE TABLE food_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    meals JSONB DEFAULT '[]',
    total_protein NUMERIC DEFAULT 0,
    total_fat NUMERIC DEFAULT 0,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, date);

-- ── Streaks ─────────────────────────────────────────────────────────────────
CREATE TABLE streaks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    current_streak INT DEFAULT 0,
    UNIQUE(user_id, type)
);

-- ── Properties ──────────────────────────────────────────────────────────────
CREATE TABLE properties (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    purchase_price NUMERIC NOT NULL,
    purchase_date TIMESTAMPTZ NOT NULL,
    current_value NUMERIC,
    mortgage_balance NUMERIC,
    mortgage_rate NUMERIC,
    mortgage_monthly_payment NUMERIC,
    mortgage_remaining_months INT,
    monthly_rent NUMERIC,
    lease_end_date TEXT,
    insurance_monthly NUMERIC DEFAULT 0,
    property_tax_monthly NUMERIC DEFAULT 0,
    hoa_monthly NUMERIC DEFAULT 0,
    management_fee_pct NUMERIC DEFAULT 0,
    maintenance_reserve_pct NUMERIC DEFAULT 0.01,
    land_value_pct NUMERIC DEFAULT 0.2,
    active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_properties_user ON properties(user_id);

-- ── Rental Reports ──────────────────────────────────────────────────────────
CREATE TABLE rental_reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    property_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    pnl JSONB,
    market_data JSONB,
    analysis JSONB,
    narrative TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rental_reports_user ON rental_reports(user_id, created_at DESC);

-- ── SMS Consent ───────────────────────────────────────────────────────────
CREATE TABLE sms_consent (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_text TEXT,
    consented_at TIMESTAMPTZ,
    verification_sid TEXT,
    verified_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sms_consent_user ON sms_consent(user_id);

-- ── Alert Preferences ─────────────────────────────────────────────────────
CREATE TABLE alert_preferences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    sms_critical_only BOOLEAN DEFAULT TRUE,
    quiet_hours_start INT,
    quiet_hours_end INT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alert_preferences_user ON alert_preferences(user_id);

-- ── Email Preferences ─────────────────────────────────────────────────────
CREATE TABLE email_preferences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    digest_enabled BOOLEAN DEFAULT TRUE,
    digest_day TEXT DEFAULT 'sunday',
    digest_hour INT DEFAULT 9,
    email_override TEXT,
    last_digest_sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_preferences_user ON email_preferences(user_id);

-- ── Learning Articles ─────────────────────────────────────────────────────
CREATE TABLE learning_articles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    topic TEXT,
    week_number INT,
    difficulty TEXT DEFAULT 'beginner',
    reading_time_minutes INT DEFAULT 3,
    further_reading JSONB DEFAULT '[]'
);

CREATE INDEX idx_learning_articles_date ON learning_articles(date);

-- ── Learning Progress ─────────────────────────────────────────────────────
CREATE TABLE learning_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id BIGINT NOT NULL REFERENCES learning_articles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    bookmarked BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_learning_progress_user ON learning_progress(user_id);

-- ── Weekly Snapshots ──────────────────────────────────────────────────────
CREATE TABLE weekly_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    net_worth NUMERIC,
    total_debt NUMERIC,
    total_spending NUMERIC,
    top_categories JSONB DEFAULT '[]',
    UNIQUE(user_id, week_start)
);

CREATE INDEX idx_weekly_snapshots_user ON weekly_snapshots(user_id, week_start);

-- ── Debt Payoff Plans ─────────────────────────────────────────────────────
CREATE TABLE debt_payoff_plans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    extra_monthly_payment NUMERIC DEFAULT 0,
    snapshot JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, strategy)
);

CREATE INDEX idx_debt_payoff_plans_user ON debt_payoff_plans(user_id);

-- ============================================================================
-- RLS Policies — Every table locked to the authenticated user's own data
-- ============================================================================

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payoff_plans ENABLE ROW LEVEL SECURITY;

-- users_profile
CREATE POLICY "Users can view own profile" ON users_profile FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users_profile FOR UPDATE USING (auth.uid() = id);

-- plaid_items
CREATE POLICY "Users can view own plaid items" ON plaid_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plaid items" ON plaid_items FOR INSERT WITH CHECK (auth.uid() = user_id);

-- accounts
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- credit_card_details — join through accounts
CREATE POLICY "Users can view own cc details" ON credit_card_details FOR SELECT
    USING (EXISTS (SELECT 1 FROM accounts a WHERE a.plaid_account_id = credit_card_details.account_id AND a.user_id = auth.uid()));
CREATE POLICY "Users can manage own cc details" ON credit_card_details FOR ALL
    USING (EXISTS (SELECT 1 FROM accounts a WHERE a.plaid_account_id = credit_card_details.account_id AND a.user_id = auth.uid()));

-- alerts
CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON alerts FOR ALL USING (auth.uid() = user_id);

-- payment_history
CREATE POLICY "Users can view own payment history" ON payment_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payment history" ON payment_history FOR ALL USING (auth.uid() = user_id);

-- conversations
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- food_logs
CREATE POLICY "Users can view own food logs" ON food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own food logs" ON food_logs FOR ALL USING (auth.uid() = user_id);

-- streaks
CREATE POLICY "Users can view own streaks" ON streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own streaks" ON streaks FOR ALL USING (auth.uid() = user_id);

-- properties
CREATE POLICY "Users can view own properties" ON properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own properties" ON properties FOR ALL USING (auth.uid() = user_id);

-- rental_reports
CREATE POLICY "Users can view own rental reports" ON rental_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own rental reports" ON rental_reports FOR ALL USING (auth.uid() = user_id);

-- sms_consent
CREATE POLICY "Users can view own sms consent" ON sms_consent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sms consent" ON sms_consent FOR ALL USING (auth.uid() = user_id);

-- alert_preferences
CREATE POLICY "Users can view own alert preferences" ON alert_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alert preferences" ON alert_preferences FOR ALL USING (auth.uid() = user_id);

-- email_preferences
CREATE POLICY "Users can view own email preferences" ON email_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own email preferences" ON email_preferences FOR ALL USING (auth.uid() = user_id);

-- learning_articles (global content, everyone can read)
CREATE POLICY "Anyone can view learning articles" ON learning_articles FOR SELECT USING (true);

-- learning_progress
CREATE POLICY "Users can view own learning progress" ON learning_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own learning progress" ON learning_progress FOR ALL USING (auth.uid() = user_id);

-- weekly_snapshots
CREATE POLICY "Users can view own weekly snapshots" ON weekly_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own weekly snapshots" ON weekly_snapshots FOR ALL USING (auth.uid() = user_id);

-- debt_payoff_plans
CREATE POLICY "Users can view own debt payoff plans" ON debt_payoff_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own debt payoff plans" ON debt_payoff_plans FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SQL Functions (replace MongoDB aggregation pipelines)
-- These are called via sb.rpc() from the backend with service_role key
-- ============================================================================

-- Detect recurring charges for a user (replaces plaid_client.py aggregation)
CREATE OR REPLACE FUNCTION detect_recurring_charges(p_user_id UUID)
RETURNS TABLE (
    merchant TEXT,
    monthly_amount NUMERIC,
    annual_cost NUMERIC,
    occurrences BIGINT,
    price_increased BOOLEAN,
    increase_amount NUMERIC,
    increase_annual NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH grouped AS (
        SELECT
            t.merchant_name,
            COUNT(*) AS cnt,
            AVG(t.amount) AS avg_amount,
            ARRAY_AGG(t.amount ORDER BY t.date DESC) AS amounts,
            ARRAY_AGG(t.date ORDER BY t.date DESC) AS dates
        FROM transactions t
        WHERE t.user_id = p_user_id AND t.amount > 0 AND t.merchant_name IS NOT NULL
        GROUP BY t.merchant_name
        HAVING COUNT(*) >= 2
    )
    SELECT
        g.merchant_name AS merchant,
        ROUND(g.avg_amount, 2) AS monthly_amount,
        ROUND(g.avg_amount * 12, 2) AS annual_cost,
        g.cnt AS occurrences,
        (g.amounts[1] > g.amounts[2]) AS price_increased,
        CASE WHEN g.amounts[1] > g.amounts[2]
            THEN ROUND(g.amounts[1] - g.amounts[2], 2)
            ELSE 0
        END AS increase_amount,
        CASE WHEN g.amounts[1] > g.amounts[2]
            THEN ROUND((g.amounts[1] - g.amounts[2]) * 12, 2)
            ELSE 0
        END AS increase_annual
    FROM grouped g
    ORDER BY g.avg_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detect subscription price escalations (replaces alert_engine.py aggregation)
CREATE OR REPLACE FUNCTION detect_subscription_escalations(p_user_id UUID)
RETURNS TABLE (
    merchant TEXT,
    prev_amount NUMERIC,
    latest_amount NUMERIC,
    increase NUMERIC,
    annual_increase NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH grouped AS (
        SELECT
            t.merchant_name,
            COUNT(*) AS cnt,
            ARRAY_AGG(t.amount ORDER BY t.date DESC) AS amounts
        FROM transactions t
        WHERE t.user_id = p_user_id AND t.amount > 0 AND t.merchant_name IS NOT NULL
        GROUP BY t.merchant_name
        HAVING COUNT(*) >= 3
    )
    SELECT
        g.merchant_name AS merchant,
        g.amounts[2] AS prev_amount,
        g.amounts[1] AS latest_amount,
        ROUND(g.amounts[1] - g.amounts[2], 2) AS increase,
        ROUND((g.amounts[1] - g.amounts[2]) * 12, 2) AS annual_increase
    FROM grouped g
    WHERE g.amounts[1] > g.amounts[2] * 1.02;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
