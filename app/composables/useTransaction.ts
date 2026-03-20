export function useTransaction() {
  const { activeBusinessId } = useBusiness()

  // Transaction listing state
  const page = ref(1)
  const limit = ref(20)
  const typeFilter = ref<string | undefined>(undefined)
  const branchFilter = ref<string | undefined>(undefined)
  const programFilter = ref<string | undefined>(undefined)

  const { data: txData, refresh: refreshTransactions, status } = useFetch('/api/transactions', {
    query: computed(() => ({
      business_id: activeBusinessId.value,
      page: page.value,
      limit: limit.value,
      type: typeFilter.value,
      branch_id: branchFilter.value,
      program_id: programFilter.value,
    })),
    watch: [activeBusinessId, page, typeFilter, branchFilter, programFilter],
  })

  const transactions = computed(() => txData.value?.data ?? [])
  const total = computed(() => txData.value?.total ?? 0)

  // Stamp operations
  async function addStamps(data: { customer_program_id: string; branch_id: string; transaction_amount?: number; stamps_count?: number; notes?: string }) {
    return await $fetch('/api/transactions/stamp', { method: 'POST', body: data })
  }

  async function redeemStamps(data: { customer_program_id: string; branch_id: string; notes?: string }) {
    return await $fetch('/api/transactions/redeem-stamps', { method: 'POST', body: data })
  }

  // Cashback operations
  async function recordCashback(data: { customer_program_id: string; branch_id: string; transaction_amount: number; notes?: string }) {
    return await $fetch('/api/transactions/cashback', { method: 'POST', body: data })
  }

  async function redeemCashback(data: { customer_program_id: string; branch_id: string; amount: number; notes?: string }) {
    return await $fetch('/api/transactions/redeem-cashback', { method: 'POST', body: data })
  }

  // Tier operations
  async function upgradeTier(data: { customer_program_id: string; target_tier_id: string; notes?: string }) {
    return await $fetch('/api/transactions/upgrade-tier', { method: 'POST', body: data })
  }

  // QR verify (used by cashier mode)
  async function verifyQr(token: string, customerProgramId: string) {
    return await $fetch('/api/qr/verify', { method: 'POST', body: { token, customer_program_id: customerProgramId } })
  }

  return {
    // Listing
    transactions,
    total,
    page,
    limit,
    typeFilter,
    branchFilter,
    programFilter,
    loading: computed(() => status.value === 'pending'),
    refreshTransactions,
    // Actions
    addStamps,
    redeemStamps,
    recordCashback,
    redeemCashback,
    upgradeTier,
    verifyQr,
  }
}
