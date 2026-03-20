import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export function getServiceClient(event: H3Event) {
  return serverSupabaseServiceRole(event)
}

/**
 * Create a Supabase Auth user via the admin API (service role).
 * Wraps auth.admin.createUser with error handling and structured error messages.
 * Only createUser for Phase 1 — other admin methods (deleteUser, updateUser, ban/unban) added in Phase 2.
 */
export async function createAuthUser(
  event: H3Event,
  params: {
    email: string
    password: string
    user_metadata?: {
      display_name?: string
      role?: 'owner' | 'admin' | 'cashier'
    }
  },
) {
  const client = getServiceClient(event)

  const { data, error } = await client.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: params.user_metadata ?? {},
  })

  if (error) {
    // Duplicate email: Supabase returns "User already registered" or similar
    if (error.message?.toLowerCase().includes('already') || error.status === 422) {
      throw createError({
        statusCode: 409,
        message: 'Email sudah terdaftar. Gunakan email lain.',
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Gagal membuat akun staf. Coba lagi.',
    })
  }

  return data.user
}

/**
 * Delete a Supabase Auth user via the admin API (service role).
 * Hard delete — email becomes immediately re-usable.
 */
export async function deleteAuthUser(event: H3Event, authUserId: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.deleteUser(authUserId)
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal menghapus akun auth.' })
  }
}

/**
 * Update a Supabase Auth user's password via the admin API (service role).
 */
export async function updateAuthUserPassword(event: H3Event, authUserId: string, password: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.updateUserById(authUserId, { password })
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal memperbarui password.' })
  }
}

/**
 * Ban a Supabase Auth user (deactivate) via the admin API (service role).
 * Uses ban_duration: '87600h' (10 years) as project-decided constant.
 */
export async function banAuthUser(event: H3Event, authUserId: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.updateUserById(authUserId, { ban_duration: '87600h' })
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal menonaktifkan akun.' })
  }
}

/**
 * Unban a Supabase Auth user (reactivate) via the admin API (service role).
 * Uses ban_duration: 'none' — the documented way to lift a ban.
 * Do NOT use '0s' or '' — those do not unban correctly.
 */
export async function unbanAuthUser(event: H3Event, authUserId: string): Promise<void> {
  const client = getServiceClient(event)
  const { error } = await client.auth.admin.updateUserById(authUserId, { ban_duration: 'none' })
  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal mengaktifkan akun.' })
  }
}
