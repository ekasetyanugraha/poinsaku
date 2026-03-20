export function useMember() {
  const { activeBusinessId } = useBusiness()

  const { data: membersData, refresh, status } = useFetch('/api/members', {
    query: computed(() => ({ business_id: activeBusinessId.value })),
    watch: [activeBusinessId],
  })

  const members = computed(() => membersData.value?.data ?? [])

  async function inviteMember(data: {
    auth_user_id: string
    role: 'admin' | 'cashier'
    scope_type: 'business' | 'branch'
    scope_id: string
  }) {
    const result = await $fetch('/api/members', {
      method: 'POST',
      body: { ...data, business_id: activeBusinessId.value },
    })
    await refresh()
    return result
  }

  async function updateMember(id: string, data: { role?: string; scope_type?: string; scope_id?: string }) {
    const result = await $fetch(`/api/members/${id}`, {
      method: 'PUT',
      body: { ...data, business_id: activeBusinessId.value },
    })
    await refresh()
    return result
  }

  async function removeMember(id: string) {
    await $fetch(`/api/members/${id}`, {
      method: 'DELETE',
      query: { business_id: activeBusinessId.value },
    })
    await refresh()
  }

  return {
    members,
    loading: computed(() => status.value === 'pending'),
    inviteMember,
    updateMember,
    removeMember,
    refresh,
  }
}
