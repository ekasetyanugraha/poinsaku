import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Program ID is required' })

  const db = getServiceClient(event)

  // Fetch program to verify it exists and get business_id + type
  const { data: program, error: programError } = await db
    .from('programs')
    .select('id, business_id, type')
    .eq('id', id)
    .single()

  if (programError || !program) {
    throw createError({ statusCode: 404, message: 'Program not found' })
  }

  // Require owner or admin
  await requireMember(event, program.business_id, { roles: ['owner', 'admin'] })

  const body = await readBody(event)

  // Partial update for base fields, cannot change business_id or type
  const baseUpdate = programBaseSchema
    .partial()
    .omit({ business_id: true, type: true })
    .parse(body)

  // Update base program if there are base fields to update
  if (Object.keys(baseUpdate).length > 0) {
    const { error: updateError } = await db
      .from('programs')
      .update(baseUpdate)
      .eq('id', id)

    if (updateError) throw createError({ statusCode: 500, message: updateError.message })
  }

  if (program.type === 'stamp') {
    // Update stamp config if provided
    if (body.stamp_config !== undefined) {
      const config = stampConfigSchema.partial().parse(body.stamp_config)
      const { error: configError } = await db
        .from('program_stamp_config')
        .update(config)
        .eq('program_id', id)

      if (configError) throw createError({ statusCode: 500, message: configError.message })
    }
  } else {
    // membership program

    // Update membership config if provided
    if (body.membership_config !== undefined) {
      const config = membershipConfigSchema.partial().parse(body.membership_config)
      const { error: configError } = await db
        .from('program_membership_config')
        .update(config)
        .eq('program_id', id)

      if (configError) throw createError({ statusCode: 500, message: configError.message })
    }

    // Handle tiers array if provided
    if (body.tiers !== undefined) {
      const tiersInput = z.array(
        tierSchema.extend({ id: z.string().uuid().optional() }),
      ).min(1).parse(body.tiers)

      // Fetch current tier IDs
      const { data: existingTiers } = await db
        .from('membership_tiers')
        .select('id')
        .eq('program_id', id)

      const existingIds = new Set((existingTiers ?? []).map((t: { id: string }) => t.id))
      const incomingIds = new Set(
        tiersInput.filter(t => t.id).map(t => t.id as string),
      )

      // Tiers not in incoming array should be deleted — check no customers are on them first
      const toDeleteIds = [...existingIds].filter(eid => !incomingIds.has(eid))

      if (toDeleteIds.length > 0) {
        const { count } = await db
          .from('customer_membership_state')
          .select('*', { count: 'exact', head: true })
          .in('current_tier_id', toDeleteIds)

        if ((count ?? 0) > 0) {
          throw createError({
            statusCode: 409,
            message: 'Cannot delete tiers that have active customers assigned to them',
          })
        }

        const { error: deleteError } = await db
          .from('membership_tiers')
          .delete()
          .in('id', toDeleteIds)

        if (deleteError) throw createError({ statusCode: 500, message: deleteError.message })
      }

      // Update existing tiers (with id), insert new ones (without id)
      for (const tier of tiersInput) {
        const { id: tierId, ...tierData } = tier
        if (tierId) {
          const { error: updateError } = await db
            .from('membership_tiers')
            .update(tierData)
            .eq('id', tierId)
            .eq('program_id', id)

          if (updateError) throw createError({ statusCode: 500, message: updateError.message })
        } else {
          const { error: insertError } = await db
            .from('membership_tiers')
            .insert({ ...tierData, program_id: id })

          if (insertError) throw createError({ statusCode: 500, message: insertError.message })
        }
      }
    }

    // Handle voucher_options array if provided
    if (body.voucher_options !== undefined) {
      const optionsInput = z.array(
        voucherOptionSchema.extend({ id: z.string().uuid().optional() }),
      ).parse(body.voucher_options)

      // Fetch current active option IDs
      const { data: existingOptions } = await db
        .from('membership_voucher_options')
        .select('id')
        .eq('program_id', id)

      const existingIds = new Set((existingOptions ?? []).map((o: { id: string }) => o.id))
      const incomingIds = new Set(
        optionsInput.filter(o => o.id).map(o => o.id as string),
      )

      // Options not in incoming array: soft-delete (set is_active = false)
      const toDeactivateIds = [...existingIds].filter(eid => !incomingIds.has(eid))

      if (toDeactivateIds.length > 0) {
        const { error: deactivateError } = await db
          .from('membership_voucher_options')
          .update({ is_active: false })
          .in('id', toDeactivateIds)

        if (deactivateError) throw createError({ statusCode: 500, message: deactivateError.message })
      }

      // Update existing options (with id), insert new ones (without id)
      for (const option of optionsInput) {
        const { id: optionId, ...optionData } = option
        if (optionId) {
          const { error: updateError } = await db
            .from('membership_voucher_options')
            .update(optionData)
            .eq('id', optionId)
            .eq('program_id', id)

          if (updateError) throw createError({ statusCode: 500, message: updateError.message })
        } else {
          const { error: insertError } = await db
            .from('membership_voucher_options')
            .insert({ ...optionData, program_id: id })

          if (insertError) throw createError({ statusCode: 500, message: insertError.message })
        }
      }
    }
  }

  // Return updated program with extension data
  if (program.type === 'stamp') {
    const { data, error } = await db
      .from('programs')
      .select(`*, program_stamp_config (*)`)
      .eq('id', id)
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })
    return data
  } else {
    const { data, error } = await db
      .from('programs')
      .select(`
        *,
        program_membership_config (*),
        membership_tiers ( * ),
        membership_voucher_options ( * )
      `)
      .eq('id', id)
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })

    return {
      ...data,
      membership_tiers: (data?.membership_tiers ?? []).sort(
        (a: { rank: number }, b: { rank: number }) => a.rank - b.rank,
      ),
      membership_voucher_options: (data?.membership_voucher_options ?? []).filter(
        (v: { is_active: boolean }) => v.is_active,
      ),
    }
  }
})
