<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })
const { activeBusiness, activeBusinessId, updateBusiness, businessSlug } = useBusiness()
const toast = useToast()

const form = reactive({
  name: '',
  slug: '',
  phone: '',
  email: '',
  address: '',
})
const saving = ref(false)

watch(activeBusiness, (biz) => {
  if (biz) {
    form.name = biz.name
    form.slug = biz.slug
    form.phone = biz.phone || ''
    form.email = biz.email || ''
    form.address = biz.address || ''
  }
}, { immediate: true })

async function handleSubmit() {
  if (!activeBusinessId.value) return
  saving.value = true
  try {
    await updateBusiness(activeBusinessId.value, {
      name: form.name,
      slug: form.slug,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
    })
    toast.add({ title: 'Berhasil disimpan', color: 'success', icon: 'i-lucide-check' })
    // If slug changed, redirect
    if (form.slug !== businessSlug.value) {
      navigateTo(`/dashboard/${form.slug}/settings`)
    }
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menyimpan', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-lg">
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Pengaturan</h1>
      <p class="text-sm text-(--ui-text-muted)">Pengaturan bisnis</p>
    </div>

    <UCard class="glass-card">
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <UFormField label="Nama Bisnis" required>
          <UInput v-model="form.name" placeholder="Nama bisnis Anda" />
        </UFormField>
        <UFormField label="Slug URL" required>
          <UInput v-model="form.slug" placeholder="slug-bisnis" />
        </UFormField>
        <UFormField label="Telepon">
          <UInput v-model="form.phone" placeholder="08xxxxxxxxxx" />
        </UFormField>
        <UFormField label="Email">
          <UInput v-model="form.email" type="email" placeholder="bisnis@email.com" />
        </UFormField>
        <UFormField label="Alamat">
          <UInput v-model="form.address" placeholder="Alamat bisnis" />
        </UFormField>

        <UButton type="submit" :loading="saving">Simpan</UButton>
      </form>
    </UCard>
  </div>
</template>
