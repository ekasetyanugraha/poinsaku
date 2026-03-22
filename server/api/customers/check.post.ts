import { z } from 'zod'

const checkSchema = z.object({
  phone: z.string().regex(/^(?:\+62|62|0)[2-9]\d{7,11}$/),
  program_id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = checkSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)
  const phone = normalizePhone(parsed.data.phone)

  // 1. Verify program exists and is active
  const { data: program, error: programError } = await db
    .from('programs')
    .select('id, is_active, scope_type, scope_id')
    .eq('id', parsed.data.program_id)
    .single()

  if (programError || !program) {
    throw createError({ statusCode: 404, message: 'Program not found' })
  }
  if (!program.is_active) {
    throw createError({ statusCode: 400, message: 'Program is not active' })
  }

  // 2. Look up customer by phone
  const { data: customer } = await db
    .from('customers')
    .select('id, name, email, gender')
    .eq('phone', phone)
    .single()

  if (!customer) {
    return { found: false, enrolled: false }
  }

  // 3. Check if customer is enrolled in this program
  const branchId = program.scope_type === 'branch' ? program.scope_id : null

  let enrollmentQuery = db
    .from('customer_programs')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('program_id', parsed.data.program_id)

  if (branchId === null) {
    enrollmentQuery = enrollmentQuery.is('branch_id', null)
  } else {
    enrollmentQuery = enrollmentQuery.eq('branch_id', branchId)
  }

  const { data: enrollment } = await enrollmentQuery.single()

  if (enrollment) {
    return {
      found: true,
      enrolled: true,
      customer_program_id: enrollment.id,
    }
  }

  return {
    found: true,
    enrolled: false,
    customer: {
      name: customer.name,
      email: customer.email,
      gender: customer.gender,
    },
  }
})
