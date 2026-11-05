-- Earlier hosting defaults grant CRUD on newly created tables. Audit history
-- is an exception: application code must never rewrite or erase it.
REVOKE ALL ON TABLE admin_audit FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'questmart_app') THEN
    REVOKE ALL ON TABLE admin_audit FROM questmart_app;
    GRANT SELECT, INSERT ON TABLE admin_audit TO questmart_app;
  END IF;
END;
$$;
