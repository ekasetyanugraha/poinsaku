import jwt from 'jsonwebtoken'
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
        id, name, type,
        businesses!inner(id, name)
      )
    `)
    .eq('id', customerProgramId)
    .single()

  if (!enrollment) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  const program = enrollment.programs as {
    id: string; name: string; type: string
    businesses: { id: string; name: string }
  }
  const customer = enrollment.customers as { id: string; name: string; phone: string }

  // Build type-aware card data
  const dataFields: { key: string; value: string }[] = [
    { key: 'programName', value: program.name },
    { key: 'memberName', value: customer.name },
  ]

  if (program.type === 'stamp') {
    const { data: progress } = await db
      .from('customer_stamp_progress')
      .select('current_stamps')
      .eq('customer_program_id', customerProgramId)
      .single()
    const { data: stampConfig } = await db
      .from('program_stamp_config')
      .select('stamp_target')
      .eq('program_id', program.id)
      .single()
    dataFields.push(
      { key: 'stamps', value: String(progress?.current_stamps ?? 0) },
      { key: 'target', value: String(stampConfig?.stamp_target ?? 0) },
    )
  } else {
    const { data: state } = await db
      .from('customer_membership_state')
      .select('cashback_balance, membership_tiers!customer_membership_state_current_tier_id_fkey(name)')
      .eq('customer_program_id', customerProgramId)
      .single()
    const tierName = (state?.membership_tiers as { name: string } | null)?.name ?? 'Member'
    dataFields.push(
      { key: 'tier', value: tierName },
      { key: 'cashback', value: `Rp ${(state?.cashback_balance ?? 0).toLocaleString('id-ID')}` },
    )
  }

  const cardData = {
    card: {
      type: 'loyalty',
      data: dataFields,
    },
  }

  // Record wallet pass
  await db.from('wallet_passes').upsert({
    customer_program_id: customerProgramId,
    provider: 'samsung',
    pass_identifier: customerProgramId,
  }, { onConflict: 'customer_program_id,provider' })

  if (!config.samsungPrivateKey) {
    return {
      message: 'Samsung Wallet integration requires Samsung Partner Portal registration. Please configure SAMSUNG_* environment variables.',
    }
  }

  const token = jwt.sign(cardData, config.samsungPrivateKey, { algorithm: 'RS256' })

  return {
    saveUrl: `https://a.swallet.link/atw/v1/${config.samsungPartnerId}/${config.samsungCardId}?data=${token}`,
  }
})
