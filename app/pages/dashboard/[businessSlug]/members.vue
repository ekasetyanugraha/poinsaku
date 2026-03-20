<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })
const { businessSlug, activeBusinessId } = useBusiness()
const { members, loading, inviteMember, updateMember, removeMember } = useMember()
const { branches } = useBranch()
const { isOwner } = usePermission()
const toast = useToast()

const roleItems = [
  { label: 'Admin', value: 'admin' },
  { label: 'Kasir', value: 'cashier' },
]
const scopeTypeItems = [
  { label: 'Bisnis', value: 'business' },
  { label: 'Cabang', value: 'branch' },
]
const branchItems = computed(() => branches.value.map((b: any) => ({ label: b.name, value: b.id })))

const showInvite = ref(false)
const inviteForm = reactive({
  auth_user_id: '',
  role: 'cashier' as 'admin' | 'cashier',
  scope_type: 'business' as 'business' | 'branch',
  scope_id: '',
})
const inviting = ref(false)

watch(() => inviteForm.scope_type, (type) => {
  if (type === 'business' && activeBusinessId.value) {
    inviteForm.scope_id = activeBusinessId.value
  } else {
    inviteForm.scope_id = ''
  }
}, { immediate: true })

async function handleInvite() {
  inviting.value = true
  try {
    await inviteMember({
      auth_user_id: inviteForm.auth_user_id,
      role: inviteForm.role,
      scope_type: inviteForm.scope_type,
      scope_id: inviteForm.scope_id,
    })
    toast.add({ title: 'Anggota berhasil diundang', color: 'success', icon: 'i-lucide-check' })
    showInvite.value = false
    inviteForm.auth_user_id = ''
    inviteForm.role = 'cashier'
    inviteForm.scope_type = 'business'
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal mengundang anggota', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    inviting.value = false
  }
}

async function handleRemove(id: string) {
  if (!confirm('Hapus anggota tim ini?')) return
  try {
    await removeMember(id)
    toast.add({ title: 'Anggota berhasil dihapus', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: e.data?.message || e.message || 'Gagal menghapus anggota', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

function roleLabel(role: string) {
  const map: Record<string, string> = { owner: 'Pemilik', admin: 'Admin', cashier: 'Kasir' }
  return map[role] || role
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h1 class="text-lg font-semibold">Anggota Tim</h1>
        <p class="text-sm text-(--ui-text-muted)">Kelola tim bisnis Anda</p>
      </div>
      <UButton icon="i-lucide-plus" @click="showInvite = !showInvite">Undang Anggota</UButton>
    </div>

    <!-- Invite form -->
    <UCard v-if="showInvite" class="glass-card mb-4">
      <form @submit.prevent="handleInvite" class="space-y-3">
        <UFormField label="User ID (Auth)" required>
          <UInput v-model="inviteForm.auth_user_id" placeholder="UUID pengguna" />
        </UFormField>
        <UFormField label="Peran">
          <URadioGroup v-model="inviteForm.role" orientation="horizontal" :items="roleItems" />
        </UFormField>
        <UFormField label="Cakupan">
          <URadioGroup v-model="inviteForm.scope_type" orientation="horizontal" :items="scopeTypeItems" />
        </UFormField>
        <UFormField v-if="inviteForm.scope_type === 'branch'" label="Pilih Cabang">
          <USelect v-model="inviteForm.scope_id" :items="branchItems" placeholder="-- Pilih --" />
        </UFormField>
        <div class="flex gap-3">
          <UButton type="submit" :loading="inviting">Undang</UButton>
          <UButton variant="outline" @click="showInvite = false">Batal</UButton>
        </div>
      </form>
    </UCard>

    <!-- Members list -->
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!members.length" class="text-center py-8">
      <p class="text-(--ui-text-muted)">Belum ada anggota tim</p>
    </div>

    <div v-else class="space-y-3">
      <UCard v-for="m in members" :key="m.id" class="glass-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">{{ m.auth_user_id }}</p>
            <div class="flex items-center gap-2 mt-1">
              <UBadge :color="m.role === 'owner' ? 'error' : m.role === 'admin' ? 'warning' : 'neutral'" variant="soft" size="sm">
                {{ roleLabel(m.role) }}
              </UBadge>
              <UBadge variant="outline" size="sm">
                {{ m.scope_type === 'business' ? 'Bisnis' : 'Cabang' }}
              </UBadge>
            </div>
          </div>
          <UButton v-if="isOwner && m.role !== 'owner'" variant="ghost" color="error" icon="i-lucide-trash-2" size="sm" @click="handleRemove(m.id)" />
        </div>
      </UCard>
    </div>
  </div>
</template>
