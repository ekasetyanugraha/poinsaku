export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Business ID is required' })
  }

  // Require owner or business-scoped admin
  const member = await requireMember(event, id, { roles: ['owner', 'admin'] })
  if (member.scopeType !== 'business') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody(event)
  const parsed = businessSchema.partial().safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // Check slug uniqueness if slug is being changed
  if (parsed.data.slug) {
    const { data: slugExists } = await db
      .from('businesses')
      .select('id')
      .eq('slug', parsed.data.slug)
      .neq('id', id)
      .maybeSingle()

    if (slugExists) {
      throw createError({ statusCode: 409, message: 'Slug is already taken' })
    }
  }

  const { data: business, error } = await db
    .from('businesses')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return business
})
