// PATCH /api/feature-toggles/:key
// Superadmin only — updates the enabled state of a feature toggle.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, message: 'Toggle key is required' })
  }

  const body = await readBody(event)
  const parsed = featureToggleUpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Invalid request body' })
  }

  const db = getServiceClient(event)

  const { data, error, count } = await db
    .from('feature_toggles')
    .update({ enabled: parsed.data.enabled })
    .eq('key', key)
    .select('key, enabled')

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to update feature toggle' })
  }

  if (!data || data.length === 0) {
    throw createError({ statusCode: 404, message: 'Toggle not found' })
  }

  return { success: true, key: data[0].key, enabled: data[0].enabled }
})
