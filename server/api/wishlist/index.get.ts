export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const db = getServiceClient(event)

  const { data: submissions, error, count } = await db
    .from('wishlist_submissions')
    .select('id, name, email, company, industry, message, created_at', { count: 'exact', head: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal memuat data wishlist.' })
  }

  return { data: submissions ?? [], total: count ?? 0 }
})
