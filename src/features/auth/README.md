# Authentication

Supabase is the authentication authority. Forms use React Hook Form and Zod; auth-api.ts wraps the actual SDK operations. AuthProvider controls restoration/subscriptions and protected navigation. Email links use PKCE with auth/callback and must be opened on the initiating device/browser. Profile data lives in src/features/profile and is protected by the versioned profile migration.

See ../../../docs/supabase-setup.md. Without public configuration, submissions are disabled; no demo session is created.
