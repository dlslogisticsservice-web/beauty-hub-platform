-- Password rotation migration intentionally disabled during recovery.
-- Original logic depended on gen_random_bytes/crypt compatibility
-- which is unavailable in the current environment.
-- Admin users will be created manually through Supabase Auth UI.

SELECT 1;