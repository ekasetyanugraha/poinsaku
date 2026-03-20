export function useAuth() {
  const user = useSupabaseUser()

  const { data: currentMember, refresh: refreshMember, status } = useFetch('/api/staff/me', {
    immediate: false,
  })

  // Auto-fetch when user is available
  watch(user, (u) => {
    if (u) refreshMember()
  }, { immediate: true })

  const role = computed(() => (currentMember.value as any)?.role ?? null)
  const scopeType = computed(() => (currentMember.value as any)?.scope_type ?? null)
  const isAuthenticated = computed(() => !!user.value)

  return { user, currentMember, role, scopeType, isAuthenticated, refreshMember, loading: computed(() => status.value === 'pending') }
}
