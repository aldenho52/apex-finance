-- ============================================================================
-- Migration 002: OTP Codes + Email Preferences + Weekly Snapshots +
--                Learning Articles + Learning Progress
-- ============================================================================

-- ── OTP Codes (self-managed phone verification) ────────────────────────────
CREATE TABLE otp_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otp_codes_user ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_lookup ON otp_codes(phone, code);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own OTP codes" ON otp_codes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own OTP codes" ON otp_codes
    FOR ALL USING (auth.uid() = user_id);

-- ── Email Preferences ──────────────────────────────────────────────────────
CREATE TABLE email_preferences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    digest_enabled BOOLEAN DEFAULT TRUE,
    digest_day TEXT DEFAULT 'sunday' CHECK (digest_day IN (
        'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
    )),
    digest_hour INT DEFAULT 9 CHECK (digest_hour >= 0 AND digest_hour <= 23),
    email_override TEXT,
    last_digest_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own email prefs" ON email_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email prefs" ON email_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email prefs" ON email_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- ── Weekly Snapshots (week-over-week tracking) ─────────────────────────────
CREATE TABLE weekly_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    net_worth NUMERIC,
    total_debt NUMERIC,
    total_spending NUMERIC,
    top_categories JSONB DEFAULT '[]',
    account_balances JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, week_start)
);

CREATE INDEX idx_weekly_snapshots_user ON weekly_snapshots(user_id, week_start DESC);

ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own snapshots" ON weekly_snapshots
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own snapshots" ON weekly_snapshots
    FOR ALL USING (auth.uid() = user_id);

-- ── Learning Articles (one per day, shared) ────────────────────────────────
CREATE TABLE learning_articles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    topic TEXT NOT NULL,
    week_number INT NOT NULL,
    difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    reading_time_minutes INT DEFAULT 3,
    further_reading JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_learning_articles_date ON learning_articles(date DESC);

ALTER TABLE learning_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view articles" ON learning_articles
    FOR SELECT TO authenticated USING (true);

-- ── Learning Progress (per-user reading tracking) ──────────────────────────
CREATE TABLE learning_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id BIGINT NOT NULL REFERENCES learning_articles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT now(),
    bookmarked BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_learning_progress_user ON learning_progress(user_id);

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON learning_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON learning_progress
    FOR ALL USING (auth.uid() = user_id);
