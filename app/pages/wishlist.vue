<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-(--ui-bg) to-cyan-100/20 relative overflow-hidden py-12">
    <!-- Decorative background blur -->
    <div class="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
    <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />

    <!-- Success state -->
    <UCard v-if="submitted" class="w-full max-w-lg mx-4 glass shadow-xl border-0 relative z-10">
      <template #header>
        <div class="text-center">
          <NuxtLink to="/" class="font-heading font-bold text-2xl text-primary mb-2 block">PoinSaku</NuxtLink>
        </div>
      </template>
      <div class="text-center py-6 space-y-4">
        <div class="flex justify-center">
          <UIcon name="i-lucide-check-circle" class="size-16 text-green-500" />
        </div>
        <h2 class="font-heading text-2xl font-bold">Terima kasih!</h2>
        <p class="text-muted">Kami akan menghubungi Anda saat PoinSaku siap diluncurkan.</p>
        <NuxtLink to="/">
          <UButton variant="outline" class="cursor-pointer mt-2">Kembali ke Beranda</UButton>
        </NuxtLink>
      </div>
    </UCard>

    <!-- Form state -->
    <UCard v-else class="w-full max-w-lg mx-4 glass shadow-xl border-0 relative z-10">
      <template #header>
        <div class="text-center">
          <NuxtLink to="/" class="font-heading font-bold text-2xl text-primary mb-2 block">PoinSaku</NuxtLink>
          <h3 class="text-lg font-semibold">Bergabung dengan Wishlist Kami</h3>
          <p class="text-sm text-muted">Daftarkan diri Anda dan jadilah yang pertama tahu saat PoinSaku diluncurkan.</p>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField label="Nama" required>
          <UInput
            v-model="form.name"
            placeholder="Nama lengkap Anda"
            icon="i-lucide-user"
            :class="{ 'ring-1 ring-red-500': errors.name }"
          />
          <p v-if="errors.name" class="text-xs text-red-500 mt-1">{{ errors.name }}</p>
        </UFormField>

        <UFormField label="Email" required>
          <UInput
            v-model="form.email"
            type="email"
            placeholder="email@contoh.com"
            icon="i-lucide-mail"
            :class="{ 'ring-1 ring-red-500': errors.email }"
          />
          <p v-if="errors.email" class="text-xs text-red-500 mt-1">{{ errors.email }}</p>
        </UFormField>

        <UFormField label="Industri" required>
          <USelect
            v-model="form.industry"
            :items="industryOptions"
            placeholder="Pilih industri..."
            :class="{ 'ring-1 ring-red-500 rounded-md': errors.industry }"
          />
          <UInput
            v-if="form.industry === 'others'"
            v-model="form.industryCustom"
            placeholder="Sebutkan industri Anda"
            class="mt-2"
            :maxlength="100"
            :class="{ 'ring-1 ring-red-500': errors.industry && !form.industryCustom.trim() }"
          />
          <p v-if="errors.industry" class="text-xs text-red-500 mt-1">{{ errors.industry }}</p>
        </UFormField>

        <UFormField label="Nama Perusahaan">
          <UInput
            v-model="form.company"
            placeholder="Nama bisnis atau perusahaan"
            icon="i-lucide-building-2"
          />
        </UFormField>

        <UFormField label="Pesan">
          <UTextarea
            v-model="form.message"
            placeholder="Ada yang ingin Anda sampaikan?"
            :maxlength="250"
            :rows="3"
          />
          <p class="text-xs text-muted mt-1">{{ form.message.length }}/250</p>
        </UFormField>

        <div v-if="errorMsg" class="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
          <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>

        <UButton type="submit" class="w-full cursor-pointer" :loading="loading" block>
          Daftar Wishlist
        </UButton>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const industryOptions = [
  { label: 'Pilih industri...', value: undefined },
  { label: 'F&B (Makanan & Minuman)', value: 'fnb' },
  { label: 'Jasa', value: 'services' },
  { label: 'Kecantikan', value: 'beauty' },
  { label: 'Kesehatan & Wellbeing', value: 'wellbeing' },
  { label: 'Medis', value: 'medical' },
  { label: 'Lainnya', value: 'others' },
]

const form = reactive({
  name: '',
  email: '',
  company: '',
  industry: undefined,
  industryCustom: '',
  message: '',
})

const errors = reactive({
  name: '',
  email: '',
  industry: '',
})

const loading = ref(false)
const errorMsg = ref('')
const submitted = ref(false)

function validateForm(): boolean {
  errors.name = ''
  errors.email = ''
  errors.industry = ''

  if (!form.name.trim()) {
    errors.name = 'Nama wajib diisi'
  }
  if (!form.email.trim()) {
    errors.email = 'Email wajib diisi'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format email tidak valid'
  }
  if (!form.industry) {
    errors.industry = 'Industri wajib dipilih'
  } else if (form.industry === 'others' && !form.industryCustom.trim()) {
    errors.industry = 'Sebutkan industri Anda'
  }

  return !errors.name && !errors.email && !errors.industry
}

async function handleSubmit() {
  if (!validateForm()) return

  loading.value = true
  errorMsg.value = ''

  const industryValue = form.industry === 'others'
    ? (form.industryCustom.trim() || undefined)
    : (form.industry || undefined)

  try {
    await $fetch('/api/wishlist', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        industry: industryValue,
        message: form.message.trim() || undefined,
      },
    })
    submitted.value = true
  } catch {
    errorMsg.value = 'Terjadi kesalahan. Silakan coba lagi.'
  } finally {
    loading.value = false
  }
}
</script>
