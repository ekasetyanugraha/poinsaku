export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const programId = query.program_id as string
  if (!programId) {
    throw createError({ statusCode: 400, message: 'program_id is required' })
  }

  const db = getServiceClient(event)

  // Fetch the program to resolve business_id and validate type
  const { data: program, error: programError } = await db
    .from('programs')
    .select('id, business_id, type')
    .eq('id', programId)
    .single()

  if (programError || !program) {
    throw createError({ statusCode: 404, message: 'Program not found' })
  }

  if (program.type !== 'membership') {
    throw createError({ statusCode: 400, message: 'Program is not a membership program' })
  }

  const isPublic = query.public === 'true'

  if (!isPublic) {
    await requireMember(event, program.business_id)
  }

  let qb = db
    .from('membership_voucher_options')
    .select('*')
    .eq('program_id', programId)
    .order('created_at', { ascending: true })

  if (isPublic) {
    qb = qb.eq('is_active', true)
  }

  const { data: options, error } = await qb

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return options ?? []
})
