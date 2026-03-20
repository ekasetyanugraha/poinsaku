export function useProgram() {
  const { activeBusinessId } = useBusiness()

  const { data: programsData, refresh, status } = useFetch('/api/programs', {
    query: computed(() => ({ business_id: activeBusinessId.value })),
    watch: [activeBusinessId],
  })

  const programs = computed(() => programsData.value ?? [])

  async function createProgram(data: {
    business_id: string
    type: 'stamp' | 'membership'
    name: string
    description?: string
    scope_type: 'business' | 'branch'
    scope_id: string
    color_primary?: string
    color_secondary?: string
    stamp_config?: Record<string, unknown>
    membership_config?: Record<string, unknown>
    tiers?: Array<Record<string, unknown>>
  }) {
    const result = await $fetch('/api/programs', { method: 'POST', body: data })
    await refresh()
    return result
  }

  async function updateProgram(id: string, data: Record<string, unknown>) {
    const result = await $fetch(`/api/programs/${id}`, { method: 'PUT', body: data })
    await refresh()
    return result
  }

  async function deleteProgram(id: string) {
    await $fetch(`/api/programs/${id}`, { method: 'DELETE' })
    await refresh()
  }

  async function fetchProgram(id: string) {
    return await $fetch(`/api/programs/${id}`)
  }

  return {
    programs,
    loading: computed(() => status.value === 'pending'),
    createProgram,
    updateProgram,
    deleteProgram,
    fetchProgram,
    refresh,
  }
}
