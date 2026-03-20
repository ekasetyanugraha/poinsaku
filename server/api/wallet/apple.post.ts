import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = z.object({ customer_program_id: z.string().uuid() }).safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'customer_program_id required' })
  }

  const { customer_program_id: customerProgramId } = parsed.data
  const config = useRuntimeConfig()
  const db = getServiceClient(event)

  // Fetch enrollment with program + business details
  const { data: enrollment } = await db
    .from('customer_programs')
    .select(`
      *,
      customers!inner(id, name, phone),
      programs!inner(
        id, name, type, color_primary, color_secondary,
        businesses!inner(id, name, slug, logo_url)
      )
    `)
    .eq('id', customerProgramId)
    .single()

  if (!enrollment) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  const program = enrollment.programs as {
    id: string; name: string; type: string
    color_primary: string; color_secondary: string
    businesses: { id: string; name: string; slug: string; logo_url: string | null }
  }
  const customer = enrollment.customers as { id: string; name: string; phone: string }
  const business = program.businesses

  // Build type-specific pass description
  let description = `${business.name} - ${program.name}`
  if (program.type === 'stamp') {
    const { data: progress } = await db
      .from('customer_stamp_progress')
      .select('current_stamps')
      .eq('customer_program_id', customerProgramId)
      .single()
    const stamps = progress?.current_stamps ?? 0
    description = `${program.name}: ${stamps} stamps`
  } else {
    const { data: state } = await db
      .from('customer_membership_state')
      .select('cashback_balance, membership_tiers!customer_membership_state_current_tier_id_fkey(name)')
      .eq('customer_program_id', customerProgramId)
      .single()
    const tierName = (state?.membership_tiers as { name: string } | null)?.name ?? 'Member'
    const balance = state?.cashback_balance ?? 0
    description = `${program.name}: ${tierName} · Rp ${balance.toLocaleString('id-ID')}`
  }

  // Apple Wallet pass generation requires real certificates.
  // In production, use passkit-generator with real Apple Developer certificates.
  // TODO: Implement with passkit-generator when Apple Developer certificates are available

  // Record the wallet pass intent
  await db.from('wallet_passes').upsert({
    customer_program_id: customerProgramId,
    provider: 'apple',
    pass_identifier: customerProgramId,
  }, { onConflict: 'customer_program_id,provider' })

  return {
    message: 'Apple Wallet integration requires Apple Developer certificates. Please configure APPLE_* environment variables.',
    pass_description: description,
  }
})
