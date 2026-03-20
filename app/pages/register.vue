<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-(--ui-bg) to-cyan-100/20 relative overflow-hidden">
    <!-- Decorative background blur -->
    <div class="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
    <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />

    <UCard class="w-full max-w-md mx-4 glass shadow-xl border-0 relative z-10">
      <template #header>
        <div class="text-center">
          <NuxtLink to="/" class="font-heading font-bold text-2xl text-primary mb-2 block">PoinSaku</NuxtLink>

          <!-- Step indicator -->
          <div class="flex items-center justify-center gap-0 mb-4">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300"
              :class="step === 1 ? 'bg-primary-500 text-white' : 'bg-primary-500/20 text-primary-500'"
            >
              1
            </div>
            <div class="w-12 h-0.5 transition-colors duration-300" :class="step === 2 ? 'bg-primary-500' : 'bg-primary-500/20'" />
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300"
              :class="step === 2 ? 'bg-primary-500 text-white' : 'bg-primary-500/20 text-primary-500'"
            >
              2
            </div>
          </div>

          <h3 class="text-lg font-semibold">{{ step === 1 ? 'Buat Akun Bisnis' : 'Detail Bisnis' }}</h3>
          <p class="text-sm text-(--ui-text-muted)">{{ step === 1 ? 'Daftar untuk membuat program loyalitas digital' : 'Lengkapi informasi bisnis Anda' }}</p>
        </div>
      </template>

      <form v-if="step === 1" class="space-y-3" @submit.prevent="handleRegister">
        <UFormField label="Email" required>
          <UInput type="email" v-model="email" placeholder="email@contoh.com" autocomplete="email" icon="i-lucide-mail" />
        </UFormField>
        <UFormField label="Password" required>
          <UInput type="password" v-model="password" placeholder="Minimal 8 karakter" autocomplete="new-password" icon="i-lucide-lock" />
        </UFormField>
        <UFormField label="Konfirmasi Password" required>
          <UInput type="password" v-model="confirmPassword" placeholder="Ulangi password" autocomplete="new-password" icon="i-lucide-lock" />
        </UFormField>
        <div v-if="errorMsg" class="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
          <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>
        <UButton type="submit" class="w-full cursor-pointer" :loading="loading" block>Daftar</UButton>
      </form>

      <form v-else class="space-y-3" @submit.prevent="handleOnboarding">
        <UFormField label="Nama Bisnis" required>
          <UInput v-model="businessName" placeholder="Contoh: Kopi Nusantara" autocomplete="organization" icon="i-lucide-building-2" />
        </UFormField>
        <UFormField label="Slug (URL)" required>
          <UInput v-model="businessSlug" placeholder="kopi-nusantara" autocomplete="off" icon="i-lucide-link" />
          <template #hint>
            <span class="text-xs">Hanya huruf kecil, angka, dan tanda hubung</span>
          </template>
        </UFormField>
        <UFormField label="Nomor Telepon">
          <UInput v-model="businessPhone" placeholder="08xxxxxxxxxx" autocomplete="tel" icon="i-lucide-phone" />
        </UFormField>
        <div v-if="errorMsg" class="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
          <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>
        <UButton type="submit" class="w-full cursor-pointer" :loading="loading" block>Selesaikan Pendaftaran</UButton>
      </form>

      <template #footer>
        <p class="text-sm text-(--ui-text-muted) text-center">
          Sudah punya akun?
          <NuxtLink to="/login" class="text-primary hover:underline cursor-pointer">Masuk di sini</NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const step = ref(1)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const businessName = ref('')
const businessSlug = ref('')
const businessPhone = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleRegister() {
  errorMsg.value = ''
  if (password.value.length < 8) { errorMsg.value = 'Password minimal 8 karakter'; return }
  if (password.value !== confirmPassword.value) { errorMsg.value = 'Password tidak cocok'; return }

  loading.value = true
  const { error } = await supabase.auth.signUp({ email: email.value, password: password.value })
  if (error) { errorMsg.value = error.message; loading.value = false; return }
  loading.value = false
  step.value = 2
}

const { createBusiness } = useBusiness()

async function handleOnboarding() {
  errorMsg.value = ''
  if (!businessName.value.trim()) { errorMsg.value = 'Nama bisnis wajib diisi'; return }

  const slug = businessSlug.value || businessName.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  loading.value = true

  try {
    await createBusiness({ name: businessName.value, slug, phone: businessPhone.value || undefined })
    router.push(`/dashboard/${slug}`)
  } catch (e: any) {
    errorMsg.value = e.data?.message || e.data?.statusMessage || 'Gagal membuat bisnis'
  } finally {
    loading.value = false
  }
}
</script>
