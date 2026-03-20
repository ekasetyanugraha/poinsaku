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
})
