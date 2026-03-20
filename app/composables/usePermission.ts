export function usePermission() {
  const { role, scopeType } = useAuth()

  const isOwner = computed(() => role.value === 'owner')
  const isAdmin = computed(() => role.value === 'admin')
  const isCashier = computed(() => role.value === 'cashier')

  const canDelete = computed(() => role.value === 'owner')
  const canManageMembers = computed(() =>
    role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business')
  )
  const canManageSettings = computed(() =>
    role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business')
  )
  const canManagePrograms = computed(() =>
    role.value === 'owner' || role.value === 'admin'
  )
  const canViewTransactions = computed(() => !!role.value)

  return { isOwner, isAdmin, isCashier, canDelete, canManageMembers, canManageSettings, canManagePrograms, canViewTransactions }
}
