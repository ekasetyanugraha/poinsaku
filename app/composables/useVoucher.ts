export function useVoucher() {
  async function fetchVouchers(customerProgramId: string, includeAll = false) {
    return await $fetch('/api/vouchers', { query: { customer_program_id: customerProgramId, include_all: includeAll || undefined } })
  }

  async function generateVoucher(data: { customer_program_id: string; voucher_option_id: string; qr_token: string }) {
    return await $fetch('/api/vouchers/generate', { method: 'POST', body: data })
  }

  async function redeemVoucher(voucherId: string) {
    return await $fetch(`/api/vouchers/${voucherId}/redeem`, { method: 'POST' })
  }

  return { fetchVouchers, generateVoucher, redeemVoucher }
}
