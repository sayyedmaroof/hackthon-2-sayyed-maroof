/**
 * App-configured credentials.
 *
 * By design this project keeps every operational credential in code (a single
 * place to edit) instead of scattering them across environment variables.
 * Replace the values below with the ones for your environment.
 */

/** PostgreSQL connection used by the app at runtime. */
export const DATABASE_URL =
  'postgresql://neondb_owner:npg_wC9y1qJbcQMg@ep-lingering-glitter-b4m9tcs8-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

/** Admin dashboard credentials (sign in at /admin/login). */
export const ADMIN_EMAIL = 'admin@scentbuild.app'
export const ADMIN_PASSWORD = '12345678'

/** Secret used to sign the admin session cookie. */
export const ADMIN_SESSION_SECRET = 'scentbuild-admin-session-secret-v1'

/** Cookie name that holds the signed admin session token. */
export const ADMIN_SESSION_COOKIE = 'sb_admin'

/** How long an admin session stays valid. */
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000
