<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  programId: string
  programName: string
}>()

const open = defineModel<boolean>('open', { default: false })

const config = useRuntimeConfig()
const qrImageUrl = ref('')

const joinUrl = computed(() => `${config.public.appUrl}/join/${props.programId}`)

watch([() => props.programId, open], async ([id, isOpen]) => {
  if (!id || !isOpen) return
  qrImageUrl.value = await QRCode.toDataURL(joinUrl.value, {
    width: 512,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}, { immediate: true })

function downloadQr() {
  if (!qrImageUrl.value) return
  const link = document.createElement('a')
  link.download = `qr-${props.programName.replace(/\s+/g, '-').toLowerCase()}.png`
  link.href = qrImageUrl.value
  link.click()
}
</script>

<template>
  <UModal v-model:open="open" :title="programName" description="Pelanggan scan QR ini untuk mendaftar">
    <template #body>
      <div class="flex flex-col items-center gap-4">
        <div v-if="qrImageUrl" class="rounded-xl border border-(--ui-border) p-3 bg-white">
          <img :src="qrImageUrl" :alt="`QR Code ${programName}`" class="w-64 h-64" />
        </div>
        <p class="text-xs text-(--ui-text-muted) text-center break-all px-4">{{ joinUrl }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full">
        <UButton variant="outline" class="flex-1" icon="i-lucide-copy" @click="navigator.clipboard.writeText(joinUrl)">
          Salin Link
        </UButton>
        <UButton class="flex-1" icon="i-lucide-download" @click="downloadQr">
          Download QR
        </UButton>
      </div>
    </template>
  </UModal>
</template>
