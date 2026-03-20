<script setup lang="ts">
const props = defineProps<{
  branch?: { id: string; name: string; slug: string; phone?: string; email?: string; address?: string } | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })

const { activeBusinessId } = useBusiness()
const { createBranch, updateBranch } = useBranch()
const toast = useToast()

const form = reactive({
  name: '',
  slug: '',
  phone: '',
  email: '',
  address: '',
})
const submitting = ref(false)

const isEdit = computed(() => !!props.branch)
const title = computed(() => isEdit.value ? 'Edit Cabang' : 'Tambah Cabang')

watch(() => form.name, (name) => {
  if (!isEdit.value) {
    form.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }
})

watch(() => props.branch, (b) => {
  if (b) {
    form.name = b.name
    form.slug = b.slug
    form.phone = b.phone || ''
    form.email = b.email || ''
    form.address = b.address || ''
  }
}, { immediate: true })

watch(open, (isOpen) => {
  if (isOpen && !props.branch) {
    form.name = ''
    form.slug = ''
    form.phone = ''
    form.email = ''
    form.address = ''
  }
})

async function handleSubmit() {
  if (!activeBusinessId.value) return
  submitting.value = true
  try {
    if (isEdit.value && props.branch) {
      await updateBranch(props.branch.id, {
        name: form.name,
        slug: form.slug,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      })
      toast.add({ title: 'Cabang berhasil diperbarui', color: 'success', icon: 'i-lucide-check' })
    } else {
      await createBranch({
        business_id: activeBusinessId.value,
        name: form.name,
        slug: form.slug,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
      })
      toast.add({ title: 'Cabang berhasil dibuat', color: 'success', icon: 'i-lucide-check' })
    }
    open.value = false
    emit('saved')
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menyimpan cabang', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title">
    <template #body>
      <form id="branch-form" class="space-y-3" @submit.prevent="handleSubmit">
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
      </form>
    </template>
    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <UButton variant="outline" @click="open = false">Batal</UButton>
        <UButton type="submit" form="branch-form" :loading="submitting">Simpan</UButton>
      </div>
    </template>
  </UModal>
</template>
