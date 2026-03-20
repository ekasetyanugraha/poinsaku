<template>
  <div class="max-w-lg mx-auto">
    <!-- SCAN STATE -->
    <div v-if="state === 'scan'" class="text-center space-y-6">
      <div>
        <h1 class="text-xl font-heading font-bold">Scan QR Pelanggan</h1>
        <p class="text-muted">Arahkan kamera ke QR code pelanggan</p>
      </div>

      <!-- Camera viewfinder -->
      <div class="relative rounded-2xl overflow-hidden bg-black/90 aspect-square max-w-sm mx-auto shadow-lg ring-1 ring-white/10">
        <video ref="videoRef" class="w-full h-full object-cover" autoplay playsinline />
        <div class="absolute inset-0">
          <!-- Corner brackets -->
          <div class="absolute top-6 left-6 w-10 h-10 border-t-3 border-l-3 border-primary rounded-tl-lg animate-corner-pulse" />
          <div class="absolute top-6 right-6 w-10 h-10 border-t-3 border-r-3 border-primary rounded-tr-lg animate-corner-pulse" />
          <div class="absolute bottom-6 left-6 w-10 h-10 border-b-3 border-l-3 border-primary rounded-bl-lg animate-corner-pulse" />
          <div class="absolute bottom-6 right-6 w-10 h-10 border-b-3 border-r-3 border-primary rounded-br-lg animate-corner-pulse" />
          <!-- Scan line -->
          <div v-if="cameraActive" class="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
        </div>
      </div>

      <div class="space-y-3">
        <UButton v-if="!cameraActive" class="w-full cursor-pointer" size="lg" @click="startCamera">
          <UIcon name="i-lucide-camera" class="size-4.5 mr-2" />
          Mulai Scan
        </UButton>
        <UButton v-else variant="outline" class="w-full cursor-pointer" @click="stopCamera">
          <UIcon name="i-lucide-camera-off" class="size-4.5 mr-2" />
          Hentikan Kamera
        </UButton>

        <div class="pt-4 border-t">
          <p class="text-sm text-muted mb-2">Atau masukkan kode manual:</p>
          <div class="flex gap-2">
            <div class="flex-1">
              <UInput v-model="manualCode" placeholder="Paste QR data..." icon="i-lucide-qr-code" />
            </div>
            <UButton class="cursor-pointer" @click="handleManualEntry">Verifikasi</UButton>
          </div>
        </div>
      </div>

      <div v-if="scanError" class="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
        <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
        <span>{{ scanError }}</span>
      </div>
    </div>

    <!-- CUSTOMER STATE -->
    <div v-else-if="state === 'customer'" class="space-y-4">
      <UButton variant="ghost" class="cursor-pointer" @click="resetState">
        <UIcon name="i-lucide-arrow-left" class="size-4 mr-2" />
        Scan Baru
      </UButton>

      <!-- Customer Info Card -->
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-heading font-bold text-lg">
              {{ verifiedData?.customer_program?.customers?.name?.charAt(0) }}
            </div>
            <div>
              <p class="font-semibold">{{ verifiedData?.customer_program?.customers?.name }}</p>
              <p class="text-sm text-muted">{{ verifiedData?.customer_program?.customers?.phone }}</p>
            </div>
            <UBadge :color="programType === 'stamp' ? 'primary' : 'warning'" variant="soft" class="ml-auto">
              {{ programType === 'stamp' ? 'Stempel' : 'Membership' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-3">
          <p class="text-sm text-muted">{{ verifiedData?.customer_program?.programs?.name }}</p>

          <!-- STAMP INFO -->
          <template v-if="programType === 'stamp'">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">Stempel</p>
              <p class="text-sm">{{ stampState?.current_stamps }} stempel</p>
            </div>
          </template>

          <!-- MEMBERSHIP INFO -->
          <template v-if="programType === 'membership'">
            <div class="rounded-lg bg-(--ui-bg-muted)/50 p-3 space-y-1">
              <p class="text-sm">
                <span class="text-muted">Tier:</span>
                <strong> {{ membershipState?.membership_tiers?.name }}</strong>
                ({{ membershipState?.membership_tiers?.cashback_percentage }}% cashback)
              </p>
              <p class="text-sm">
                <span class="text-muted">Saldo:</span>
                <strong> Rp {{ (membershipState?.cashback_balance || 0).toLocaleString('id-ID') }}</strong>
              </p>
              <p class="text-xs text-muted">
                Total belanja: Rp {{ (membershipState?.total_spend || 0).toLocaleString('id-ID') }}
              </p>
            </div>
          </template>
        </div>
      </UCard>

      <!-- STAMP ACTION CARD -->
      <UCard v-if="programType === 'stamp'" class="glass">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="font-medium">Jumlah Stempel</label>
            <div class="flex items-center gap-3">
              <UButton variant="outline" square aria-label="Kurangi stempel" class="cursor-pointer" size="sm" @click="stampCount = Math.max(1, stampCount - 1)">
                <UIcon name="i-lucide-minus" class="size-4" />
              </UButton>
              <span class="text-xl font-heading font-bold w-8 text-center">{{ stampCount }}</span>
              <UButton variant="outline" square aria-label="Tambah stempel" class="cursor-pointer" size="sm" @click="stampCount = Math.min(10, stampCount + 1)">
                <UIcon name="i-lucide-plus" class="size-4" />
              </UButton>
            </div>
          </div>

          <UButton class="w-full cursor-pointer" size="lg" :loading="actionLoading" @click="handleAddStamp">
            <UIcon name="i-lucide-stamp" class="size-4.5 mr-2" />
            Tambah {{ stampCount }} Stempel
          </UButton>

          <UButton
            v-if="canRedeemStamp"
            class="w-full cursor-pointer animate-pulse-badge"
            size="lg"
            variant="soft"
            :loading="redeemLoading"
            @click="handleRedeemStamp"
          >
            <UIcon name="i-lucide-gift" class="size-4.5 mr-2" />
            Tukarkan Hadiah
          </UButton>
        </div>
      </UCard>

      <!-- MEMBERSHIP ACTION CARD -->
      <UCard v-if="programType === 'membership'" class="glass">
        <div class="space-y-4">
          <h4 class="font-medium">Catat Transaksi</h4>
          <UFormField label="Nominal Transaksi (Rp)">
            <UInput v-model.number="txAmount" type="number" placeholder="50000" class="w-full" />
          </UFormField>
          <p v-if="txAmount > 0" class="text-sm text-muted">
            Cashback: <strong>Rp {{ calculatedCashback.toLocaleString('id-ID') }}</strong>
            ({{ membershipState?.membership_tiers?.cashback_percentage }}%)
          </p>
          <UButton
            class="w-full cursor-pointer"
            size="lg"
            :loading="actionLoading"
            :disabled="!txAmount || txAmount <= 0"
            @click="handleRecordCashback"
          >
            <UIcon name="i-lucide-receipt" class="size-4.5 mr-2" />
            Catat & Berikan Cashback
          </UButton>

          <hr class="border-default" />

          <!-- Cashback redemption -->
          <h4 class="font-medium">Potong Cashback</h4>
          <UFormField label="Nominal Potongan (Rp)">
            <UInput v-model.number="redeemAmount" type="number" placeholder="10000" class="w-full" />
          </UFormField>
          <UButton
            class="w-full cursor-pointer"
            variant="outline"
            :loading="redeemLoading"
            :disabled="!redeemAmount || redeemAmount <= 0"
            @click="handleRedeemCashback"
          >
            <UIcon name="i-lucide-wallet" class="size-4.5 mr-2" />
            Potong Rp {{ (redeemAmount || 0).toLocaleString('id-ID') }}
          </UButton>

          <hr class="border-default" />

          <!-- Voucher redemption -->
          <h4 class="font-medium">Redeem Voucher</h4>
          <div class="flex gap-2">
            <div class="flex-1">
              <UInput v-model="voucherCode" placeholder="Kode voucher..." />
            </div>
            <UButton class="cursor-pointer" :loading="voucherLoading" @click="handleRedeemVoucher">Redeem</UButton>
          </div>
        </div>
      </UCard>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cashier' })

const { addStamps, redeemStamps, recordCashback, redeemCashback, verifyQr } = useTransaction()
const { redeemVoucher } = useVoucher()
const toast = useToast()

const state = ref<'scan' | 'customer'>('scan')
const videoRef = ref<HTMLVideoElement | null>(null)
const cameraActive = ref(false)
const manualCode = ref('')
const scanError = ref('')
const actionLoading = ref(false)
const redeemLoading = ref(false)
const voucherLoading = ref(false)

// Verified customer data
const verifiedData = ref<any>(null)
const customerProgramId = ref('')
const branchId = ref('')

const programType = computed(() => verifiedData.value?.customer_program?.programs?.type || '')
const stampState = computed(() => programType.value === 'stamp' ? verifiedData.value?.state : null)
const membershipState = computed(() => programType.value === 'membership' ? verifiedData.value?.state : null)

// Stamp controls
const stampCount = ref(1)
const canRedeemStamp = computed(() => false) // Requires stamp config target to determine

// Membership controls
const txAmount = ref(0)
const redeemAmount = ref(0)
const voucherCode = ref('')
const calculatedCashback = computed(() => {
  if (!txAmount.value || !membershipState.value?.membership_tiers?.cashback_percentage) return 0
  return Math.round(txAmount.value * (membershipState.value.membership_tiers.cashback_percentage / 100) * 100) / 100
})

let stream: MediaStream | null = null
let scanInterval: ReturnType<typeof setInterval> | null = null

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      cameraActive.value = true
      startScanning()
    }
  } catch {
    scanError.value = 'Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.'
  }
}

function stopCamera() {
  stream?.getTracks().forEach(track => track.stop())
  stream = null
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null }
  cameraActive.value = false
}

function startScanning() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  scanInterval = setInterval(async () => {
    if (!videoRef.value || !ctx) return
    canvas.width = videoRef.value.videoWidth
    canvas.height = videoRef.value.videoHeight
    ctx.drawImage(videoRef.value, 0, 0)

    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        const barcodes = await detector.detect(canvas)
        if (barcodes.length > 0) handleScanResult(barcodes[0].rawValue)
      } catch {}
    }
  }, 500)
}

async function handleScanResult(data: string) {
  stopCamera()
  scanError.value = ''
  try {
    const parsed = JSON.parse(data)
    if (parsed.t && parsed.cp) await verifyAndLoad(parsed.t, parsed.cp)
    else scanError.value = 'QR code tidak valid'
  } catch { scanError.value = 'QR code tidak valid' }
}

async function handleManualEntry() {
  if (!manualCode.value) return
  scanError.value = ''
  try {
    const parsed = JSON.parse(manualCode.value)
    if (parsed.t && parsed.cp) await verifyAndLoad(parsed.t, parsed.cp)
    else scanError.value = 'Data tidak valid'
  } catch { scanError.value = 'Format data tidak valid' }
}

async function verifyAndLoad(token: string, cpId: string) {
  try {
    const result = await verifyQr(token, cpId) as any
    verifiedData.value = result
    customerProgramId.value = cpId
    // Resolve branch_id from the customer_program
    branchId.value = result.customer_program?.branch_id || ''
    state.value = 'customer'
  } catch (e: any) {
    scanError.value = e.data?.message || e.message || 'QR code tidak valid atau sudah kedaluwarsa'
  }
}

async function handleAddStamp() {
  actionLoading.value = true
  try {
    const result = await addStamps({
      customer_program_id: customerProgramId.value,
      branch_id: branchId.value,
      stamps_count: stampCount.value,
    }) as any
    if (verifiedData.value?.state) {
      verifiedData.value.state.current_stamps = result.stamp_progress?.current_stamps ?? verifiedData.value.state.current_stamps
    }
    toast.add({ title: `Berhasil menambahkan ${stampCount.value} stempel!`, color: 'success', icon: 'i-lucide-check' })
    stampCount.value = 1
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menambah stempel', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function handleRedeemStamp() {
  redeemLoading.value = true
  try {
    const result = await redeemStamps({
      customer_program_id: customerProgramId.value,
      branch_id: branchId.value,
    }) as any
    if (verifiedData.value?.state) {
      verifiedData.value.state.current_stamps = result.stamp_progress?.current_stamps ?? 0
    }
    toast.add({ title: 'Hadiah berhasil ditukarkan!', color: 'success', icon: 'i-lucide-gift' })
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menukarkan hadiah', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    redeemLoading.value = false
  }
}

async function handleRecordCashback() {
  actionLoading.value = true
  try {
    const result = await recordCashback({
      customer_program_id: customerProgramId.value,
      branch_id: branchId.value,
      transaction_amount: txAmount.value,
    }) as any
    if (verifiedData.value?.state) {
      verifiedData.value.state = result.state
    }
    const cb = result.transaction?.cashback_amount ?? calculatedCashback.value
    let msg = `Cashback Rp ${cb.toLocaleString('id-ID')} berhasil dicatat!`
    if (result.tier_upgrade) msg += ' Pelanggan naik tier!'
    toast.add({ title: msg, color: 'success', icon: 'i-lucide-check' })
    txAmount.value = 0
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal mencatat cashback', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function handleRedeemCashback() {
  redeemLoading.value = true
  try {
    const result = await redeemCashback({
      customer_program_id: customerProgramId.value,
      branch_id: branchId.value,
      amount: redeemAmount.value,
    }) as any
    if (verifiedData.value?.state) {
      verifiedData.value.state = result.state
    }
    toast.add({ title: `Cashback Rp ${redeemAmount.value.toLocaleString('id-ID')} berhasil dipotong!`, color: 'success', icon: 'i-lucide-check' })
    redeemAmount.value = 0
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal memotong cashback', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    redeemLoading.value = false
  }
}

async function handleRedeemVoucher() {
  if (!voucherCode.value) return
  voucherLoading.value = true
  try {
    await redeemVoucher(voucherCode.value)
    toast.add({ title: 'Voucher berhasil di-redeem!', color: 'success', icon: 'i-lucide-check' })
    voucherCode.value = ''
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Voucher tidak valid', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    voucherLoading.value = false
  }
}

function resetState() {
  state.value = 'scan'
  verifiedData.value = null
  customerProgramId.value = ''
  branchId.value = ''
  stampCount.value = 1
  txAmount.value = 0
  redeemAmount.value = 0
  voucherCode.value = ''
  scanError.value = ''
  manualCode.value = ''
}

onUnmounted(() => stopCamera())
</script>
