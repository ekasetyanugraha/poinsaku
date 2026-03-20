export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Branch ID is required' })
  }

  const db = getServiceClient(event)

  // Fetch branch first to resolve business_id
  const { data: existing, error: fetchError } = await db
    .from('branches')
    .select('id, business_id, slug')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw createError({ statusCode: 404, message: 'Branch not found' })
  }

  // Require owner or business-scoped admin
  const member = await requireMember(event, existing.business_id, { roles: ['owner', 'admin'] })
  if (member.scopeType !== 'business') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody(event)
  const updateSchema = branchSchema.omit({ business_id: true }).partial()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  // Check slug uniqueness within business if slug is changing
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const { data: slugExists } = await db
      .from('branches')
      .select('id')
      .eq('business_id', existing.business_id)
      .eq('slug', parsed.data.slug)
      .neq('id', id)
      .maybeSingle()

    if (slugExists) {
      throw createError({ statusCode: 409, message: 'Slug is already taken within this business' })
    }
  }

  const { data: branch, error } = await db
    .from('branches')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return branch
})
