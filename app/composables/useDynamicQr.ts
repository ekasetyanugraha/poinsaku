export function useDynamicQr(customerProgramId: string) {
  const qrPayload = ref('')
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  let intervalId: ReturnType<typeof setInterval> | null = null

  async function fetchToken() {
    try {
      isLoading.value = true
      error.value = null

      const response = await $fetch('/api/qr/generate', {
        method: 'POST',
        body: { customer_program_id: customerProgramId },
      })

      qrPayload.value = JSON.stringify({
        t: (response as any).token,
        cp: customerProgramId,
      })
    } catch (e: any) {
      error.value = e.message || 'Failed to generate QR code'
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    fetchToken()
    // Refresh every 45 seconds (token expires in 60s)
    intervalId = setInterval(fetchToken, 45000)
  })

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return {
    qrPayload,
    isLoading,
    error,
    refresh: fetchToken,
  }
}
