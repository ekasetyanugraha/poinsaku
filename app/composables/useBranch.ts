export function useBranch() {
  const { activeBusinessId } = useBusiness()

  const { data: branchesData, refresh, status } = useFetch('/api/branches', {
    query: computed(() => ({ business_id: activeBusinessId.value })),
    watch: [activeBusinessId],
  })

  const branches = computed(() => (branchesData.value as any)?.data ?? [])

  async function createBranch(data: { name: string; slug: string; business_id: string; phone?: string; email?: string; address?: string; latitude?: number; longitude?: number }) {
    const result = await $fetch('/api/branches', { method: 'POST', body: data })
    await refresh()
    return result
  }

  async function updateBranch(id: string, data: Record<string, unknown>) {
    const result = await $fetch(`/api/branches/${id}`, { method: 'PUT', body: data })
    await refresh()
    return result
  }

  async function deleteBranch(id: string) {
    await $fetch(`/api/branches/${id}`, { method: 'DELETE' })
    await refresh()
  }

  return { branches, loading: computed(() => status.value === 'pending'), createBranch, updateBranch, deleteBranch, refresh }
}
