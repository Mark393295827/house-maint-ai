-- Transactional delivery intents and immutable attempt receipts. The delivery
-- adapter receives delivery_id as its provider idempotency key.
CREATE TABLE IF NOT EXISTS hm_ingress_receipts (
    source TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
    result_ref TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (source, idempotency_key)
);

CREATE TABLE IF NOT EXISTS hm_outbox (
    delivery_id TEXT PRIMARY KEY,
    effect_key TEXT NOT NULL UNIQUE,
    effect_kind TEXT NOT NULL CHECK (effect_kind IN ('assignment','message')),
    run_id TEXT,
    organization_id INTEGER NOT NULL CHECK (organization_id > 0),
    scope_id TEXT NOT NULL,
    case_id INTEGER NOT NULL CHECK (case_id > 0),
    case_version INTEGER NOT NULL CHECK (case_version >= 0),
    policy_version TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('dispatch','quote','spend','external_message','closure')),
    proposal_hash TEXT NOT NULL CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
    required_approval_id TEXT,
    envelope_json JSONB NOT NULL,
    fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
    state TEXT NOT NULL CHECK (state IN ('ready','claimed','delivering','retry_wait','delivered','cancelled','failed','expired')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL CHECK (max_attempts BETWEEN 1 AND 8),
    next_attempt_at TIMESTAMPTZ NOT NULL,
    lease_owner TEXT,
    lease_token TEXT,
    lease_expires_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    terminal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CHECK ((lease_token IS NULL) = (lease_owner IS NULL)),
    CHECK ((lease_token IS NULL) = (lease_expires_at IS NULL))
);

CREATE INDEX IF NOT EXISTS hm_outbox_claimable
    ON hm_outbox(state, next_attempt_at, expires_at, created_at);

CREATE TABLE IF NOT EXISTS hm_delivery_receipts (
    delivery_id TEXT NOT NULL REFERENCES hm_outbox(delivery_id) ON DELETE RESTRICT,
    attempt INTEGER NOT NULL CHECK (attempt BETWEEN 1 AND 8),
    status TEXT NOT NULL CHECK (status IN ('delivered','retryable_failure','permanent_failure','cancelled','expired')),
    external_reference_hash TEXT,
    reason_code TEXT NOT NULL,
    receipt_json JSONB NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (delivery_id, attempt)
);
