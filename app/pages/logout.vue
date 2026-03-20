<template>
  <div class="min-h-screen flex items-center justify-center bg-default">
    <div class="text-center space-y-3 text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
      <p class="text-sm">Mengeluarkan akun...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

onMounted(async () => {
  await supabase.auth.signOut()
  router.push('/login')
})
</script>
