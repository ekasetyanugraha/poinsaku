export default defineEventHandler(async (event) => {
  // 1. Authenticate user
  const user = await requireUser(event)
  const db = getServiceClient(event)

  // 2. Validate query params
  const query = getQuery(event)
  const parsed = customerLookupSchema.safeParse({ phone: query.phone })
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Format nomor telepon tidak valid' })
  }

  // 3. Resolve member and derive businessId from session (NOT from client)
  // Pattern from server/api/staff/me.get.ts
  const { data: member, error: memberError } = await db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, is_active, display_name')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (memberError) {
    throw createError({ statusCode: 500, message: memberError.message })
  }
  if (!member) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  if (!member.is_active) {
    throw createError({ statusCode: 403, message: 'Akun Anda telah dinonaktifkan. Hubungi pemilik bisnis.' })
  }

  let businessId: string
  let cashierBranchId: string | null = null

  if (member.scope_type === 'business') {
    businessId = member.scope_id as string
  } else {
    // branch-scoped: resolve business_id from branches table
    cashierBranchId = member.scope_id as string
    const { data: branch, error: branchError } = await db
      .from('branches')
      .select('business_id')
      .eq('id', member.scope_id)
      .single()

    if (branchError || !branch) {
      throw createError({ statusCode: 500, message: 'Cannot resolve business' })
    }
    businessId = branch.business_id
  }

  // 4. Normalize phone and find customer
  const normalizedPhone = normalizePhone(parsed.data.phone)

  const { data: customer, error: custError } = await db
    .from('customers')
    .select('id, name, phone')
    .eq('phone', normalizedPhone)
    .maybeSingle()

  if (custError) {
    throw createError({ statusCode: 500, message: custError.message })
  }
  if (!customer) {
    throw createError({ statusCode: 404, message: 'Pelanggan tidak ditemukan' })
  }

  // 5. Find active stamp programs for this customer at this business
  // Filter: customer_programs.is_active = true AND programs.type = 'stamp' AND programs.business_id = businessId AND programs.is_active = true
  const { data: customerPrograms, error: cpError } = await db
    .from('customer_programs')
    .select(`
      id, customer_id, program_id, branch_id, is_active, enrolled_at,
      programs!inner (id, name, type, business_id, is_active)
    `)
    .eq('customer_id', customer.id)
    .eq('is_active', true)
    .eq('programs.business_id', businessId)
    .eq('programs.type', 'stamp')
    .eq('programs.is_active', true)

  if (cpError) {
    throw createError({ statusCode: 500, message: cpError.message })
  }

  if (!customerPrograms || customerPrograms.length === 0) {
    throw createError({ statusCode: 404, message: 'Pelanggan tidak memiliki program stempel aktif' })
  }

  // 6. For each customer program, fetch stamp progress and stamp config
  const programs = await Promise.all(
    customerPrograms.map(async (cp) => {
      const programId = (cp.programs as any).id as string

      // Fetch stamp progress
      const { data: stampProgress } = await db
        .from('customer_stamp_progress')
        .select('current_stamps, total_stamps_earned, total_redemptions, updated_at')
        .eq('customer_program_id', cp.id)
        .maybeSingle()

      // Fetch stamp config
      const { data: stampConfig } = await db
        .from('program_stamp_config')
        .select('stamp_mode, amount_per_stamp, stamps_per_transaction, stamp_target')
        .eq('program_id', programId)
        .maybeSingle()

      return {
        customer_program: {
          ...cp,
          customers: customer,
        },
        state: stampProgress || null,
        stamp_config: stampConfig || null,
      }
    }),
  )

  // 7. Return response
  // Returns programs array always (even for single program) — client handles auto-select logic
  // Each program entry shaped with customer_program + state + stamp_config to enable direct assignment to verifiedData
  return {
    customer,
    programs,
    cashier_branch_id: cashierBranchId,
  }
})
