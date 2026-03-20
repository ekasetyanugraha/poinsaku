<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const { businessSlug, activeBusinessId } = useBusiness()
const { branches, loading, deleteBranch } = useBranch()
const { canDelete } = usePermission()
const toast = useToast()

async function handleDelete(id: string) {
  if (!confirm('Hapus cabang ini?')) return
  try {
    await deleteBranch(id)
    toast.add({ title: 'Cabang berhasil dihapus', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menghapus cabang', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h1 class="text-lg font-semibold">Cabang</h1>
        <p class="text-sm text-(--ui-text-muted)">Kelola cabang bisnis Anda</p>
      </div>
      <NuxtLink :to="`/dashboard/${businessSlug}/branches/new`">
        <UButton icon="i-lucide-plus">Tambah Cabang</UButton>
      </NuxtLink>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!branches.length" class="text-center py-8">
      <UIcon name="i-lucide-map-pin" class="size-10 text-(--ui-text-muted) mx-auto mb-4" />
      <p class="text-(--ui-text-muted)">Belum ada cabang</p>
    </div>

    <div v-else class="space-y-3">
      <UCard v-for="branch in branches" :key="branch.id" class="glass-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">{{ branch.name }}</p>
            <p class="text-sm text-(--ui-text-muted)">{{ branch.address || '-' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="branch.is_active ? 'success' : 'neutral'" variant="soft">
              {{ branch.is_active ? 'Aktif' : 'Nonaktif' }}
            </UBadge>
            <NuxtLink :to="`/dashboard/${businessSlug}/branches/${branch.id}`">
              <UButton variant="ghost" icon="i-lucide-pencil" size="sm" />
            </NuxtLink>
            <UButton v-if="canDelete" variant="ghost" color="error" icon="i-lucide-trash-2" size="sm" @click="handleDelete(branch.id)" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
