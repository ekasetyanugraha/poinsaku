export function useBusiness() {
  const route = useRoute()
  const businessSlug = computed(() => route.params.businessSlug as string | undefined)

  const { data: businesses, refresh: refreshBusinesses, status } = useFetch('/api/businesses')

  const activeBusiness = computed(() =>
    (businesses.value as any[])?.find((b: any) => b.slug === businessSlug.value) ?? null
  )

  const activeBusinessId = computed(() => activeBusiness.value?.id ?? null)

  async function createBusiness(data: { name: string; slug: string; phone?: string; email?: string; address?: string }) {
    const result = await $fetch('/api/businesses', { method: 'POST', body: data })
    await refreshBusinesses()
    return result
  }

  async function updateBusiness(id: string, data: Record<string, unknown>) {
    const result = await $fetch(`/api/businesses/${id}`, { method: 'PUT', body: data })
    await refreshBusinesses()
    return result
  }

  return {
    businesses: computed(() => (businesses.value as any[]) ?? []),
    activeBusiness,
    activeBusinessId,
    businessSlug,
    loading: computed(() => status.value === 'pending'),
    createBusiness,
    updateBusiness,
    refreshBusinesses,
  }
}
