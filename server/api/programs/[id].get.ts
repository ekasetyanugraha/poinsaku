export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Program ID is required' })

  const db = getServiceClient(event)

  // Fetch the base program first to resolve business_id for auth check
  const { data: program, error: programError } = await db
    .from('programs')
    .select('*')
    .eq('id', id)
    .single()

  if (programError || !program) {
    throw createError({ statusCode: 404, message: 'Program not found' })
  }

  // Require membership in the program's business
  await requireMember(event, program.business_id)

  // Fetch full detail based on type
  if (program.type === 'stamp') {
    const { data, error } = await db
      .from('programs')
      .select(`
        *,
        program_stamp_config (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })
    return data
  } else {
    const { data, error } = await db
      .from('programs')
      .select(`
        *,
        program_membership_config (*),
        membership_tiers ( * ),
        membership_voucher_options ( * )
      `)
      .eq('id', id)
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })

    if (!data) throw createError({ statusCode: 404, message: 'Program not found' })

    // Sort tiers by rank ASC, filter voucher_options to is_active only
    return {
      ...data,
      membership_tiers: (data.membership_tiers ?? []).sort(
        (a: { rank: number }, b: { rank: number }) => a.rank - b.rank,
      ),
      membership_voucher_options: (data.membership_voucher_options ?? []).filter(
        (v: { is_active: boolean }) => v.is_active,
      ),
    }
  }
})
