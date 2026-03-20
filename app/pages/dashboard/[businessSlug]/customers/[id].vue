<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const route = useRoute()
const { businessSlug, activeBusinessId } = useBusiness()
const { fetchCustomer } = useCustomer()

const customerId = route.params.id as string
const customer = ref<any>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    customer.value = await fetchCustomer(customerId)
  } catch (e: any) {
    error.value = e.data?.message || 'Pelanggan tidak ditemukan'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="mb-3">
      <NuxtLink :to="`/dashboard/${businessSlug}/customers`" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) mb-2 inline-flex items-center gap-1">
        <UIcon name="i-lucide-arrow-left" class="size-4" /> Kembali
      </NuxtLink>
      <h1 class="text-lg font-semibold">Detail Pelanggan</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <template v-else-if="customer">
      <UCard class="glass-card mb-4">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
            <UIcon name="i-lucide-user" class="size-6" />
          </div>
          <div>
            <h2 class="text-xl font-semibold">{{ customer.name }}</h2>
            <p class="text-sm text-(--ui-text-muted)">{{ customer.phone }}</p>
            <p v-if="customer.email" class="text-sm text-(--ui-text-muted)">{{ customer.email }}</p>
          </div>
        </div>
      </UCard>

      <h3 class="text-base font-medium mb-4">Program Terdaftar</h3>
      <div v-if="customer.programs?.length" class="space-y-3">
        <UCard v-for="cp in customer.programs" :key="cp.id" class="glass-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold">{{ cp.program_name }}</p>
              <UBadge :color="cp.program_type === 'stamp' ? 'primary' : 'warning'" variant="soft" size="sm">
                {{ cp.program_type === 'stamp' ? 'Stempel' : 'Membership' }}
              </UBadge>
            </div>
            <div class="text-right">
              <template v-if="cp.program_type === 'stamp' && cp.stamp_progress">
                <p class="text-lg font-bold">{{ cp.stamp_progress.current_stamps }} / {{ cp.stamp_target }}</p>
                <p class="text-xs text-(--ui-text-muted)">Total ditukar: {{ cp.stamp_progress.total_redemptions }}</p>
              </template>
              <template v-if="cp.program_type === 'membership' && cp.membership_state">
                <p class="text-sm font-medium">{{ cp.tier_name }}</p>
                <p class="text-lg font-bold">Rp {{ (cp.membership_state.cashback_balance || 0).toLocaleString('id-ID') }}</p>
                <p class="text-xs text-(--ui-text-muted)">Total belanja: Rp {{ (cp.membership_state.total_spend || 0).toLocaleString('id-ID') }}</p>
              </template>
            </div>
          </div>
        </UCard>
      </div>
      <div v-else class="text-center py-6">
        <p class="text-(--ui-text-muted)">Belum ada program terdaftar</p>
      </div>
    </template>

    <div v-else class="text-center py-8">
      <p class="text-(--ui-text-muted)">{{ error }}</p>
    </div>
  </div>
</template>
