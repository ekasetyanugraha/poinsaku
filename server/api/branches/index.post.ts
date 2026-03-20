export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const businessId = body?.business_id as string
  if (!businessId) {
    throw createError({ statusCode: 400, message: 'business_id is required' })
  }

  // Require owner or business-scoped admin
  const member = await requireMember(event, businessId, { roles: ['owner', 'admin'] })
  if (member.scopeType !== 'business') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const parsed = branchSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // Check slug uniqueness within business
  const { data: slugExists } = await db
    .from('branches')
    .select('id')
    .eq('business_id', businessId)
    .eq('slug', parsed.data.slug)
    .maybeSingle()

  if (slugExists) {
    throw createError({ statusCode: 409, message: 'Slug is already taken within this business' })
  }

  const { data: branch, error } = await db
    .from('branches')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return branch
})
