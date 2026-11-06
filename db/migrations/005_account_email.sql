ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
-- Existing accounts retain access; they are not falsely labelled verified.
ALTER TABLE users ADD COLUMN email_verification_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ALTER COLUMN email_verification_required SET DEFAULT true;
CREATE TABLE account_email_tokens (
  token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify','reset')),
  session_version INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX account_email_tokens_user_idx ON account_email_tokens(user_id,purpose,created_at DESC);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='questmart_app') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON account_email_tokens TO questmart_app;
  END IF;
END $$;
