<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-(--ui-bg) to-cyan-100/20 relative overflow-hidden">
    <!-- Decorative background blur -->
    <div class="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
    <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />

    <UCard class="w-full max-w-md mx-4 text-center glass shadow-xl border-0 relative z-10">
      <template #header>
        <div class="space-y-4">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UIcon name="i-lucide-check-circle" class="size-8 text-primary" />
          </div>
          <div class="space-y-2">
            <h3 class="text-lg font-semibold">Memverifikasi Akun</h3>
            <p class="text-sm text-(--ui-text-muted)">Mohon tunggu, kami sedang memverifikasi akun Anda.</p>
          </div>
          <!-- Loading spinner -->
          <div class="flex justify-center pt-2">
            <UIcon name="i-lucide-loader-2" class="size-6 text-primary animate-spin" />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const router = useRouter()

onMounted(() => {
  setTimeout(() => router.push('/dashboard'), 2000)
})
</script>
