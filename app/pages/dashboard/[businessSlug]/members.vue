<script setup lang="ts">
import { relativeTime } from '~/composables/useStaff'

definePageMeta({ layout: 'dashboard', middleware: ['auth'] })

const { staff, loading, createStaff, resetPassword, toggleStatus, reassignBranch, deleteStaff } = useStaff()
const { branches } = useBranch()
const { isOwner } = usePermission()
const { activeBusinessId } = useBusiness()
const toast = useToast()

// --- Slideover state ---
const showCreate = ref(false)
const creating = ref(false)
const createForm = reactive({
  email: '',
  password: '',
  display_name: '',
  role: 'cashier' as 'admin' | 'cashier',
  scope_type: '' as '' | 'business' | 'branch',
  scope_id: '',
})

watch(() => createForm.scope_type, (type) => {
  if (type === 'business' && activeBusinessId.value) {
    createForm.scope_id = activeBusinessId.value
  } else {
    createForm.scope_id = ''
  }
})

// --- Action modal state ---
const selectedStaff = ref<any>(null)
const showDeleteConfirm = ref(false)
const showDeactivateConfirm = ref(false)
const showPasswordReset = ref(false)
const showBranchReassign = ref(false)
const actionLoading = ref(false)
const newPassword = ref('')
const newBranchScopeType = ref<'business' | 'branch'>('branch')
const newBranchId = ref('')

// --- Computed helpers ---
const branchItems = computed(() => branches.value.map((b: any) => ({ label: b.name, value: b.id })))
const scopeTypeItems = [
  { label: 'Bisnis', value: 'business' },
  { label: 'Cabang', value: 'branch' },
]
const roleItems = [
  { label: 'Admin', value: 'admin' },
  { label: 'Kasir', value: 'cashier' },
]

// --- Helper functions ---
function staffDisplayName(member: any) {
  return member?.display_name || member?.email || member?.auth_user_id
}

function roleLabel(role: string) {
  const map: Record<string, string> = { owner: 'Pemilik', admin: 'Admin', cashier: 'Kasir' }
  return map[role] || role
}

function roleBadgeColor(role: string) {
  const map: Record<string, string> = { owner: 'primary', admin: 'warning', cashier: 'neutral' }
  return map[role] || 'neutral'
}

function scopeLabel(member: any) {
  if (!member) return ''
  if (member.scope_type === 'business') return 'Bisnis'
  const branch = branches.value.find((b: any) => b.id === member.scope_id)
  return branch?.name ?? 'Tanpa Cabang'
}

// --- Dropdown items factory ---
function getActionItems(member: any) {
  const items: any[] = []

  const nonDestructive = [
    {
      label: 'Reset Password',
      icon: 'i-lucide-key',
      onSelect: () => { selectedStaff.value = member; newPassword.value = ''; showPasswordReset.value = true },
    },
    {
      label: 'Pindah Cabang',
      icon: 'i-lucide-git-branch',
      onSelect: () => { selectedStaff.value = member; newBranchId.value = ''; showBranchReassign.value = true },
    },
  ]
  items.push(nonDestructive)

  const destructive: any[] = []
  if (member.is_active) {
    destructive.push({
      label: 'Nonaktifkan',
      icon: 'i-lucide-user-x',
      color: 'error' as const,
      onSelect: () => { selectedStaff.value = member; showDeactivateConfirm.value = true },
    })
  } else {
    items.push([{
      label: 'Aktifkan',
      icon: 'i-lucide-user-check',
      onSelect: () => handleReactivate(member),
    }])
  }

  destructive.push({
    label: 'Hapus',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => { selectedStaff.value = member; showDeleteConfirm.value = true },
  })
  items.push(destructive)

  return items
}

// --- Handler functions ---
async function handleCreate() {
  creating.value = true
  try {
    await createStaff({
      email: createForm.email,
      password: createForm.password,
      display_name: createForm.display_name || undefined,
      role: createForm.role,
      scope_type: createForm.scope_type as 'business' | 'branch',
      scope_id: createForm.scope_id,
    })
    toast.add({ title: 'Staff berhasil dibuat', color: 'success', icon: 'i-lucide-check' })
    showCreate.value = false
    createForm.email = ''
    createForm.password = ''
    createForm.display_name = ''
    createForm.role = 'cashier'
    createForm.scope_type = ''
    createForm.scope_id = ''
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal membuat staff', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    creating.value = false
  }
}

async function handleDelete() {
  actionLoading.value = true
  try {
    await deleteStaff(selectedStaff.value.id)
    toast.add({ title: 'Staff berhasil dihapus', color: 'success', icon: 'i-lucide-check' })
    showDeleteConfirm.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal menghapus staff', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function handleDeactivate() {
  actionLoading.value = true
  try {
    await toggleStatus(selectedStaff.value.id, 'deactivate')
    toast.add({ title: 'Staff berhasil dinonaktifkan', color: 'success', icon: 'i-lucide-check' })
    showDeactivateConfirm.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal menonaktifkan staff', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function handleReactivate(member: any) {
  try {
    await toggleStatus(member.id, 'reactivate')
    toast.add({ title: 'Staff berhasil diaktifkan', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal mengaktifkan staff', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

async function handlePasswordReset() {
  actionLoading.value = true
  try {
    await resetPassword(selectedStaff.value.id, newPassword.value)
    toast.add({ title: 'Password berhasil diubah', color: 'success', icon: 'i-lucide-check' })
    showPasswordReset.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal mengubah password', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}

async function handleBranchReassign() {
  actionLoading.value = true
  try {
    await reassignBranch(selectedStaff.value.id, newBranchScopeType.value, newBranchId.value)
    toast.add({ title: 'Cabang berhasil diubah', color: 'success', icon: 'i-lucide-check' })
    showBranchReassign.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Gagal mengubah cabang', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-3">
      <div>
        <h1 class="text-lg font-semibold">Anggota Tim</h1>
        <p class="text-sm text-(--ui-text-muted)">Kelola tim bisnis Anda</p>
      </div>
      <UButton v-if="isOwner" icon="i-lucide-plus" @click="showCreate = true">Tambah Staff</UButton>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!staff.length" class="text-center py-12">
      <UIcon name="i-lucide-users" class="size-12 text-(--ui-text-muted) mx-auto mb-3" />
      <p class="text-sm font-medium">Belum ada staff</p>
      <p class="text-sm text-(--ui-text-muted)">Tambahkan staff pertama dengan menekan tombol di atas.</p>
    </div>

    <!-- Staff list -->
    <div v-else class="space-y-3">
      <UCard
        v-for="m in staff"
        :key="m.id"
        class="glass-card"
        :class="{ 'opacity-50 transition-opacity duration-200': !m.is_active }"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <p class="font-semibold truncate">{{ staffDisplayName(m) }}</p>
            <p v-if="m.display_name && m.email" class="text-sm text-(--ui-text-muted) truncate">{{ m.email }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <UBadge :color="roleBadgeColor(m.role)" variant="soft" size="sm">
                {{ roleLabel(m.role) }}
              </UBadge>
              <UBadge :color="m.is_active ? 'success' : 'neutral'" variant="soft" size="sm">
                {{ m.is_active ? 'Aktif' : 'Nonaktif' }}
              </UBadge>
              <UBadge variant="outline" size="sm">
                {{ scopeLabel(m) }}
              </UBadge>
            </div>
            <p class="text-xs text-(--ui-text-muted) mt-1">{{ relativeTime(m.last_sign_in_at) }}</p>
          </div>
          <UDropdownMenu
            v-if="isOwner && m.role !== 'owner'"
            :items="getActionItems(m)"
          >
            <UButton variant="ghost" size="sm" icon="i-lucide-ellipsis-vertical" aria-label="Aksi staff" />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>

    <!-- Creation Slideover -->
    <USlideover v-model:open="showCreate" title="Tambah Staff" side="right">
      <template #body>
        <form @submit.prevent="handleCreate" class="space-y-4 p-4">
          <UFormField label="Email" required>
            <UInput v-model="createForm.email" type="email" placeholder="email@contoh.com" autocomplete="email" icon="i-lucide-mail" />
          </UFormField>
          <UFormField label="Password" required>
            <UInput v-model="createForm.password" type="password" placeholder="Minimal 8 karakter" icon="i-lucide-lock" />
          </UFormField>
          <UFormField label="Nama Tampilan">
            <UInput v-model="createForm.display_name" placeholder="Opsional" icon="i-lucide-user" />
          </UFormField>
          <UFormField label="Peran" required>
            <URadioGroup v-model="createForm.role" orientation="horizontal" :items="roleItems" />
          </UFormField>
          <UFormField label="Cakupan" required>
            <USelect v-model="createForm.scope_type" :items="scopeTypeItems" placeholder="-- Pilih cakupan --" />
          </UFormField>
          <UFormField v-if="createForm.scope_type === 'branch'" label="Cabang" required>
            <USelect v-model="createForm.scope_id" :items="branchItems" placeholder="-- Pilih cabang --" />
          </UFormField>
          <div class="flex gap-3 pt-2">
            <UButton type="submit" :loading="creating" :disabled="!createForm.email || !createForm.password || !createForm.scope_type" block>Buat Akun Staff</UButton>
            <UButton variant="ghost" @click="showCreate = false">Batal</UButton>
          </div>
        </form>
      </template>
    </USlideover>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteConfirm" title="Hapus Staff">
      <template #body>
        <p>Hapus staff <strong>{{ staffDisplayName(selectedStaff) }}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" @click="showDeleteConfirm = false">Batal</UButton>
          <UButton color="error" :loading="actionLoading" @click="handleDelete">Hapus</UButton>
        </div>
      </template>
    </UModal>

    <!-- Deactivate Confirmation Modal -->
    <UModal v-model:open="showDeactivateConfirm" title="Nonaktifkan Staff">
      <template #body>
        <p>Nonaktifkan akun <strong>{{ staffDisplayName(selectedStaff) }}</strong>? Staff tidak akan bisa login sampai diaktifkan kembali.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" @click="showDeactivateConfirm = false">Batal</UButton>
          <UButton color="error" :loading="actionLoading" @click="handleDeactivate">Nonaktifkan</UButton>
        </div>
      </template>
    </UModal>

    <!-- Password Reset Modal -->
    <UModal v-model:open="showPasswordReset" title="Reset Password">
      <template #body>
        <p class="mb-3">Password baru untuk <strong>{{ staffDisplayName(selectedStaff) }}</strong>:</p>
        <UInput v-model="newPassword" type="password" placeholder="Password baru" icon="i-lucide-lock" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" @click="showPasswordReset = false">Batal</UButton>
          <UButton :loading="actionLoading" :disabled="!newPassword" @click="handlePasswordReset">Simpan Password</UButton>
        </div>
      </template>
    </UModal>

    <!-- Branch Reassignment Modal -->
    <UModal v-model:open="showBranchReassign" title="Pindah Cabang">
      <template #body>
        <p class="mb-3 text-sm text-(--ui-text-muted)">Cabang saat ini: <strong>{{ scopeLabel(selectedStaff) }}</strong></p>
        <USelect v-model="newBranchId" :items="branchItems" placeholder="Pilih cabang baru" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" @click="showBranchReassign = false">Batal</UButton>
          <UButton :loading="actionLoading" :disabled="!newBranchId" @click="handleBranchReassign">Pindahkan</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
