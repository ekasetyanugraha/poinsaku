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
</script>

<template>
  <div>
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Feature Toggles</h1>
      <p class="text-sm text-(--ui-text-muted)">Kelola fitur yang aktif di aplikasi</p>
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
  </div>
</template>
