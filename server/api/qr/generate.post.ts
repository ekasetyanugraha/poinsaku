import { z } from 'zod'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = z.object({ customer_program_id: z.string().uuid() }).safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const { customer_program_id: customerProgramId } = parsed.data
  const db = getServiceClient(event)

  // Verify customer_program exists and is active
  const { data: customerProgram } = await db
    .from('customer_programs')
    .select('id, is_active')
    .eq('id', customerProgramId)
    .single()

  if (!customerProgram) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  if (!customerProgram.is_active) {
    throw createError({ statusCode: 400, message: 'Customer program is not active' })
  }

  // Generate a cryptographically random token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 1000) // 60 seconds

  // Invalidate previous unused tokens for this customer program
  await db
    .from('qr_tokens')
    .update({ is_used: true })
    .eq('customer_program_id', customerProgramId)
    .eq('is_used', false)

  // Insert new token
  const { error } = await db.from('qr_tokens').insert({
    customer_program_id: customerProgramId,
    token,
    expires_at: expiresAt.toISOString(),
  })

  if (error) throw createError({ statusCode: 500, message: 'Failed to generate QR token' })

  return {
    token,
    customer_program_id: customerProgramId,
    expires_at: expiresAt.toISOString(),
  }
})
