<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ layout: 'dashboard' })
const router = useRouter()
const { businessSlug, activeBusinessId, activeBusiness } = useBusiness()
const { branches } = useBranch()
const { createProgram } = useProgram()
const toast = useToast()

const scopeTypeItems = [
  { label: 'Semua Cabang', value: 'business' },
  { label: 'Cabang Tertentu', value: 'branch' },
]
const stampModeItems = [
  { label: 'Per Transaksi', value: 'per_transaction' },
  { label: 'Berdasarkan Nominal', value: 'amount_based' },
]
const cashbackModeItems = [
  { label: 'Potongan Transaksi', value: 'transaction_deduction' },
  { label: 'Voucher', value: 'voucher' },
]
const upgradeRuleItems = [
  { label: 'Manual', value: 'manual_only' },
  { label: 'Total Belanja', value: 'total_spend' },
  { label: 'Jumlah Transaksi', value: 'transaction_count' },
]
const branchItems = computed(() => branches.value.map((b: any) => ({ label: b.name, value: b.id })))

const step = ref(1) // 1: type, 2: form
const form = reactive({
  type: '' as 'stamp' | 'membership' | '',
  name: '',
  description: '',
  scope_type: 'business' as 'business' | 'branch',
  scope_ids: [] as string[],
  color_primary: '#6366f1',
  color_secondary: '#ffffff',
  // stamp config
  stamp_target: 10,
  stamp_mode: 'per_transaction' as 'per_transaction' | 'amount_based',
  amount_per_stamp: undefined as number | undefined,
  stamps_per_transaction: 1,
  reward_description: '',
  // membership config
  cashback_redemption_mode: 'transaction_deduction' as 'transaction_deduction' | 'voucher',
  tiers: [
    { name: 'Bronze', rank: 1, cashback_percentage: 1, auto_upgrade_rule_type: 'manual_only' as const, auto_upgrade_threshold: undefined as number | undefined, color: '#CD7F32' },
  ] as Array<{ name: string; rank: number; cashback_percentage: number; auto_upgrade_rule_type: string; auto_upgrade_threshold: number | undefined; color: string }>,
})

const submitting = ref(false)

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Warna tidak valid')

const tierSchema = z.object({
  name: z.string().min(1, 'Nama tier wajib diisi'),
  rank: z.number(),
  cashback_percentage: z.number().min(0, 'Minimal 0').max(100, 'Maksimal 100'),
  auto_upgrade_rule_type: z.string(),
  auto_upgrade_threshold: z.number().positive('Harus lebih dari 0').optional(),
  color: z.string(),
}).refine(
  t => t.auto_upgrade_rule_type === 'manual_only' || (t.auto_upgrade_threshold != null && t.auto_upgrade_threshold > 0),
  { message: 'Threshold wajib diisi', path: ['auto_upgrade_threshold'] },
)

const schema = computed(() => {
  const base: Record<string, z.ZodTypeAny> = {
    name: z.string().min(1, 'Nama program wajib diisi').max(100, 'Nama maksimal 100 karakter'),
    scope_type: z.enum(['business', 'branch']),
    color_primary: hexColor,
    color_secondary: hexColor,
  }

  if (form.scope_type === 'branch') {
    base.scope_ids = z.array(z.string().uuid()).min(1, 'Pilih minimal 1 cabang')
  }

  if (form.type === 'stamp') {
    base.stamp_target = z.number({ error: 'Target wajib diisi' }).int().min(1, 'Minimal 1').max(30, 'Maksimal 30')
    base.stamp_mode = z.enum(['per_transaction', 'amount_based'])
    if (form.stamp_mode === 'amount_based') {
      base.amount_per_stamp = z.number({ error: 'Nominal wajib diisi' }).positive('Harus lebih dari 0')
    }
    base.stamps_per_transaction = z.number({ error: 'Stempel per transaksi wajib diisi' }).int().min(1, 'Minimal 1')
  }

  if (form.type === 'membership') {
    base.cashback_redemption_mode = z.enum(['transaction_deduction', 'voucher'])
    base.tiers = z.array(tierSchema).min(1, 'Minimal 1 tier')
  }

  return z.object(base)
})

// Default scope_id to business id
watch(() => form.scope_type, () => {
  form.scope_ids = []
})

function addTier() {
  const nextRank = form.tiers.length + 1
  form.tiers.push({ name: '', rank: nextRank, cashback_percentage: 0, auto_upgrade_rule_type: 'manual_only', auto_upgrade_threshold: undefined, color: '#808080' })
}

function removeTier(index: number) {
  form.tiers.splice(index, 1)
  form.tiers.forEach((t, i) => t.rank = i + 1)
}

async function handleSubmit() {
  if (!activeBusinessId.value || !form.type) return
  submitting.value = true
  try {
    const scopeIds = form.scope_type === 'business'
      ? [activeBusinessId.value!]
      : form.scope_ids

    for (const scopeId of scopeIds) {
      const payload: Record<string, unknown> = {
        business_id: activeBusinessId.value,
        type: form.type,
        name: form.name,
        description: form.description || undefined,
        scope_type: form.scope_type,
        scope_id: scopeId,
        color_primary: form.color_primary,
        color_secondary: form.color_secondary,
      }
      if (form.type === 'stamp') {
        payload.stamp_config = {
          stamp_target: form.stamp_target,
          stamp_mode: form.stamp_mode,
          amount_per_stamp: form.stamp_mode === 'amount_based' ? form.amount_per_stamp : undefined,
          stamps_per_transaction: form.stamps_per_transaction,
          reward_description: form.reward_description || undefined,
        }
      } else {
        payload.membership_config = { cashback_redemption_mode: form.cashback_redemption_mode }
        payload.tiers = form.tiers
      }
      await createProgram(payload as any)
    }
    toast.add({ title: 'Program berhasil dibuat', color: 'success', icon: 'i-lucide-check' })
    router.push(`/dashboard/${businessSlug.value}/programs`)
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal membuat program', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Program Baru</h1>
    </div>

    <!-- Step 1: Type selection -->
    <div v-if="step === 1" class="grid gap-3 md:grid-cols-2">
      <UCard class="glass-card cursor-pointer hover:shadow-lg transition-shadow" @click="form.type = 'stamp'; step = 2">
        <div class="text-center py-4">
          <UIcon name="i-lucide-stamp" class="size-7 text-primary-500 mx-auto mb-4" />
          <h3 class="text-sm font-medium">Kartu Stempel</h3>
          <p class="text-sm text-(--ui-text-muted) mt-2">Kumpulkan stempel, dapatkan hadiah</p>
        </div>
      </UCard>
      <UCard class="glass-card cursor-pointer hover:shadow-lg transition-shadow" @click="form.type = 'membership'; step = 2">
        <div class="text-center py-4">
          <UIcon name="i-lucide-crown" class="size-7 text-amber-500 mx-auto mb-4" />
          <h3 class="text-sm font-medium">Membership</h3>
          <p class="text-sm text-(--ui-text-muted) mt-2">Tier, cashback, dan voucher</p>
        </div>
      </UCard>
    </div>

    <!-- Step 2: Form -->
    <UCard v-else class="glass-card">
      <UForm :schema="schema" :state="form" class="space-y-3" @submit="handleSubmit">
        <div class="flex items-center gap-2 mb-4">
          <UButton variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="step = 1" />
          <UBadge :color="form.type === 'stamp' ? 'primary' : 'warning'" variant="soft">
            {{ form.type === 'stamp' ? 'Stempel' : 'Membership' }}
          </UBadge>
        </div>

        <!-- Base fields -->
        <UFormField label="Nama Program" name="name" required>
          <UInput v-model="form.name" placeholder="contoh: Loyalty Kopi" />
        </UFormField>
        <UFormField label="Deskripsi" name="description">
          <UInput v-model="form.description" placeholder="Deskripsi singkat" />
        </UFormField>
        <UFormField label="Cakupan" name="scope_type">
          <URadioGroup v-model="form.scope_type" orientation="horizontal" :items="scopeTypeItems" />
        </UFormField>
        <UFormField v-if="form.scope_type === 'branch'" label="Pilih Cabang" name="scope_ids">
          <USelectMenu v-model="form.scope_ids" multiple value-key="value" :items="branchItems" placeholder="-- Pilih Cabang --" />
        </UFormField>
        <div class="flex gap-4">
          <UFormField label="Warna Utama" name="color_primary">
            <UColorPicker v-model="form.color_primary" size="sm" />
          </UFormField>
          <UFormField label="Warna Sekunder" name="color_secondary">
            <UColorPicker v-model="form.color_secondary" size="sm" />
          </UFormField>
        </div>

        <!-- Stamp config -->
        <template v-if="form.type === 'stamp'">
          <hr class="border-(--ui-border)" />
          <h3 class="text-sm font-medium">Pengaturan Stempel</h3>
          <UFormField label="Target Stempel" name="stamp_target" required>
            <UInput v-model.number="form.stamp_target" type="number" min="1" max="30" />
          </UFormField>
          <UFormField label="Mode Stempel" name="stamp_mode">
            <URadioGroup v-model="form.stamp_mode" orientation="horizontal" :items="stampModeItems" />
          </UFormField>
          <UFormField v-if="form.stamp_mode === 'amount_based'" label="Nominal per Stempel (Rp)" name="amount_per_stamp" required>
            <UInput v-model.number="form.amount_per_stamp" type="number" min="1" />
          </UFormField>
          <UFormField v-if="form.stamp_mode === 'per_transaction'" label="Stempel per Transaksi" name="stamps_per_transaction" required>
            <UInput v-model.number="form.stamps_per_transaction" type="number" min="1" />
          </UFormField>
          <UFormField label="Deskripsi Hadiah" name="reward_description">
            <UInput v-model="form.reward_description" placeholder="contoh: Gratis 1 kopi" />
          </UFormField>
        </template>

        <!-- Membership config -->
        <template v-if="form.type === 'membership'">
          <hr class="border-(--ui-border)" />
          <h3 class="text-sm font-medium">Pengaturan Membership</h3>
          <UFormField label="Mode Cashback" name="cashback_redemption_mode">
            <URadioGroup v-model="form.cashback_redemption_mode" orientation="horizontal" :items="cashbackModeItems" />
          </UFormField>

          <h4 class="font-semibold mt-4">Tier</h4>
          <div v-for="(tier, i) in form.tiers" :key="i" class="p-4 rounded-lg border border-default space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Tier {{ tier.rank }}</span>
              <UButton v-if="form.tiers.length > 1" variant="ghost" color="error" icon="i-lucide-trash-2" size="xs" @click="removeTier(i)" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Nama" :name="`tiers.${i}.name`">
                <UInput v-model="tier.name" placeholder="Bronze" />
              </UFormField>
              <UFormField label="Cashback (%)" :name="`tiers.${i}.cashback_percentage`">
                <UInput v-model.number="tier.cashback_percentage" type="number" min="0" max="100" step="0.1" />
              </UFormField>
            </div>
            <UFormField label="Auto Upgrade" :name="`tiers.${i}.auto_upgrade_rule_type`">
              <USelect v-model="tier.auto_upgrade_rule_type" :items="upgradeRuleItems" />
            </UFormField>
            <UFormField v-if="tier.auto_upgrade_rule_type !== 'manual_only'" label="Threshold" :name="`tiers.${i}.auto_upgrade_threshold`">
              <UInput v-model.number="tier.auto_upgrade_threshold" type="number" min="1" />
            </UFormField>
          </div>
          <UButton variant="outline" icon="i-lucide-plus" size="sm" @click="addTier">Tambah Tier</UButton>
        </template>

        <div class="flex gap-3 pt-4">
          <NuxtLink :to="`/dashboard/${businessSlug}/programs`">
            <UButton variant="outline" type="button">Batal</UButton>
          </NuxtLink>
          <UButton type="submit" :loading="submitting">Buat Program</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
