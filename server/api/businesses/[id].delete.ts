export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Business ID is required' })
  }

  await requireOwner(event, id)

  const db = getServiceClient(event)

  // Check if business has branches or programs
  const { count: branchCount } = await db
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', id)

  const { count: programCount } = await db
    .from('programs')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', id)

  const hasChildren = (branchCount ?? 0) > 0 || (programCount ?? 0) > 0

  if (hasChildren) {
    // Soft-delete: set is_active = false
    const { error } = await db
      .from('businesses')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return { deactivated: true }
  }

  // Hard delete (CASCADE will remove members rows)
  const { error } = await db
    .from('businesses')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { deleted: true }
})
