export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Program ID is required' })

  const db = getServiceClient(event)

  // Fetch program to verify it exists and get business_id
  const { data: program, error: programError } = await db
    .from('programs')
    .select('id, business_id')
    .eq('id', id)
    .single()

  if (programError || !program) {
    throw createError({ statusCode: 404, message: 'Program not found' })
  }

  // Require owner
  await requireOwner(event, program.business_id)

  // Check for customer enrollments
  const { count, error: countError } = await db
    .from('customer_programs')
    .select('*', { count: 'exact', head: true })
    .eq('program_id', id)

  if (countError) throw createError({ statusCode: 500, message: countError.message })

  if ((count ?? 0) > 0) {
    // Soft-delete: deactivate the program
    const { error: deactivateError } = await db
      .from('programs')
      .update({ is_active: false })
      .eq('id', id)

    if (deactivateError) throw createError({ statusCode: 500, message: deactivateError.message })

    return { deactivated: true }
  } else {
    // Hard delete: CASCADE removes extension rows
    const { error: deleteError } = await db
      .from('programs')
      .delete()
      .eq('id', id)

    if (deleteError) throw createError({ statusCode: 500, message: deleteError.message })

    return { deleted: true }
  }
})
