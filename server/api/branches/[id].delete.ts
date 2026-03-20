export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Branch ID is required' })
  }

  const db = getServiceClient(event)

  // Fetch branch first to resolve business_id
  const { data: existing, error: fetchError } = await db
    .from('branches')
    .select('id, business_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw createError({ statusCode: 404, message: 'Branch not found' })
  }

  await requireOwner(event, existing.business_id)

  // Check if branch has customer_programs or transactions
  const { count: customerProgramCount } = await db
    .from('customer_programs')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', id)

  const { count: transactionCount } = await db
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', id)

  const hasData = (customerProgramCount ?? 0) > 0 || (transactionCount ?? 0) > 0

  if (hasData) {
    // Soft-delete: set is_active = false
    const { error } = await db
      .from('branches')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return { deactivated: true }
  }

  // Hard delete
  const { error } = await db
    .from('branches')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { deleted: true }
})
