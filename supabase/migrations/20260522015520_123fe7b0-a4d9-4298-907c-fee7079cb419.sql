-- Demo seed migration intentionally disabled during recovery.
-- Original seeded auth users depended on crypt/gen_salt compatibility
-- which is unavailable in the current Supabase/Postgres environment.
-- Schema, RLS, triggers, and core application tables are restored
-- by previous migrations. Real admin users will be created manually
-- through Supabase Authentication after recovery.

SELECT 1;