<template>
  <div class="min-h-screen flex items-center justify-center bg-(--ui-bg)">
    <UCard class="w-full max-w-sm mx-4">
      <template #header>
        <div class="text-center">
          <h3 class="text-lg font-semibold">Masuk sebagai Staff</h3>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <UFormField label="Email" required>
          <UInput v-model="email" type="email" placeholder="email@contoh.com" autocomplete="email" inputmode="email" icon="i-lucide-mail" />
        </UFormField>
        <UFormField label="Password" required>
          <UInput v-model="password" type="password" placeholder="Password" autocomplete="current-password" icon="i-lucide-lock" />
        </UFormField>
        <div v-if="errorMsg" class="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
          <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>
        <UButton type="submit" class="w-full cursor-pointer" :loading="loading" block>Masuk</UButton>
      </form>
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
    // Check for banned/deactivated user
    if (error.message?.toLowerCase().includes('banned') || (error as any).code === 'user_banned') {
      errorMsg.value = 'Akun Anda telah dinonaktifkan. Hubungi pemilik bisnis.'
    } else {
      errorMsg.value = 'Email atau password salah.'
    }
    loading.value = false
    return
  }

  // Fetch member record to determine role + businessSlug for redirect
  try {
    const memberData = await $fetch('/api/staff/me')
    const member = memberData as any

    if (member.role === 'cashier') {
      router.push('/cashier')
    } else if (member.role === 'admin') {
      router.push(`/dashboard/${member.businessSlug}`)
    } else if (member.role === 'owner') {
      // Owners should use /login, but handle gracefully
      router.push(`/dashboard/${member.businessSlug}`)
    } else {
      router.push('/cashier')
    }
  } catch (e: any) {
    // If /api/staff/me fails (e.g., deactivated after ban check race, or no member record)
    if (e.statusCode === 403) {
      errorMsg.value = 'Akun Anda telah dinonaktifkan. Hubungi pemilik bisnis.'
    } else {
      errorMsg.value = 'Gagal memuat data akun. Coba lagi.'
    }
    // Sign out since we can't route them
    await supabase.auth.signOut()
    loading.value = false
  }
}
</script>
