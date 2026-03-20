<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-(--ui-bg) to-cyan-100/20 relative overflow-hidden">
    <!-- Decorative background blur -->
    <div class="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
    <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />

    <UCard class="w-full max-w-md mx-4 glass shadow-xl border-0 relative z-10">
      <template #header>
        <div class="text-center">
          <NuxtLink to="/" class="font-heading font-bold text-2xl text-primary mb-2 block">PoinSaku</NuxtLink>
          <h3 class="text-lg font-semibold">Masuk ke Akun Anda</h3>
          <p class="text-sm text-(--ui-text-muted)">Masukkan email dan password untuk melanjutkan</p>
        </div>
      </template>

      <form class="space-y-3" @submit.prevent="handleLogin">
        <UFormField label="Email" required>
          <UInput type="email" v-model="email" placeholder="email@contoh.com" autocomplete="email" inputmode="email" icon="i-lucide-mail" />
        </UFormField>
        <UFormField label="Password" required>
          <UInput type="password" v-model="password" placeholder="••••••••" autocomplete="current-password" icon="i-lucide-lock" />
        </UFormField>
        <div v-if="errorMsg" class="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
          <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>
        <UButton type="submit" class="w-full cursor-pointer" :loading="loading" block>Masuk</UButton>
      </form>

      <template #footer>
        <p class="text-sm text-(--ui-text-muted) text-center">
          Belum punya akun?
          <NuxtLink to="/register" class="text-primary hover:underline cursor-pointer">Daftar di sini</NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    errorMsg.value = 'Email atau password salah'
    loading.value = false
    return
  }

  // Fetch member record for role-based redirect
  try {
    const member = await $fetch('/api/staff/me') as any

    if (member.role === 'cashier') {
      router.push('/cashier')
    } else {
      router.push(`/dashboard/${member.businessSlug}`)
    }
  } catch {
    // Fallback: fetch businesses list for owners without member lookup
    try {
      const businesses = await $fetch('/api/businesses') as any[]
      if (businesses?.length > 0) {
        router.push(`/dashboard/${businesses[0].slug}`)
      } else {
        router.push('/dashboard')
      }
    } catch {
      errorMsg.value = 'Gagal memuat data akun. Coba lagi.'
      await supabase.auth.signOut()
      loading.value = false
    }
  }
}
</script>
