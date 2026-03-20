import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const base = programBaseSchema.parse(body)

  // Require owner or admin for the business
  await requireMember(event, base.business_id, { roles: ['owner', 'admin'] })

  const db = getServiceClient(event)

  // Insert base program
  const { data: program, error } = await db
    .from('programs')
    .insert(base)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  try {
    if (base.type === 'stamp') {
      const config = stampConfigSchema.parse(body.stamp_config)
      const { error: configError } = await db
        .from('program_stamp_config')
        .insert({ program_id: program.id, ...config })
      if (configError) throw new Error(configError.message)
    } else {
      const config = membershipConfigSchema.parse(body.membership_config)
      const tiers = z.array(tierSchema).min(1).parse(body.tiers)

      const { error: configError } = await db
        .from('program_membership_config')
        .insert({ program_id: program.id, ...config })
      if (configError) throw new Error(configError.message)

      // Insert tiers with program_id
      const { error: tiersError } = await db
        .from('membership_tiers')
        .insert(tiers.map(t => ({ ...t, program_id: program.id })))
      if (tiersError) throw new Error(tiersError.message)
    }
  } catch (e) {
    // Rollback: delete the program (CASCADE removes extension rows)
    await db.from('programs').delete().eq('id', program.id)
    if (e instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Invalid config', data: e.flatten() })
    }
    throw e
  }

  // Re-fetch to include extension data
  if (base.type === 'stamp') {
    const { data: full } = await db
      .from('programs')
      .select(`*, program_stamp_config(*)`)
      .eq('id', program.id)
      .single()
    return full
  } else {
    const { data: full } = await db
      .from('programs')
      .select(`*, program_membership_config(*), membership_tiers(*)`)
      .eq('id', program.id)
      .single()
    return full
  }
})
