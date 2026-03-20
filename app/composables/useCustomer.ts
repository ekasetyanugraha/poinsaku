export function useCustomer() {
  const { activeBusinessId } = useBusiness()

  const page = ref(1)
  const limit = ref(20)
  const search = ref('')

  const { data: customerData, refresh, status } = useFetch('/api/customers', {
    query: computed(() => ({
      business_id: activeBusinessId.value,
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
    })),
    watch: [activeBusinessId, page, search],
  })

  const customers = computed(() => customerData.value?.data ?? [])
  const total = computed(() => customerData.value?.total ?? 0)

  async function registerCustomer(data: { phone: string; name: string; email?: string; gender?: string; program_id: string }) {
    const result = await $fetch('/api/customers/register', { method: 'POST', body: data })
    await refresh()
    return result
  }

  async function fetchCustomer(id: string) {
    return await $fetch(`/api/customers/${id}`, { query: { business_id: activeBusinessId.value } })
  }

  return {
    customers,
    total,
    page,
    limit,
    search,
    loading: computed(() => status.value === 'pending'),
    registerCustomer,
    fetchCustomer,
    refresh,
  }
}
