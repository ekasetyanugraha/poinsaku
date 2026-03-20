export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = memberSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // Resolve business_id from scope
  let resolvedBusinessId: string
  if (parsed.data.scope_type === 'business') {
    resolvedBusinessId = parsed.data.scope_id

    // Validate the business exists
    const { data: business } = await db
      .from('businesses')
      .select('id')
      .eq('id', resolvedBusinessId)
      .maybeSingle()

    if (!business) {
      throw createError({ statusCode: 404, message: 'Business not found' })
    }
  } else {
    // scope_type === 'branch': look up branch to get business_id
    const { data: branch } = await db
      .from('branches')
      .select('id, business_id')
      .eq('id', parsed.data.scope_id)
      .maybeSingle()

    if (!branch) {
      throw createError({ statusCode: 404, message: 'Branch not found' })
    }

    resolvedBusinessId = branch.business_id
  }

  // Require owner or business-scoped admin
  const currentMember = await requireMember(event, resolvedBusinessId, { roles: ['owner', 'admin'] })
  if (currentMember.scopeType !== 'business') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Admins cannot create owner-role members
  if (parsed.data.role === 'owner' && currentMember.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only owners can add other owners' })
  }

  // Check for duplicate: same (auth_user_id, scope_type, scope_id)
  const { data: existing } = await db
    .from('members')
    .select('id')
    .eq('auth_user_id', parsed.data.auth_user_id)
    .eq('scope_type', parsed.data.scope_type)
    .eq('scope_id', parsed.data.scope_id)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: 'Member already exists with this scope' })
  }

  const { data: member, error } = await db
    .from('members')
    .insert({
      auth_user_id: parsed.data.auth_user_id,
      role: parsed.data.role,
      scope_type: parsed.data.scope_type,
      scope_id: parsed.data.scope_id,
      invited_by: currentMember.authUserId,
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return member
})
