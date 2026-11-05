ALTER TABLE orders ADD COLUMN checkout_key UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes');
ALTER TABLE orders ADD COLUMN shipping_address JSONB;
CREATE UNIQUE INDEX orders_buyer_checkout_key_idx ON orders(buyer_id, checkout_key);
CREATE INDEX orders_pending_expiration_idx ON orders(expires_at) WHERE status='pending';

CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  url TEXT NOT NULL UNIQUE CHECK (url ~ '^https://'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 4194304),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX uploads_owner_created_idx ON uploads(owner_id,created_at DESC);
CREATE TABLE request_limits (
  key_hash TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0)
);
CREATE INDEX request_limits_window_idx ON request_limits(window_start);
