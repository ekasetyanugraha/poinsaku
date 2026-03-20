import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export function relativeTime(isoString: string | null): string {
  if (!isoString) return 'Belum pernah login'
  return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: idLocale })
}

export function useStaff() {
  const { activeBusinessId } = useBusiness()

  const { data: staffData, refresh, status } = useFetch('/api/staff', {
    query: computed(() => ({ business_id: activeBusinessId.value })),
    watch: [activeBusinessId],
  })

  const staff = computed(() => (staffData.value as any)?.data ?? [])

  async function createStaff(data: {
    email: string
    password: string
    display_name?: string
    role: 'admin' | 'cashier'
    scope_type: 'business' | 'branch'
    scope_id: string
  }) {
    const result = await $fetch('/api/staff', {
      method: 'POST',
      body: { ...data, business_id: activeBusinessId.value },
    })
    await refresh()
    return result
  }

  async function resetPassword(id: string, password: string) {
    return $fetch(`/api/staff/${id}/password`, {
      method: 'PUT',
      body: { password },
    })
  }

  async function toggleStatus(id: string, action: 'deactivate' | 'reactivate') {
    const result = await $fetch(`/api/staff/${id}/status`, {
      method: 'PUT',
      body: { action },
    })
    await refresh()
    return result
  }

  async function reassignBranch(id: string, scope_type: string, scope_id: string) {
    const result = await $fetch(`/api/staff/${id}/branch`, {
      method: 'PUT',
      body: { scope_type, scope_id },
    })
    await refresh()
    return result
  }

  async function deleteStaff(id: string) {
    await $fetch(`/api/staff/${id}`, {
      method: 'DELETE',
      query: { business_id: activeBusinessId.value },
    })
    await refresh()
  }

  return {
    staff,
    loading: computed(() => status.value === 'pending'),
    refresh,
    createStaff,
    resetPassword,
    toggleStatus,
    reassignBranch,
    deleteStaff,
  }
}
