<template>
  <div class="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-primary/15 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Decorative gradient orb -->
    <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-cyan-400/20 blur-3xl pointer-events-none" />

    <!-- Step 1: Phone Input -->
    <UCard v-if="step === 'phone'" class="w-full max-w-md glass relative">
      <template #header>
        <div class="text-center">
          <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-cyan-600 mx-auto mb-4 flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <UIcon name="i-lucide-stamp" class="size-7" />
          </div>
          <p class="font-heading font-semibold text-base">Program Loyalitas</p>
          <p class="text-sm text-(--ui-text-muted)">Masukkan nomor HP Anda untuk melanjutkan</p>
        </div>
      </template>

      <form class="space-y-3" @submit.prevent="handleCheck">
        <UFormField label="Nomor HP" required :error="phoneError">
          <UInput v-model="phone" placeholder="08xxxxxxxxxx" type="tel" inputmode="tel" icon="i-lucide-phone" autofocus />
        </UFormField>
        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
        <UButton type="submit" class="w-full cursor-pointer" size="lg" :loading="loading" block>Lanjutkan</UButton>
      </form>
    </UCard>

    <!-- Step 2: Registration Form -->
    <UCard v-else-if="step === 'register'" class="w-full max-w-md glass relative">
      <template #header>
        <div class="text-center">
          <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-cyan-600 mx-auto mb-4 flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <UIcon name="i-lucide-stamp" class="size-7" />
          </div>
          <p class="font-heading font-semibold text-base">Daftar Program Loyalitas</p>
          <p class="text-sm text-(--ui-text-muted)">Isi data berikut untuk mendapatkan kartu stempel digital Anda</p>
        </div>
      </template>

      <form class="space-y-3" @submit.prevent="handleRegister">
        <UFormField label="Nomor HP" required>
          <UInput :model-value="phone" disabled icon="i-lucide-phone" />
        </UFormField>
        <UFormField label="Nama" required>
          <UInput v-model="name" placeholder="Nama lengkap Anda" autofocus />
        </UFormField>
        <UFormField label="Email">
          <UInput type="email" v-model="emailVal" placeholder="email@contoh.com" icon="i-lucide-mail" />
        </UFormField>
        <UFormField label="Jenis Kelamin">
          <USelect
            v-model="gender"
            placeholder="Pilih..."
            :items="[
              { label: 'Laki-laki', value: 'male' },
              { label: 'Perempuan', value: 'female' },
              { label: 'Lainnya', value: 'other' },
            ]"
          />
        </UFormField>
        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
        <div class="flex gap-2">
          <UButton variant="outline" class="cursor-pointer" size="lg" @click="step = 'phone'">Kembali</UButton>
          <UButton type="submit" class="flex-1 cursor-pointer" size="lg" :loading="loading" block>Daftar & Dapatkan Kartu</UButton>
        </div>
      </form>
    </UCard>

    <!-- Step 3: Success State -->
    <UCard v-else class="w-full max-w-md text-center glass relative">
      <template #header>
        <div class="text-center">
          <div class="relative mx-auto mb-4">
            <!-- Confetti particles -->
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="absolute w-2 h-2 rounded-full bg-yellow-400 animate-confetti-1" style="left: 10%; top: 50%;" />
              <span class="absolute w-1.5 h-1.5 rounded-full bg-pink-400 animate-confetti-2" style="left: 80%; top: 40%;" />
              <span class="absolute w-2 h-2 rounded-full bg-primary animate-confetti-3" style="left: 20%; top: 30%;" />
              <span class="absolute w-1.5 h-1.5 rounded-full bg-green-400 animate-confetti-4" style="left: 75%; top: 60%;" />
              <span class="absolute w-2 h-2 rounded-full bg-purple-400 animate-confetti-5" style="left: 50%; top: 20%;" />
              <span class="absolute w-1.5 h-1.5 rounded-full bg-orange-400 animate-confetti-6" style="left: 40%; top: 70%;" />
            </div>
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
              <UIcon name="i-lucide-check-circle-2" class="size-7" />
            </div>
          </div>
          <p class="font-heading font-semibold text-base">Berhasil Terdaftar!</p>
          <p class="text-sm text-(--ui-text-muted)">Kartu stempel digital Anda sudah siap</p>
        </div>
      </template>

      <NuxtLink :to="`/card/${customerProgramIdResult}`">
        <UButton class="w-full cursor-pointer" size="lg" block>Lihat Kartu Anda</UButton>
      </NuxtLink>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const programId = route.params.programId as string

const step = ref<'phone' | 'register' | 'done'>('phone')
const name = ref('')
const phone = ref('')
const emailVal = ref('')
const gender = ref('')
const loading = ref(false)
const errorMsg = ref('')
const phoneError = ref('')
const customerProgramIdResult = ref('')

watch(phone, (val) => {
  const cleaned = val.replace(/[\s\-()]/g, '')
  if (cleaned && !/^(?:\+62|62|0)[2-9]\d{7,11}$/.test(cleaned)) {
    phoneError.value = 'Nomor HP tidak valid. Gunakan format 08xx'
  } else {
    phoneError.value = ''
  }
})

async function handleCheck() {
  errorMsg.value = ''
  if (!phone.value.trim()) { errorMsg.value = 'Nomor HP wajib diisi'; return }
  if (phoneError.value) { errorMsg.value = phoneError.value; return }

  loading.value = true
  try {
    const result = await $fetch('/api/customers/check', {
      method: 'POST',
      body: { phone: phone.value, program_id: programId },
    }) as { found: boolean; enrolled: boolean; customer_program_id?: string; customer?: { name: string; email: string | null; gender: string | null } }

    if (result.enrolled && result.customer_program_id) {
      await navigateTo(`/card/${result.customer_program_id}`)
      return
    }

    if (result.found && result.customer) {
      name.value = result.customer.name || ''
      emailVal.value = result.customer.email || ''
      gender.value = result.customer.gender || ''
    }

    step.value = 'register'
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Gagal memeriksa nomor HP. Coba lagi.'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  errorMsg.value = ''
  if (!name.value.trim()) { errorMsg.value = 'Nama wajib diisi'; return }

  loading.value = true
  try {
    const result = await $fetch('/api/customers/register', {
      method: 'POST',
      body: {
        program_id: programId,
        name: name.value,
        phone: phone.value,
        email: emailVal.value || undefined,
        gender: gender.value || undefined,
      },
    }) as any
    customerProgramIdResult.value = result.customer_program_id
    step.value = 'done'
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Gagal mendaftar. Coba lagi.'
  } finally {
    loading.value = false
  }
}
</script>
