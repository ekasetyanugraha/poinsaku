<template>
  <div>
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Dashboard</h1>
      <p class="text-sm text-muted">{{ activeBusiness?.name }}</p>
    </div>

    <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-4">
      <UCard v-for="stat in statCards" :key="stat.label" class="glass-card">
        <template #header>
          <div class="flex flex-row items-center justify-between pb-1">
            <p class="text-xs font-medium text-muted">{{ stat.label }}</p>
            <div :class="['flex h-7 w-7 items-center justify-center rounded-lg', stat.iconBg]">
              <UIcon :name="stat.icon" class="size-3.5" :class="stat.iconColor" />
            </div>
          </div>
        </template>
        <div class="text-lg font-semibold">{{ stat.value }}</div>
      </UCard>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <UCard class="glass-card">
        <template #header>
          <p class="text-sm font-medium">Aksi Cepat</p>
        </template>
        <div class="space-y-2">
          <NuxtLink :to="`/dashboard/${businessSlug}/programs/new`" class="block">
            <UButton variant="outline" block size="sm" icon="i-lucide-plus">Buat Program Baru</UButton>
          </NuxtLink>
          <NuxtLink to="/cashier" class="block">
            <UButton block size="sm" icon="i-lucide-scan-line">Buka Mode Kasir</UButton>
          </NuxtLink>
        </div>
      </UCard>

      <UCard class="glass-card">
        <template #header>
          <p class="text-sm font-medium">Transaksi Terakhir</p>
        </template>
        <div v-if="!recentTx.length" class="flex flex-col items-center justify-center py-6 text-center">
          <UIcon name="i-lucide-history" class="size-7 text-muted mb-2" />
          <p class="text-sm text-muted">Belum ada transaksi</p>
        </div>
        <div v-else class="space-y-3">
          <div v-for="tx in recentTx" :key="tx.id" class="flex items-center justify-between text-sm">
            <div>
              <p class="font-medium">{{ tx.customer_programs?.customers?.name || '-' }}</p>
            </div>
            <UBadge :color="tx.type === 'stamp_add' ? 'primary' : tx.type === 'cashback_earn' ? 'success' : 'neutral'" variant="soft">
              {{ txLabel(tx) }}
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { activeBusiness, activeBusinessId, businessSlug } = useBusiness()

const statsData = ref<any>({})
const recentTx = ref<any[]>([])

const statCards = computed(() => [
  { label: 'Total Pelanggan', value: statsData.value.total_customers ?? 0, icon: 'i-lucide-users', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { label: 'Program Aktif', value: statsData.value.active_programs ?? 0, icon: 'i-lucide-star', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  { label: 'Stempel Hari Ini', value: statsData.value.stamps_today ?? 0, icon: 'i-lucide-stamp', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { label: 'Penukaran Bulan Ini', value: statsData.value.redemptions_this_month ?? 0, icon: 'i-lucide-gift', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  { label: 'Cashback Bulan Ini', value: `Rp ${(statsData.value.cashback_earned_this_month ?? 0).toLocaleString('id-ID')}`, icon: 'i-lucide-wallet', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  { label: 'Voucher Aktif', value: statsData.value.active_vouchers ?? 0, icon: 'i-lucide-ticket', iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
])

function txLabel(tx: any) {
  const map: Record<string, string> = {
    stamp_add: `+${tx.stamps_count ?? 0} stempel`,
    stamp_redemption: 'Ditukar',
    cashback_earn: `+Rp ${(tx.cashback_amount ?? 0).toLocaleString('id-ID')}`,
    cashback_redeem: 'Potong cashback',
    tier_upgrade: 'Naik tier',
    voucher_issued: 'Voucher',
  }
  return map[tx.type] || tx.type
}

onMounted(async () => {
  if (!activeBusinessId.value) return
  try {
    const params = { business_id: activeBusinessId.value }
    const [stats, txResult] = await Promise.all([
      $fetch('/api/dashboard/stats', { params }),
      $fetch('/api/transactions', { params: { ...params, limit: 5 } }),
    ])
    statsData.value = stats
    recentTx.value = (txResult as any).data || []
  } catch {}
})
</script>
