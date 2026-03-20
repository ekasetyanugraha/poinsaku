<template>
  <div class="max-w-lg">
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Buat Bisnis Baru</h1>
      <p class="text-sm text-(--ui-text-muted)">Isi detail bisnis Anda</p>
    </div>

    <UCard class="glass-card">
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <UFormField label="Nama Bisnis" required>
          <UInput v-model="form.name" placeholder="contoh: Kopi Nusantara" />
        </UFormField>

        <UFormField label="Slug URL" required>
          <UInput v-model="form.slug" placeholder="contoh: kopi-nusantara" />
          <template #hint>
            <span class="text-xs">URL: /dashboard/{{ form.slug || '...' }}</span>
          </template>
        </UFormField>

        <UFormField label="Telepon">
          <UInput v-model="form.phone" placeholder="+62812..." />
        </UFormField>

        <UFormField label="Email">
          <UInput v-model="form.email" type="email" placeholder="bisnis@email.com" />
        </UFormField>

        <UFormField label="Alamat">
          <UInput v-model="form.address" placeholder="Alamat bisnis" />
        </UFormField>

        <div class="flex gap-3 pt-4">
          <NuxtLink to="/dashboard/business">
            <UButton variant="outline" type="button">Batal</UButton>
          </NuxtLink>
          <UButton type="submit" :loading="submitting">Buat Bisnis</UButton>
        </div>

      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const router = useRouter()
const { createBusiness } = useBusiness()
const toast = useToast()

const form = reactive({
  name: '',
  slug: '',
  phone: '',
  email: '',
  address: '',
})

const submitting = ref(false)

// Auto-generate slug from name
watch(() => form.name, (name) => {
  form.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
})

async function handleSubmit() {
  submitting.value = true
  try {
    await createBusiness({
      name: form.name,
      slug: form.slug,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
    })
    toast.add({ title: 'Bisnis berhasil dibuat', color: 'success', icon: 'i-lucide-check' })
    router.push(`/dashboard/${form.slug}`)
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal membuat bisnis', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    submitting.value = false
  }
}
</script>
