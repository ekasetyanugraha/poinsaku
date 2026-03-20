export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = await readBody(event)
  const parsed = businessSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // Check slug uniqueness
  const { data: slugExists } = await db
    .from('businesses')
    .select('id')
    .eq('slug', parsed.data.slug)
    .maybeSingle()

  if (slugExists) {
    throw createError({ statusCode: 409, message: 'Slug is already taken' })
  }

  // Insert business using service client (RLS requires membership which doesn't exist yet)
  const { data: business, error: bizError } = await db
    .from('businesses')
    .insert(parsed.data)
    .select()
    .single()

  if (bizError) {
    throw createError({ statusCode: 500, message: bizError.message })
  }

  // Insert owner membership row
  const { error: memberError } = await db
    .from('members')
    .insert({
      auth_user_id: user.id,
      role: 'owner',
      scope_type: 'business',
      scope_id: business.id,
    })

  if (memberError) {
    // Rollback: delete the business (CASCADE will remove any related rows)
    await db.from('businesses').delete().eq('id', business.id)
    throw createError({ statusCode: 500, message: memberError.message })
  }

  return business
})
