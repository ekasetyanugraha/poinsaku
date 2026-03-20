import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = z
    .object({
      token: z.string().min(1),
      customer_program_id: z.string().uuid(),
    })
    .safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const db = getServiceClient(event)

  // Find the token
  const { data: qrToken } = await db
    .from('qr_tokens')
    .select('*')
    .eq('token', parsed.data.token)
    .eq('customer_program_id', parsed.data.customer_program_id)
    .single()

  if (!qrToken) {
    throw createError({ statusCode: 400, message: 'Invalid QR code' })
  }

  if (new Date(qrToken.expires_at) < new Date()) {
    throw createError({ statusCode: 400, message: 'QR code has expired' })
  }

  if (qrToken.is_used === true) {
    throw createError({ statusCode: 400, message: 'QR code has already been used' })
  }

  // Mark as used
  await db.from('qr_tokens').update({ is_used: true }).eq('id', qrToken.id)

  // Fetch customer program with program details and customer info
  const { data: customerProgram } = await db
    .from('customer_programs')
    .select(`
      *,
      customers!inner(id, name, phone),
      programs!inner(id, name, type, business_id)
    `)
    .eq('id', parsed.data.customer_program_id)
    .single()

  if (!customerProgram) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  // Require cashier+ membership for the business that owns this program
  await requireMember(event, customerProgram.programs.business_id)

  // Fetch program-type-specific state
  let state: Record<string, unknown> | null = null

  if (customerProgram.programs.type === 'stamp') {
    const { data: stampProgress } = await db
      .from('customer_stamp_progress')
      .select('*')
      .eq('customer_program_id', parsed.data.customer_program_id)
      .single()
    state = stampProgress
  } else if (customerProgram.programs.type === 'membership') {
    const { data: membershipState } = await db
      .from('customer_membership_state')
      .select(`
        *,
        membership_tiers(*)
      `)
      .eq('customer_program_id', parsed.data.customer_program_id)
      .single()
    state = membershipState
  }

  return {
    verified: true,
    customer_program: customerProgram,
    state,
  }
})
