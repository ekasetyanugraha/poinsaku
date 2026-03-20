<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const { businessSlug } = useBusiness()
const { programs, loading, deleteProgram } = useProgram()
const { canDelete } = usePermission()
const toast = useToast()

const typeFilter = ref<string | undefined>(undefined)
const filtered = computed(() => {
  if (!typeFilter.value) return programs.value
  return programs.value.filter((p: any) => p.type === typeFilter.value)
})

const qrModal = reactive({ open: false, programId: '', programName: '' })

function openQr(program: any) {
  qrModal.programId = program.id
  qrModal.programName = program.name
  qrModal.open = true
}

async function handleDelete(id: string) {
  if (!confirm('Hapus program ini?')) return
  try {
    await deleteProgram(id)
    toast.add({ title: 'Program berhasil dihapus', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menghapus program', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h1 class="text-lg font-semibold">Program</h1>
        <p class="text-sm text-(--ui-text-muted)">Kelola program loyalitas</p>
      </div>
      <NuxtLink :to="`/dashboard/${businessSlug}/programs/new`">
        <UButton icon="i-lucide-plus">Program Baru</UButton>
      </NuxtLink>
    </div>

    <div class="flex gap-2 mb-4">
      <UButton :variant="!typeFilter ? 'solid' : 'outline'" size="sm" @click="typeFilter = undefined">Semua</UButton>
      <UButton :variant="typeFilter === 'stamp' ? 'solid' : 'outline'" size="sm" @click="typeFilter = 'stamp'">Stempel</UButton>
      <UButton :variant="typeFilter === 'membership' ? 'solid' : 'outline'" size="sm" @click="typeFilter = 'membership'">Membership</UButton>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!filtered.length" class="text-center py-8">
      <UIcon name="i-lucide-star" class="size-10 text-(--ui-text-muted) mx-auto mb-4" />
      <p class="text-(--ui-text-muted)">Belum ada program</p>
    </div>

    <div v-else class="space-y-3">
      <NuxtLink v-for="p in filtered" :key="p.id" :to="`/dashboard/${businessSlug}/programs/${p.id}`" class="block">
        <UCard class="glass-card hover:shadow-md transition-shadow cursor-pointer">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-3 h-10 rounded-full" :style="{ backgroundColor: p.color_primary }" />
              <div>
                <p class="text-sm font-medium">{{ p.name }}</p>
                <p class="text-sm text-(--ui-text-muted)">{{ p.description || '-' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="p.type === 'stamp' ? 'primary' : 'info'" variant="soft">
                {{ p.type === 'stamp' ? 'Stempel' : 'Membership' }}
              </UBadge>
              <UBadge :color="p.is_active ? 'success' : 'neutral'" variant="soft">
                {{ p.is_active ? 'Aktif' : 'Nonaktif' }}
              </UBadge>
              <UButton
                icon="i-lucide-qr-code"
                variant="ghost"
                size="sm"
                @click.prevent="openQr(p)"
              />
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <ProgramQrModal v-model:open="qrModal.open" :program-id="qrModal.programId" :program-name="qrModal.programName" />
  </div>
</template>
