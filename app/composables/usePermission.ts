export function usePermission() {
  const { role, scopeType } = useAuth()

  const isSuperAdmin = computed(() => role.value === 'superadmin')
  const isOwner = computed(() => role.value === 'owner')
  const isAdmin = computed(() => role.value === 'admin')
  const isCashier = computed(() => role.value === 'cashier')

  const canDelete = computed(() => role.value === 'superadmin' || role.value === 'owner')
  const canManageMembers = computed(() =>
    role.value === 'superadmin' || role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business')
  )
  const canManageSettings = computed(() =>
    role.value === 'superadmin' || role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business')
  )
  const canManagePrograms = computed(() =>
    role.value === 'superadmin' || role.value === 'owner' || role.value === 'admin'
  )
  const canViewTransactions = computed(() => !!role.value)

  return { isSuperAdmin, isOwner, isAdmin, isCashier, canDelete, canManageMembers, canManageSettings, canManagePrograms, canViewTransactions }
}
