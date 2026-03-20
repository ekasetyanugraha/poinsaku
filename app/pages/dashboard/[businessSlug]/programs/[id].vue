<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const route = useRoute()
const router = useRouter()
const { businessSlug } = useBusiness()
const { updateProgram, fetchProgram, deleteProgram } = useProgram()
const { branches } = useBranch()
const { canDelete } = usePermission()
const toast = useToast()

const scopeTypeItems = [
  { label: 'Semua Cabang', value: 'business' },
  { label: 'Cabang Tertentu', value: 'branch' },
]
const branchItems = computed(() => branches.value.map((b: any) => ({ label: b.name, value: b.id })))

const programId = route.params.id as string
const program = ref<any>(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const qrOpen = ref(false)

const form = reactive({
  name: '',
  description: '',
  scope_type: 'business' as string,
  scope_id: '',
  color_primary: '#6366f1',
  color_secondary: '#ffffff',
  is_active: true,
})

onMounted(async () => {
  try {
    program.value = await fetchProgram(programId)
    const p = program.value
    form.name = p.name
    form.description = p.description || ''
    form.scope_type = p.scope_type
    form.scope_id = p.scope_id
    form.color_primary = p.color_primary
    form.color_secondary = p.color_secondary
    form.is_active = p.is_active
  } catch {
    error.value = 'Program tidak ditemukan'
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  submitting.value = true
  try {
    await updateProgram(programId, {
      name: form.name,
      description: form.description || null,
      scope_type: form.scope_type,
      scope_id: form.scope_id,
      color_primary: form.color_primary,
      color_secondary: form.color_secondary,
      is_active: form.is_active,
    })
    toast.add({ title: 'Program berhasil diperbarui', color: 'success', icon: 'i-lucide-check' })
    router.push(`/dashboard/${businessSlug.value}/programs`)
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal memperbarui program', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  if (!confirm('Hapus program ini?')) return
  try {
    await deleteProgram(programId)
    toast.add({ title: 'Program berhasil dihapus', color: 'success', icon: 'i-lucide-check' })
    router.push(`/dashboard/${businessSlug.value}/programs`)
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menghapus program', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Edit Program</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <UCard v-else-if="program" class="glass-card">
      <div class="flex items-center gap-2 mb-4">
        <UBadge :color="program.type === 'stamp' ? 'primary' : 'warning'" variant="soft">
          {{ program.type === 'stamp' ? 'Stempel' : 'Membership' }}
        </UBadge>
        <UButton icon="i-lucide-qr-code" variant="outline" size="sm" @click="qrOpen = true">QR Code</UButton>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-3">
        <UFormField label="Nama Program" required>
          <UInput v-model="form.name" />
        </UFormField>
        <UFormField label="Deskripsi">
          <UInput v-model="form.description" />
        </UFormField>
        <UFormField label="Cakupan">
          <URadioGroup v-model="form.scope_type" orientation="horizontal" :items="scopeTypeItems" />
        </UFormField>
        <UFormField v-if="form.scope_type === 'branch'" label="Pilih Cabang">
          <USelect v-model="form.scope_id" :items="branchItems" placeholder="-- Pilih Cabang --" />
        </UFormField>
        <div class="flex gap-4">
          <UFormField label="Warna Utama">
            <input v-model="form.color_primary" type="color" class="h-10 w-16 rounded border border-default cursor-pointer" />
          </UFormField>
          <UFormField label="Warna Sekunder">
            <input v-model="form.color_secondary" type="color" class="h-10 w-16 rounded border border-default cursor-pointer" />
          </UFormField>
        </div>
        <UFormField label="Status">
          <USwitch v-model="form.is_active" label="Aktif" />
        </UFormField>

        <!-- Read-only stamp config if stamp type -->
        <template v-if="program.type === 'stamp' && program.stamp_config">
          <hr class="border-(--ui-border)" />
          <h3 class="text-sm font-medium">Pengaturan Stempel</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-(--ui-text-muted)">Target:</span> {{ program.stamp_config.stamp_target }}</div>
            <div><span class="text-(--ui-text-muted)">Mode:</span> {{ program.stamp_config.stamp_mode === 'per_transaction' ? 'Per Transaksi' : 'Berdasarkan Nominal' }}</div>
            <div><span class="text-(--ui-text-muted)">Hadiah:</span> {{ program.stamp_config.reward_description || '-' }}</div>
          </div>
        </template>

        <!-- Read-only membership info -->
        <template v-if="program.type === 'membership'">
          <hr class="border-(--ui-border)" />
          <h3 class="text-sm font-medium">Membership Info</h3>
          <p class="text-sm text-(--ui-text-muted)">Tier: {{ program.tier_count ?? 0 }}</p>
        </template>

        <div class="flex gap-3 pt-4">
          <NuxtLink :to="`/dashboard/${businessSlug}/programs`">
            <UButton variant="outline" type="button">Kembali</UButton>
          </NuxtLink>
          <UButton type="submit" :loading="submitting">Simpan</UButton>
          <UButton v-if="canDelete" variant="outline" color="error" type="button" @click="handleDelete">Hapus</UButton>
        </div>
      </form>
    </UCard>

    <div v-else class="text-center py-8">
      <p class="text-(--ui-text-muted)">{{ error || 'Program tidak ditemukan' }}</p>
    </div>

    <ProgramQrModal v-model:open="qrOpen" :program-id="programId" :program-name="form.name" />
  </div>
</template>
