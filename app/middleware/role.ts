export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo('/login')

  const { role, scopeType } = useAuth()

  // Wait for member data to load if not available yet
  // Pages that need role checks should ensure the member is loaded

  // Wishlists page: superadmin only
  if (to.path.includes('/dashboard/wishlists') && role.value !== 'superadmin') {
    return navigateTo('/dashboard/business')
  }

  // Feature Toggles page: superadmin only
  if (to.path.includes('/dashboard/feature-toggles') && role.value !== 'superadmin') {
    return navigateTo('/dashboard/business')
  }

  // Members page: superadmin, owner, or business-admin only
  if (to.path.includes('/members') && !(role.value === 'superadmin' || role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business'))) {
    const slug = to.params.businessSlug as string
    return navigateTo(`/dashboard/${slug}`)
  }

  // Settings page: superadmin, owner, or business-admin only
  if (to.path.includes('/settings') && !(role.value === 'superadmin' || role.value === 'owner' || (role.value === 'admin' && scopeType.value === 'business'))) {
    const slug = to.params.businessSlug as string
    return navigateTo(`/dashboard/${slug}`)
  }
})
