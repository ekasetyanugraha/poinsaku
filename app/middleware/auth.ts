export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (!user.value && (to.path.startsWith('/dashboard') || to.path.startsWith('/cashier'))) {
    return navigateTo('/login')
  }
})
