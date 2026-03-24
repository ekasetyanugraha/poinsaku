// POST /api/feature-toggles
// Superadmin only — creates a new feature toggle row.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const body = await readBody(event)
  const parsed = featureToggleCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request body', data: parsed.error.flatten() })
  }

  const { key, label, description, enabled } = parsed.data

  const db = getServiceClient(event)

  const { data, error } = await db
    .from('feature_toggles')
    .insert({ key, label, description: description ?? null, enabled })
    .select()
    .single()

  if (error) {
    // Postgres unique constraint violation on 'key'
    if (error.code === '23505') {
      throw createError({ statusCode: 409, message: 'Toggle with this key already exists' })
    }
    throw createError({ statusCode: 500, message: 'Failed to create feature toggle' })
  }

  return { success: true, data }
})
