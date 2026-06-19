-- V1__init.sql
-- 전체 스키마 초기화 (이슈 #49 통합 작업).
-- ADR-006, ADR-007, P0-009 (user_achivement_id 오타), P0-010 (family_type text[] 오용) 정정.
-- play_logs 테이블은 stats-sync (Phase 5)에서 사용할 멱등성 키 저장소로 미리 신설.

-- ============================================================================
-- users
-- ============================================================================
CREATE TABLE users (
    user_id        BIGSERIAL PRIMARY KEY,
    email          VARCHAR(255) NOT NULL,
    password       VARCHAR(255),
    name           VARCHAR(50)  NOT NULL,
    role           VARCHAR(20)  NOT NULL,
    status         VARCHAR(20)  NOT NULL,
    withdrawn_at   TIMESTAMP,
    last_login_at  TIMESTAMP,
    created_at     TIMESTAMP    NOT NULL,
    updated_at     TIMESTAMP    NOT NULL,
    CONSTRAINT uk_users_email UNIQUE (email)
);

-- ============================================================================
-- user_profiles
-- ============================================================================
CREATE TABLE user_profiles (
    user_id              BIGINT       PRIMARY KEY,
    occupation           VARCHAR(30),
    gender               VARCHAR(10),
    age_group            VARCHAR(30),
    onboarding_completed BOOLEAN      NOT NULL,
    economic_activities  TEXT[],
    communicate_channels TEXT[],
    online_activities    TEXT[],
    financial_channels   TEXT[],
    family_type          VARCHAR(50),
    created_at           TIMESTAMP    NOT NULL,
    updated_at           TIMESTAMP    NOT NULL,
    CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ============================================================================
-- user_stats
-- ============================================================================
CREATE TABLE user_stats (
    stat_id                  BIGSERIAL PRIMARY KEY,
    user_id                  BIGINT       NOT NULL,
    total_plays              INTEGER      NOT NULL,
    complete_plays           INTEGER      NOT NULL,
    good_endings             INTEGER      NOT NULL,
    bad_endings              INTEGER      NOT NULL,
    total_dangerous_choices  INTEGER      NOT NULL,
    avg_score                NUMERIC(5,2) NOT NULL,
    best_score               INTEGER      NOT NULL,
    created_at               TIMESTAMP    NOT NULL,
    updated_at               TIMESTAMP    NOT NULL,
    CONSTRAINT uk_user_stats_user_id UNIQUE (user_id),
    CONSTRAINT fk_user_stats_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ============================================================================
-- refresh_tokens
-- ============================================================================
CREATE TABLE refresh_tokens (
    token_id     BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL,
    token_hash   VARCHAR(255) NOT NULL,
    device_info  VARCHAR(255),
    expired_at   TIMESTAMP    NOT NULL,
    revoked      BOOLEAN      NOT NULL,
    created_at   TIMESTAMP    NOT NULL,
    updated_at   TIMESTAMP    NOT NULL,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- ============================================================================
-- auth_providers
-- ============================================================================
CREATE TABLE auth_providers (
    auth_provider_id BIGSERIAL PRIMARY KEY,
    user_id          BIGINT       NOT NULL,
    provider         VARCHAR(20)  NOT NULL,
    provider_id      VARCHAR(255),
    created_at       TIMESTAMP    NOT NULL,
    updated_at       TIMESTAMP    NOT NULL,
    CONSTRAINT uk_auth_providers_provider_provider_id UNIQUE (provider, provider_id),
    CONSTRAINT uk_auth_providers_user_provider        UNIQUE (user_id, provider),
    CONSTRAINT fk_auth_providers_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ============================================================================
-- user_scenario_progress
-- ============================================================================
CREATE TABLE user_scenario_progress (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT       NOT NULL,
    scenario_id        VARCHAR(120) NOT NULL,
    discovered_ending  TEXT[]       NOT NULL,
    total_endings      INTEGER      NOT NULL,
    completion_rate    REAL         NOT NULL,
    play_count         INTEGER      NOT NULL,
    last_played_at     TIMESTAMP    NOT NULL,
    CONSTRAINT uk_user_scenario_progress UNIQUE (user_id, scenario_id),
    CONSTRAINT fk_user_scenario_progress_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_scenario_progress_user_id ON user_scenario_progress (user_id);

-- ============================================================================
-- achievements
-- ============================================================================
CREATE TABLE achievements (
    achievement_id  BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50)  NOT NULL,
    title           VARCHAR(100) NOT NULL,
    description     VARCHAR(500) NOT NULL,
    icon_url        VARCHAR(500),
    condition_value VARCHAR(255) NOT NULL,
    CONSTRAINT uk_achievements_code UNIQUE (code)
);

-- ============================================================================
-- user_achievements (P0-009: user_achivement_id 오타 수정)
-- ============================================================================
CREATE TABLE user_achievements (
    user_achievement_id BIGSERIAL PRIMARY KEY,
    user_id             BIGINT    NOT NULL,
    achievement_id      BIGINT    NOT NULL,
    achieved_at         TIMESTAMP NOT NULL,
    CONSTRAINT uk_user_achievement_once UNIQUE (user_id, achievement_id),
    CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements (achievement_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements (user_id);

-- ============================================================================
-- notification (entity table name = "notification", singular)
-- ============================================================================
CREATE TABLE notification (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    type            VARCHAR(30)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    reference_id    VARCHAR(255),
    is_read         BOOLEAN,
    created_at      TIMESTAMP    NOT NULL,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_user_id ON notification (user_id);

-- ============================================================================
-- withdrawal_outbox
-- ============================================================================
CREATE TABLE withdrawal_outbox (
    withdrawal_outbox_id BIGSERIAL PRIMARY KEY,
    user_id              BIGINT        NOT NULL,
    execute_at           TIMESTAMP     NOT NULL,
    status               VARCHAR(20)   NOT NULL,
    processed_at         TIMESTAMP,
    last_error           VARCHAR(1000),
    created_at           TIMESTAMP     NOT NULL,
    updated_at           TIMESTAMP     NOT NULL,
    CONSTRAINT uk_withdrawal_outbox_user_id UNIQUE (user_id)
);

CREATE INDEX idx_withdrawal_outbox_status_execute_at ON withdrawal_outbox (status, execute_at);

-- ============================================================================
-- game_sessions
-- ============================================================================
CREATE TABLE game_sessions (
    game_session_id  BIGSERIAL PRIMARY KEY,
    session_id       VARCHAR(120) NOT NULL,
    scenario_id      VARCHAR(255) NOT NULL,
    user_id          BIGINT       NOT NULL,
    current_node_id  VARCHAR(120) NOT NULL,
    resources        JSONB        NOT NULL,
    choices_history  JSONB        NOT NULL,
    dangerous_count  INTEGER      NOT NULL,
    visited_endings  TEXT[]       NOT NULL,
    status           VARCHAR(20)  NOT NULL,
    started_at       TIMESTAMP    NOT NULL,
    completed_at     TIMESTAMP,
    CONSTRAINT uk_game_sessions_session_id UNIQUE (session_id),
    CONSTRAINT fk_game_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_game_sessions_user_id ON game_sessions (user_id);

-- ============================================================================
-- play_logs (NEW — stats-sync 멱등성 키 저장소; Phase 5에서 사용)
-- ============================================================================
CREATE TABLE play_logs (
    id                BIGSERIAL PRIMARY KEY,
    play_log_id       VARCHAR(255) NOT NULL,
    user_id           BIGINT       NOT NULL,
    scenario_id       VARCHAR(255),
    session_id        VARCHAR(255),
    ending_type       VARCHAR(50),
    total_score       INTEGER,
    dangerous_count   INTEGER,
    duration_seconds  INTEGER,
    completed_at      TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_play_logs_play_log_id UNIQUE (play_log_id),
    CONSTRAINT fk_play_logs_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_play_logs_user_id ON play_logs (user_id);
CREATE INDEX idx_play_logs_scenario_id ON play_logs (scenario_id);
