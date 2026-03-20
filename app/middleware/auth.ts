export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    if (to.path.startsWith('/cashier')) {
      return navigateTo('/staff/login')
    }
    if (to.path.startsWith('/dashboard')) {
      return navigateTo('/login')
    }
  }

  // Redirect cashiers away from dashboard to cashier mode
  if (user.value && to.path.startsWith('/dashboard')) {
    const { role } = useAuth()
    if (role.value === 'cashier') {
      return navigateTo('/cashier')
    }
  }
})
