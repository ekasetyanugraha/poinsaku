import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string

  if (code) {
    const client = await serverSupabaseClient(event)
    await client.auth.exchangeCodeForSession(code)
  }

  return sendRedirect(event, '/dashboard')
})
