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
        id, name, type, color_primary,
        businesses!inner(id, name, slug, logo_url)
      )
    `)
    .eq('id', customerProgramId)
    .single()

  if (!enrollment) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  const program = enrollment.programs as {
    id: string; name: string; type: string; color_primary: string
    businesses: { id: string; name: string; slug: string; logo_url: string | null }
  }
  const customer = enrollment.customers as { id: string; name: string; phone: string }
  const business = program.businesses

  // Build type-aware loyalty object
  let loyaltyPoints: Record<string, unknown>
  if (program.type === 'stamp') {
    const { data: progress } = await db
      .from('customer_stamp_progress')
      .select('current_stamps')
      .eq('customer_program_id', customerProgramId)
      .single()
    loyaltyPoints = {
      label: 'Stamps',
      balance: { int: progress?.current_stamps ?? 0 },
    }
  } else {
    const { data: state } = await db
      .from('customer_membership_state')
      .select('cashback_balance, membership_tiers!customer_membership_state_current_tier_id_fkey(name)')
      .eq('customer_program_id', customerProgramId)
      .single()
    const tierName = (state?.membership_tiers as { name: string } | null)?.name ?? 'Member'
    loyaltyPoints = {
      label: `${tierName} · Cashback`,
      balance: { money: { micros: Math.round((state?.cashback_balance ?? 0) * 1_000_000), currencyCode: 'IDR' } },
    }
  }

  const loyaltyObject = {
    id: `${config.googleWalletIssuerId}.${customerProgramId}`,
    classId: `${config.googleWalletIssuerId}.${program.id}`,
    state: 'ACTIVE',
    accountId: customer.phone,
    accountName: customer.name,
    loyaltyPoints,
    barcode: {
      type: 'QR_CODE',
      value: `${config.public.appUrl}/card/${customerProgramId}`,
    },
    heroImage: {
      sourceUri: {
        uri: business.logo_url || `${config.public.appUrl}/images/stamp-hero.png`,
      },
    },
  }

  const loyaltyClass = {
    id: `${config.googleWalletIssuerId}.${program.id}`,
    issuerName: business.name,
    programName: program.name,
    programLogo: {
      sourceUri: {
        uri: business.logo_url || `${config.public.appUrl}/images/logo.png`,
      },
    },
    hexBackgroundColor: program.color_primary,
    reviewStatus: 'UNDER_REVIEW',
  }

  const claims = {
    iss: config.googleServiceAccountEmail,
    aud: 'google',
    origins: [config.public.appUrl],
    typ: 'savetowallet',
    payload: {
      loyaltyClasses: [loyaltyClass],
      loyaltyObjects: [loyaltyObject],
    },
  }

  const token = jwt.sign(claims, config.googleServiceAccountPrivateKey, { algorithm: 'RS256' })

  // Record the wallet pass
  await db.from('wallet_passes').upsert({
    customer_program_id: customerProgramId,
    provider: 'google',
    pass_identifier: loyaltyObject.id,
  }, { onConflict: 'customer_program_id,provider' })

  return {
    saveUrl: `https://pay.google.com/gp/v/save/${token}`,
  }
})
