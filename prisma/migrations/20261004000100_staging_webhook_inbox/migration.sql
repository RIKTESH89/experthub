-- Owned by staging-webhook. Apply only after identity verification and schema approval.
CREATE TABLE staging_webhook_inbox (
 digest text PRIMARY KEY CHECK (digest ~ '^[0-9a-f]{64}$'),
 raw_body bytea NOT NULL,
 state text NOT NULL DEFAULT 'ready' CHECK(state IN ('ready','leased','done','dead')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 next_attempt timestamptz NOT NULL DEFAULT now(),
 lease_token uuid, lease_until timestamptz,
 last_error text, received_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((state = 'leased') = (lease_token IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX staging_webhook_due ON staging_webhook_inbox(next_attempt,lease_until) WHERE state IN ('ready','leased');
