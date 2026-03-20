<template>
  <div class="min-h-screen bg-gradient-to-br from-cyan-50/80 via-white to-primary/15 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Decorative gradient orbs -->
    <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-cyan-400/20 blur-3xl pointer-events-none" />
    <div class="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-400/15 to-primary/10 blur-3xl pointer-events-none" />

    <div v-if="cardData" class="w-full max-w-md space-y-4 relative">
      <!-- Card Header — same visual style as v1 -->
      <UCard class="overflow-hidden shadow-xl">
        <template #header>
          <div class="p-6 -m-4 sm:-m-6 text-white relative" :style="{ backgroundColor: cardData.program?.color_primary || '#0891b2' }">
            <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div class="relative">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <p class="text-sm opacity-80">{{ cardData.program?.businesses?.name }}</p>
                  <h2 class="text-lg font-heading font-bold">{{ cardData.program?.name }}</h2>
                </div>
                <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-heading font-bold">
                  {{ cardData.customer?.name?.charAt(0) }}
                </div>
              </div>
              <p class="text-sm opacity-80">{{ cardData.customer?.name }}</p>
            </div>
          </div>
        </template>

        <!-- STAMP CARD VIEW -->
        <template v-if="cardData.program?.type === 'stamp' && cardData.stamp_progress">
          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium">Stempel Anda</p>
              <p class="text-sm text-(--ui-text-muted)">{{ cardData.stamp_progress.current_stamps }} / {{ cardData.stamp_config?.stamp_target }}</p>
            </div>
            <div class="grid grid-cols-5 gap-2">
              <div v-for="i in cardData.stamp_config?.stamp_target" :key="i"
                :class="['aspect-square rounded-lg flex items-center justify-center border-2 transition-all', i <= cardData.stamp_progress.current_stamps ? 'text-white border-transparent shadow-sm' : 'bg-(--ui-bg-muted) border-dashed border-(--ui-text-muted)/30']"
                :style="i <= cardData.stamp_progress.current_stamps ? { backgroundColor: cardData.program?.color_primary || '#0891b2' } : {}">
                <UIcon v-if="i <= cardData.stamp_progress.current_stamps" name="i-lucide-check" class="size-3.5" />
                <span v-else class="text-xs text-(--ui-text-muted)/40">{{ i }}</span>
              </div>
            </div>
          </div>
          <!-- Reward -->
          <div class="rounded-xl bg-(--ui-bg-muted)/50 p-4 mb-6">
            <div class="flex items-center gap-2 mb-1">
              <UIcon name="i-lucide-gift" class="size-3.5 text-(--ui-text-muted)" />
              <p class="text-sm text-(--ui-text-muted)">Hadiah</p>
            </div>
            <p class="font-medium">{{ cardData.stamp_config?.reward_description }}</p>
            <UBadge v-if="cardData.stamp_progress.current_stamps >= (cardData.stamp_config?.stamp_target || 0)" color="success" class="mt-2 animate-pulse-badge">
              Siap ditukarkan!
            </UBadge>
          </div>
        </template>

        <!-- MEMBERSHIP CARD VIEW -->
        <template v-else-if="cardData.program?.type === 'membership' && cardData.membership_state">
          <!-- Current Tier -->
          <div class="mb-6">
            <div class="rounded-xl p-4" :style="{ backgroundColor: currentTierColor + '20' }">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-crown" class="size-6" :style="{ color: currentTierColor }" />
                <div>
                  <p class="text-sm text-(--ui-text-muted)">Tier Saat Ini</p>
                  <p class="text-lg font-heading font-bold">{{ currentTierName }}</p>
                </div>
              </div>
            </div>
          </div>
          <!-- Cashback Balance -->
          <div class="rounded-xl bg-(--ui-bg-muted)/50 p-4 mb-6">
            <p class="text-sm text-(--ui-text-muted)">Saldo Cashback</p>
            <p class="text-xl font-heading font-bold">Rp {{ cardData.membership_state.cashback_balance.toLocaleString('id-ID') }}</p>
            <p class="text-xs text-(--ui-text-muted) mt-1">Total belanja: Rp {{ cardData.membership_state.total_spend.toLocaleString('id-ID') }}</p>
          </div>
          <!-- Tier Progress -->
          <div v-if="cardData.all_tiers?.length > 1" class="mb-6">
            <p class="text-sm font-medium mb-3">Tier Progress</p>
            <div class="space-y-2">
              <div v-for="tier in cardData.all_tiers" :key="tier.id" class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: tier.color || '#808080' }" />
                <span class="text-sm flex-1" :class="tier.id === cardData.membership_state.current_tier_id ? 'font-bold' : ''">{{ tier.name }}</span>
                <span class="text-xs text-(--ui-text-muted)">{{ tier.cashback_percentage }}%</span>
                <UIcon v-if="tier.id === cardData.membership_state.current_tier_id" name="i-lucide-check-circle" class="size-4 text-primary" />
              </div>
            </div>
          </div>
          <!-- Voucher Options (if voucher mode) -->
          <div v-if="cardData.voucher_options?.length" class="mb-6">
            <p class="text-sm font-medium mb-3">Tukar Voucher</p>
            <div class="space-y-2">
              <button v-for="vo in cardData.voucher_options" :key="vo.id" class="w-full rounded-lg border p-3 text-left hover:shadow-md transition-shadow cursor-pointer" @click="handleGenerateVoucher(vo)">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-sm">{{ vo.name }}</p>
                    <p class="text-xs text-(--ui-text-muted)">{{ vo.description }}</p>
                  </div>
                  <UBadge variant="soft">Rp {{ vo.cashback_cost.toLocaleString('id-ID') }}</UBadge>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- Dynamic QR Code -->
        <div class="text-center space-y-3">
          <p class="text-sm text-(--ui-text-muted)">Tunjukkan QR ini ke kasir</p>
          <div class="inline-block p-4 bg-white rounded-xl border-2 animate-pulse-border">
            <div v-if="qrLoading" class="w-48 h-48 flex items-center justify-center">
              <UIcon name="i-lucide-loader-2" class="size-8 text-primary animate-spin" />
            </div>
            <img v-else-if="qrImageUrl" :src="qrImageUrl" alt="QR Code" class="w-48 h-48" />
          </div>
          <p class="text-xs text-(--ui-text-muted)">QR code diperbarui otomatis setiap 45 detik</p>
        </div>
      </UCard>

      <!-- My Vouchers (if membership with voucher mode) -->
      <UCard v-if="cardData.program?.type === 'membership' && cardData.membership_config?.cashback_redemption_mode === 'voucher'">
        <template #header><p class="font-semibold">Voucher Saya</p></template>
        <div v-if="!myVouchers.length" class="text-center py-4">
          <p class="text-sm text-(--ui-text-muted)">Belum ada voucher</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="v in myVouchers" :key="v.id" class="rounded-lg border p-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-sm">{{ v.membership_voucher_options?.name }}</p>
                <p class="text-xs text-(--ui-text-muted)">Kode: {{ v.code }}</p>
              </div>
              <UBadge :color="v.status === 'active' ? 'success' : 'neutral'" variant="soft" size="sm">
                {{ v.status === 'active' ? 'Aktif' : 'Dipakai' }}
              </UBadge>
            </div>
            <p class="text-xs text-(--ui-text-muted) mt-1">Berlaku sampai {{ new Date(v.expires_at).toLocaleDateString('id-ID') }}</p>
          </div>
        </div>
      </UCard>

      <!-- Wallet Buttons -->
      <UCard>
        <div class="space-y-3">
          <p class="text-sm font-medium text-center mb-4">Simpan ke Dompet Digital</p>
          <button class="w-full flex items-center justify-center gap-3 rounded-xl bg-black text-white py-3 px-4 text-sm font-medium hover:bg-black/90 transition-colors cursor-pointer" @click="addToWallet('apple')">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Tambahkan ke Apple Wallet
          </button>
          <button class="w-full flex items-center justify-center gap-3 rounded-xl bg-white border-2 border-gray-200 text-gray-800 py-3 px-4 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer" @click="addToWallet('google')">
            <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Tambahkan ke Google Wallet
          </button>
          <button class="w-full flex items-center justify-center gap-3 rounded-xl bg-[#1428A0] text-white py-3 px-4 text-sm font-medium hover:bg-[#1428A0]/90 transition-colors cursor-pointer" @click="addToWallet('samsung')">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5.9 3h12.2C20.28 3 22 4.72 22 6.9v10.2c0 2.18-1.72 3.9-3.9 3.9H5.9C3.72 21 2 19.28 2 17.1V6.9C2 4.72 3.72 3 5.9 3zm6.1 4c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>
            Tambahkan ke Samsung Wallet
          </button>
        </div>
      </UCard>

      <p class="text-center text-xs text-(--ui-text-muted)">Powered by <span class="font-heading font-semibold text-primary">PoinSaku</span></p>
    </div>

    <div v-else class="text-center">
      <UIcon name="i-lucide-loader-2" class="size-8 text-primary animate-spin mx-auto mb-3" />
      <p class="text-(--ui-text-muted)">Memuat kartu...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({ layout: false })

const route = useRoute()
const cpId = route.params.customerProgramId as string
const { fetchVouchers, generateVoucher } = useVoucher()
const toast = useToast()

const cardData = ref<any>(null)
const qrImageUrl = ref('')
const qrLoading = ref(true)
const myVouchers = ref<any[]>([])

let qrInterval: ReturnType<typeof setInterval> | null = null

const currentTierName = computed(() => {
  if (!cardData.value?.membership_state?.membership_tiers) return '-'
  return cardData.value.membership_state.membership_tiers.name || '-'
})

const currentTierColor = computed(() => {
  if (!cardData.value?.membership_state?.membership_tiers) return '#808080'
  return cardData.value.membership_state.membership_tiers.color || '#808080'
})

async function loadCard() {
  try {
    cardData.value = await $fetch(`/api/cards/${cpId}`)
  } catch {}
}

async function loadVouchers() {
  if (cardData.value?.program?.type !== 'membership') return
  if (cardData.value?.membership_config?.cashback_redemption_mode !== 'voucher') return
  try {
    myVouchers.value = await fetchVouchers(cpId, true) as any[]
  } catch {}
}

async function refreshQr() {
  qrLoading.value = true
  try {
    const result = await $fetch('/api/qr/generate', {
      method: 'POST',
      body: { customer_program_id: cpId },
    }) as any
    const payload = JSON.stringify({ t: result.token, cp: cpId })
    qrImageUrl.value = await QRCode.toDataURL(payload, { width: 256, margin: 2 })
  } catch {}
  finally { qrLoading.value = false }
}

async function handleGenerateVoucher(vo: any) {
  try {
    const qrResult = await $fetch('/api/qr/generate', {
      method: 'POST',
      body: { customer_program_id: cpId },
    }) as any

    await generateVoucher({
      customer_program_id: cpId,
      voucher_option_id: vo.id,
      qr_token: qrResult.token,
    })
    await loadCard()
    await loadVouchers()
    toast.add({ title: 'Voucher berhasil dibuat!', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal membuat voucher', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

async function addToWallet(provider: 'apple' | 'google' | 'samsung') {
  try {
    const result = await $fetch(`/api/wallet/${provider}`, {
      method: 'POST',
      body: { customer_program_id: cpId },
    }) as any
    if (result.saveUrl) window.open(result.saveUrl, '_blank')
    else if (result.message) toast.add({ title: result.message, color: 'info', icon: 'i-lucide-info' })
  } catch {
    toast.add({ title: 'Fitur wallet sedang dalam pengembangan', color: 'warning', icon: 'i-lucide-construction' })
  }
}

onMounted(async () => {
  await loadCard()
  await loadVouchers()
  await refreshQr()
  qrInterval = setInterval(refreshQr, 45000)
})

onUnmounted(() => {
  if (qrInterval) clearInterval(qrInterval)
})
</script>
