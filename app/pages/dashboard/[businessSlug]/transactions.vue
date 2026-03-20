<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const { transactions, total, page, limit, typeFilter, branchFilter, loading } = useTransaction()
const { branches } = useBranch()

const totalPages = computed(() => Math.ceil(total.value / limit.value))

const typeOptions = [
  { label: 'Semua', value: undefined },
  { label: 'Stempel', value: 'stamp_add' },
  { label: 'Penukaran Stempel', value: 'stamp_redemption' },
  { label: 'Cashback', value: 'cashback_earn' },
  { label: 'Potong Cashback', value: 'cashback_redeem' },
  { label: 'Naik Tier', value: 'tier_upgrade' },
  { label: 'Voucher', value: 'voucher_issued' },
]

function txLabel(type: string) {
  const map: Record<string, string> = {
    stamp_add: 'Stempel',
    stamp_redemption: 'Tukar Stempel',
    cashback_earn: 'Cashback',
    cashback_redeem: 'Potong Cashback',
    tier_upgrade: 'Naik Tier',
    voucher_issued: 'Voucher',
  }
  return map[type] || type
}

function txColor(type: string) {
  const map: Record<string, string> = {
    stamp_add: 'primary',
    stamp_redemption: 'success',
    cashback_earn: 'info',
    cashback_redeem: 'warning',
    tier_upgrade: 'neutral',
    voucher_issued: 'error',
  }
  return map[type] || 'neutral'
}
</script>

<template>
  <div>
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Transaksi</h1>
      <p class="text-sm text-(--ui-text-muted)">{{ total }} transaksi</p>
    </div>

    <div class="flex flex-wrap gap-3 mb-4">
      <select v-model="typeFilter" class="rounded-md border px-3 py-2 text-sm bg-(--ui-bg) border-(--ui-border)">
        <option v-for="opt in typeOptions" :key="opt.label" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-model="branchFilter" class="rounded-md border px-3 py-2 text-sm bg-(--ui-bg) border-(--ui-border)">
        <option :value="undefined">Semua Cabang</option>
        <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!transactions.length" class="text-center py-8">
      <UIcon name="i-lucide-history" class="size-10 text-(--ui-text-muted) mx-auto mb-4" />
      <p class="text-(--ui-text-muted)">Belum ada transaksi</p>
    </div>

    <div v-else class="space-y-2">
      <UCard v-for="tx in transactions" :key="tx.id" class="glass-card !py-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-sm">{{ tx.customer_programs?.customers?.name || '-' }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ new Date(tx.created_at).toLocaleString('id-ID') }}</p>
          </div>
          <div class="flex items-center gap-3 text-right">
            <div>
              <p v-if="tx.stamps_count" class="text-sm font-medium">{{ tx.stamps_count > 0 ? '+' : '' }}{{ tx.stamps_count }} stempel</p>
              <p v-if="tx.cashback_amount" class="text-sm font-medium">{{ tx.cashback_amount > 0 ? '+' : '' }}Rp {{ Math.abs(tx.cashback_amount).toLocaleString('id-ID') }}</p>
              <p v-if="tx.transaction_amount" class="text-xs text-(--ui-text-muted)">Nominal: Rp {{ tx.transaction_amount.toLocaleString('id-ID') }}</p>
            </div>
            <UBadge :color="txColor(tx.type)" variant="soft" size="sm">{{ txLabel(tx.type) }}</UBadge>
          </div>
        </div>
      </UCard>

      <div v-if="totalPages > 1" class="flex justify-center pt-4">
        <div class="flex gap-2">
          <UButton variant="outline" size="sm" :disabled="page <= 1" @click="page--">Sebelumnya</UButton>
          <span class="flex items-center px-3 text-sm">{{ page }} / {{ totalPages }}</span>
          <UButton variant="outline" size="sm" :disabled="page >= totalPages" @click="page++">Selanjutnya</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
