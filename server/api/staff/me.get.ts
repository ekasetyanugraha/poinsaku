export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = getServiceClient(event)

  // Find the member record for this auth user across all businesses
  const { data: member, error: memberError } = await db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, is_active, display_name')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (memberError) {
    throw createError({ statusCode: 500, message: memberError.message })
  }

  if (!member) {
    throw createError({ statusCode: 404, message: 'Member record not found' })
  }

  if (member.is_active === false) {
    throw createError({ statusCode: 403, message: 'Akun Anda telah dinonaktifkan. Hubungi pemilik bisnis.' })
  }

  // Resolve businessSlug from scope
  let businessSlug: string

  if (member.scope_type === 'business') {
    const { data: business, error: bizError } = await db
      .from('businesses')
      .select('slug')
      .eq('id', member.scope_id)
      .single()

    if (bizError || !business) {
      throw createError({ statusCode: 500, message: 'Cannot resolve business slug' })
    }

    businessSlug = business.slug
  } else {
    // scope_type === 'branch' — look up the branch's business_id, then get the slug
    const { data: branch, error: branchError } = await db
      .from('branches')
      .select('business_id')
      .eq('id', member.scope_id)
      .single()

    if (branchError || !branch) {
      throw createError({ statusCode: 500, message: 'Cannot resolve branch for this member' })
    }

    const { data: business, error: bizError } = await db
      .from('businesses')
      .select('slug')
      .eq('id', branch.business_id)
      .single()

    if (bizError || !business) {
      throw createError({ statusCode: 500, message: 'Cannot resolve business slug from branch' })
    }

    businessSlug = business.slug
  }

  return { ...member, businessSlug }
})
