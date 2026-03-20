export default defineEventHandler(async (event) => {
  // 1. Parse and validate body
  const body = await readBody(event)
  const parsed = createStaffSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const { email, password, display_name, role, scope_type, scope_id } = parsed.data
  const db = getServiceClient(event)

  // 2. Resolve businessId from scope
  let resolvedBusinessId: string
  if (scope_type === 'business') {
    resolvedBusinessId = scope_id

    const { data: business } = await db
      .from('businesses')
      .select('id')
      .eq('id', resolvedBusinessId)
      .maybeSingle()

    if (!business) {
      throw createError({ statusCode: 404, message: 'Business not found' })
    }
  } else {
    const { data: branch } = await db
      .from('branches')
      .select('id, business_id')
      .eq('id', scope_id)
      .maybeSingle()

    if (!branch) {
      throw createError({ statusCode: 404, message: 'Branch not found' })
    }

    resolvedBusinessId = branch.business_id
  }

  // 3. Assert owner
  const owner = await requireOwner(event, resolvedBusinessId)

  // 4. Create Supabase Auth user
  const authUser = await createAuthUser(event, {
    email,
    password,
    user_metadata: { display_name, role },
  })

  // 5. Insert member row
  const { data: member, error: insertError } = await db
    .from('members')
    .insert({
      auth_user_id: authUser.id,
      role,
      scope_type,
      scope_id,
      display_name: display_name ?? null,
      invited_by: owner.authUserId,
    })
    .select('id')
    .single()

  if (insertError) {
    // Rollback: delete auth user to prevent orphan
    await deleteAuthUser(event, authUser.id).catch(() => {})
    throw createError({ statusCode: 500, message: 'Gagal menyimpan data staf.' })
  }

  // 6. Return minimal confirmation (client fetches full details separately)
  return { id: member.id, email: authUser.email, created: true }
})
