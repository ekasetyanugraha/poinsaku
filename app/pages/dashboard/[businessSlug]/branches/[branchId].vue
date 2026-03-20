<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const route = useRoute()
const router = useRouter()
const { businessSlug } = useBusiness()
const { branches, updateBranch } = useBranch()
const toast = useToast()

const branchId = route.params.branchId as string
const branch = computed(() => branches.value.find((b: any) => b.id === branchId))

const form = reactive({
  name: '',
  slug: '',
  phone: '',
  email: '',
  address: '',
})
const submitting = ref(false)

watch(branch, (b) => {
  if (b) {
    form.name = b.name
    form.slug = b.slug
    form.phone = b.phone || ''
    form.email = b.email || ''
    form.address = b.address || ''
  }
}, { immediate: true })

async function handleSubmit() {
  submitting.value = true
  try {
    await updateBranch(branchId, {
      name: form.name,
      slug: form.slug,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
    })
    toast.add({ title: 'Cabang berhasil diperbarui', color: 'success', icon: 'i-lucide-check' })
    router.push(`/dashboard/${businessSlug.value}/branches`)
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal memperbarui cabang', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-lg">
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Edit Cabang</h1>
    </div>
    <UCard v-if="branch" class="glass-card">
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <UFormField label="Nama Cabang" required>
          <UInput v-model="form.name" />
        </UFormField>
        <UFormField label="Slug" required>
          <UInput v-model="form.slug" />
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
    <div v-else class="text-center py-8">
      <p class="text-(--ui-text-muted)">Cabang tidak ditemukan</p>
    </div>
  </div>
</template>
