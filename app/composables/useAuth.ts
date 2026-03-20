export function useAuth() {
  const user = useSupabaseUser()
  const { activeBusinessId } = useBusiness()

  const { data: currentMember, refresh: refreshMember, status } = useFetch('/api/members/me', {
    query: computed(() => ({ business_id: activeBusinessId.value })),
    watch: [activeBusinessId],
    immediate: false,
  })

  // Auto-fetch when we have both user and business context
  watch([user, activeBusinessId], ([u, bid]) => {
    if (u && bid) refreshMember()
  }, { immediate: true })

  const role = computed(() => (currentMember.value as any)?.role ?? null)
  const scopeType = computed(() => (currentMember.value as any)?.scope_type ?? null)
  const isAuthenticated = computed(() => !!user.value)

  return { user, currentMember, role, scopeType, isAuthenticated, refreshMember, loading: computed(() => status.value === 'pending') }
}
