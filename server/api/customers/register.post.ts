export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = customerRegisterSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)
  const phone = normalizePhone(parsed.data.phone)

  // 1. Look up program, verify is_active
  const { data: program, error: programError } = await db
    .from('programs')
    .select('id, business_id, type, is_active, scope_type, scope_id')
    .eq('id', parsed.data.program_id)
    .single()

  if (programError || !program) {
    throw createError({ statusCode: 404, message: 'Program not found' })
  }
  if (!program.is_active) {
    throw createError({ statusCode: 400, message: 'Program is not active' })
  }

  // 2. Resolve customer: find existing by phone or create new
  const { data: existingCustomer } = await db
    .from('customers')
    .select('id')
    .eq('phone', phone)
    .single()

  let customerId: string

  if (existingCustomer) {
    customerId = existingCustomer.id
  } else {
    const { data: newCustomer, error: customerError } = await db
      .from('customers')
      .insert({
        phone,
        name: parsed.data.name,
        email: parsed.data.email,
        gender: parsed.data.gender,
      })
      .select('id')
      .single()

    if (customerError || !newCustomer) {
      throw createError({ statusCode: 500, message: 'Failed to create customer' })
    }
    customerId = newCustomer.id
  }

  // 3. Upsert customer_business_enrollment
  const { error: enrollError } = await db
    .from('customer_business_enrollments')
    .upsert(
      { customer_id: customerId, business_id: program.business_id },
      { onConflict: 'customer_id,business_id', ignoreDuplicates: true },
    )

  if (enrollError) {
    throw createError({ statusCode: 500, message: 'Failed to enroll customer in business' })
  }

  // 4. Determine branch_id for program enrollment
  const branchId = program.scope_type === 'branch' ? program.scope_id : null

  // 5. Check if already enrolled in this program (and branch)
  let duplicateQuery = db
    .from('customer_programs')
    .select('id')
    .eq('customer_id', customerId)
    .eq('program_id', parsed.data.program_id)

  if (branchId === null) {
    duplicateQuery = duplicateQuery.is('branch_id', null)
  } else {
    duplicateQuery = duplicateQuery.eq('branch_id', branchId)
  }

  const { data: existingEnrollment } = await duplicateQuery.single()

  if (existingEnrollment) {
    throw createError({ statusCode: 409, message: 'Customer already enrolled in this program' })
  }

  // 6. Create customer_programs enrollment
  const { data: customerProgram, error: cpError } = await db
    .from('customer_programs')
    .insert({
      customer_id: customerId,
      program_id: parsed.data.program_id,
      branch_id: branchId,
    })
    .select('id')
    .single()

  if (cpError || !customerProgram) {
    throw createError({ statusCode: 500, message: 'Failed to create program enrollment' })
  }

  // 7. Create extension record based on program type
  if (program.type === 'stamp') {
    const { error: stampError } = await db
      .from('customer_stamp_progress')
      .insert({ customer_program_id: customerProgram.id })

    if (stampError) {
      throw createError({ statusCode: 500, message: 'Failed to create stamp progress record' })
    }
  } else {
    // membership: find lowest-rank tier for this program
    const { data: tiers, error: tiersError } = await db
      .from('membership_tiers')
      .select('id')
      .eq('program_id', parsed.data.program_id)
      .order('rank', { ascending: true })
      .limit(1)

    if (tiersError || !tiers || tiers.length === 0) {
      throw createError({ statusCode: 500, message: 'No tiers found for membership program' })
    }

    const { error: stateError } = await db
      .from('customer_membership_state')
      .insert({
        customer_program_id: customerProgram.id,
        current_tier_id: tiers[0].id,
      })

    if (stateError) {
      throw createError({ statusCode: 500, message: 'Failed to create membership state record' })
    }
  }

  return {
    customer_id: customerId,
    customer_program_id: customerProgram.id,
  }
})
