-- Rotate hardcoded seeded demo account passwords to random unguessable values.
-- The known credentials from the seed migration (SuperAdmin@2025, Admin@2025,
-- Owner@2025, Customer@2025) are revoked here. Accounts and roles are preserved.
-- To regain access, use the password-reset flow from the login page, or set a
-- new password from the auth admin UI.
UPDATE auth.users
SET encrypted_password = crypt(
      encode(gen_random_bytes(24), 'base64') || gen_random_uuid()::text,
      gen_salt('bf')
    ),
    updated_at = now()
WHERE email IN (
  'superadmin@beautyhub.app',
  'admin@beautyhub.app',
  'owner.eg@beautyhub.app',
  'owner.sa@beautyhub.app',
  'customer1@beautyhub.app'
);