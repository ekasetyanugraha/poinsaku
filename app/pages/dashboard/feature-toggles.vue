<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'] })

const toast = useToast()

interface FeatureToggle {
  id: string
  key: string
  enabled: boolean
  label: string
  description: string | null
  updated_at: string
  created_at: string
}

const { data: response, pending: loading, refresh } = await useFetch<{ data: FeatureToggle[] }>('/api/feature-toggles')
const toggles = computed(() => response.value?.data ?? [])

const updatingKeys = ref<Set<string>>(new Set())

async function handleToggle(toggle: FeatureToggle, newValue: boolean) {
  updatingKeys.value = new Set([...updatingKeys.value, toggle.key])
  try {
    await $fetch(`/api/feature-toggles/${toggle.key}`, {
      method: 'PATCH',
      body: { enabled: newValue },
    })
    await refresh()
    toast.add({
      title: 'Berhasil',
      description: `${toggle.label} berhasil ${newValue ? 'diaktifkan' : 'dinonaktifkan'}`,
      color: 'success',
    })
  }
  catch {
    toast.add({
      title: 'Gagal',
      description: `Gagal mengubah status ${toggle.label}`,
      color: 'error',
    })
  }
  finally {
    const next = new Set(updatingKeys.value)
    next.delete(toggle.key)
    updatingKeys.value = next
  }
}

// Create toggle modal state
const showCreateModal = ref(false)
const createForm = reactive({ key: '', label: '', description: '', enabled: false })
const creating = ref(false)

watch(() => createForm.label, (label) => {
  createForm.key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
})

watch(showCreateModal, (isOpen) => {
  if (!isOpen) {
    createForm.key = ''
    createForm.label = ''
    createForm.description = ''
    createForm.enabled = false
  }
})

async function handleCreate() {
  creating.value = true
  try {
    await $fetch('/api/feature-toggles', {
      method: 'POST',
      body: {
        key: createForm.key,
        label: createForm.label,
        description: createForm.description || undefined,
        enabled: createForm.enabled,
      },
    })
    showCreateModal.value = false
    await refresh()
    toast.add({
      title: 'Berhasil',
      description: 'Toggle berhasil dibuat',
      color: 'success',
    })
  }
  catch (e: any) {
    toast.add({
      title: 'Gagal',
      description: e.data?.message || 'Gagal membuat toggle',
      color: 'error',
    })
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h1 class="text-lg font-semibold">Feature Toggles</h1>
        <p class="text-sm text-(--ui-text-muted)">Kelola fitur yang aktif di aplikasi</p>
      </div>
      <UButton icon="i-lucide-plus" size="sm" @click="showCreateModal = true">Tambah Toggle</UButton>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!toggles.length" class="text-center py-8">
      <UIcon name="i-lucide-toggle-right" class="size-10 text-(--ui-text-muted) mx-auto mb-4" />
      <p class="text-(--ui-text-muted)">Belum ada feature toggle terdaftar</p>
    </div>

    <div v-else class="space-y-2">
      <UCard v-for="toggle in toggles" :key="toggle.id" class="glass-card !py-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-medium text-sm">{{ toggle.label }}</p>
            <p v-if="toggle.description" class="text-xs text-(--ui-text-muted)">{{ toggle.description }}</p>
            <p class="text-xs text-(--ui-text-muted) mt-0.5">
              <span :class="toggle.enabled ? 'text-success-500' : 'text-(--ui-text-muted)'">
                {{ toggle.enabled ? 'Aktif' : 'Nonaktif' }}
              </span>
            </p>
          </div>
          <div class="shrink-0 flex items-center gap-2">
            <UIcon
              v-if="updatingKeys.has(toggle.key)"
              name="i-lucide-loader-2"
              class="size-4 animate-spin text-(--ui-text-muted)"
            />
            <USwitch
              :model-value="toggle.enabled"
              :disabled="updatingKeys.has(toggle.key)"
              @update:model-value="handleToggle(toggle, $event)"
            />
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="showCreateModal" title="Tambah Feature Toggle">
      <template #body>
        <form id="create-toggle-form" class="space-y-3" @submit.prevent="handleCreate">
          <UFormField label="Label" required>
            <UInput v-model="createForm.label" placeholder="contoh: Dark Mode" />
          </UFormField>
          <UFormField label="Key" required>
            <UInput v-model="createForm.key" placeholder="dark_mode" />
          </UFormField>
          <UFormField label="Deskripsi">
            <UInput v-model="createForm.description" placeholder="Deskripsi opsional" />
          </UFormField>
          <UFormField label="Status awal">
            <USwitch v-model="createForm.enabled" />
          </UFormField>
        </form>
      </template>
      <template #footer>
        <div class="flex gap-3 justify-end w-full">
          <UButton variant="outline" @click="showCreateModal = false">Batal</UButton>
          <UButton type="submit" form="create-toggle-form" :loading="creating">Simpan</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
