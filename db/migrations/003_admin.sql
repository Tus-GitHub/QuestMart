ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'));
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended'));
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0 CHECK (session_version >= 0);
ALTER TABLE users ADD COLUMN password_change_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible','hidden'));
ALTER TABLE listings ADD COLUMN moderation_reason TEXT NOT NULL DEFAULT '' CHECK (char_length(moderation_reason) <= 500);
CREATE INDEX users_admin_filter_idx ON users(role,account_status,created_at DESC);
CREATE INDEX listings_moderation_idx ON listings(moderation_status,created_at DESC);

CREATE TABLE admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (char_length(action) BETWEEN 3 AND 80),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user','listing','order','security')),
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  before_state JSONB NOT NULL DEFAULT '{}',
  after_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created_idx ON admin_audit(created_at DESC,id);
-- Runtime receives SELECT/INSERT only. Audit records are not editable in the app.
