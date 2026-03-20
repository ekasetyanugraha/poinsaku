export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Branch ID is required' })
  }

  const db = getServiceClient(event)

  const { data: branch, error } = await db
    .from('branches')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !branch) {
    throw createError({ statusCode: 404, message: 'Branch not found' })
  }

  await requireMember(event, branch.business_id)

  return branch
})
