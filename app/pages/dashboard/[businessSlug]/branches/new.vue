<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const router = useRouter()
const { businessSlug, activeBusinessId } = useBusiness()
const { createBranch } = useBranch()
const toast = useToast()

const form = reactive({
  name: '',
  slug: '',
  phone: '',
  email: '',
  address: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
})
const submitting = ref(false)

watch(() => form.name, (name) => {
  form.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
})

async function handleSubmit() {
  if (!activeBusinessId.value) return
  submitting.value = true
  try {
    await createBranch({
      business_id: activeBusinessId.value,
      name: form.name,
      slug: form.slug,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      latitude: form.latitude,
      longitude: form.longitude,
    })
    toast.add({ title: 'Cabang berhasil dibuat', color: 'success', icon: 'i-lucide-check' })
    router.push(`/dashboard/${businessSlug.value}/branches`)
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal membuat cabang', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-lg">
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Tambah Cabang</h1>
    </div>
    <UCard class="glass-card">
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <UFormField label="Nama Cabang" required>
          <UInput v-model="form.name" placeholder="contoh: Cabang Menteng" />
        </UFormField>
        <UFormField label="Slug" required>
          <UInput v-model="form.slug" placeholder="cabang-menteng" />
        </UFormField>
        <UFormField label="Telepon">
          <UInput v-model="form.phone" placeholder="08xxxxxxxxxx" />
        </UFormField>
        <UFormField label="Email">
          <UInput v-model="form.email" type="email" placeholder="cabang@email.com" />
        </UFormField>
        <UFormField label="Alamat">
          <UInput v-model="form.address" placeholder="Alamat cabang" />
        </UFormField>
        <div class="flex gap-3 pt-4">
          <NuxtLink :to="`/dashboard/${businessSlug}/branches`">
            <UButton variant="outline" type="button">Batal</UButton>
          </NuxtLink>
          <UButton type="submit" :loading="submitting">Simpan</UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
