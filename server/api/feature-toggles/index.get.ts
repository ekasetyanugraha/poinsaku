// GET /api/feature-toggles
// Public endpoint — no auth required.
// Client needs toggle state on every page load including unauthenticated pages (landing page).
export default defineEventHandler(async (event) => {
  const db = getServiceClient(event)

  const { data: toggles, error } = await db
    .from('feature_toggles')
    .select('id, key, enabled, label, description, updated_at, created_at')
    .order('key', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch feature toggles' })
  }

  return { data: toggles }
})
