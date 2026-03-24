<template>
  <div class="min-h-screen bg-(--ui-bg)">
    <!-- Onboarding: no businesses -->
    <div v-if="showOnboarding" class="min-h-screen flex items-center justify-center">
      <UCard class="w-full max-w-md mx-4 text-center">
        <template #header>
          <div class="space-y-4">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10">
              <UIcon name="i-lucide-building-2" class="size-8 text-primary-500" />
            </div>
            <h3 class="text-lg font-semibold">Daftarkan Bisnis Anda</h3>
            <p class="text-sm text-muted">Buat bisnis pertama untuk mulai menggunakan PoinSaku.</p>
          </div>
        </template>
        <NuxtLink to="/dashboard/business/new">
          <UButton class="w-full">Buat Bisnis Pertama</UButton>
        </NuxtLink>
      </UCard>
    </div>

    <!-- Main dashboard -->
    <template v-else>
      <div class="flex min-h-screen">
        <!-- Sidebar -->
        <aside :class="['fixed inset-y-0 left-0 z-40 w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform flex flex-col', 'lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full']">
          <!-- Logo -->
          <div class="flex h-12 items-center px-5 shrink-0">
            <NuxtLink to="/dashboard/business" class="text-sm font-bold text-primary-500">PoinSaku</NuxtLink>
          </div>

          <!-- Business switcher -->
          <div class="px-3 pb-2 shrink-0">
            <button class="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 hover:bg-accented transition-colors cursor-pointer text-left" @click="switcherOpen = !switcherOpen">
              <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/10 text-primary-500 shrink-0">
                <UIcon name="i-lucide-building-2" class="size-3.5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-medium truncate">{{ activeBusiness?.name || 'Pilih Bisnis' }}</p>
              </div>
              <UIcon name="i-lucide-chevron-down" class="size-3.5 text-muted shrink-0 transition-transform" :class="switcherOpen ? 'rotate-180' : ''" />
            </button>
            <div v-if="switcherOpen" class="mt-1 space-y-0.5">
              <button v-for="biz in businesses" :key="biz.id" class="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm hover:bg-accented transition-colors cursor-pointer text-left" :class="activeBusiness?.id === biz.id ? 'bg-primary-500/10 text-primary-500' : ''" @click="handleSwitch(biz.slug)">
                <UIcon v-if="activeBusiness?.id === biz.id" name="i-lucide-check" class="size-3.5" />
                <span v-else class="w-3.5" />
                <span class="truncate">{{ biz.name }}</span>
              </button>
              <NuxtLink to="/dashboard/business" class="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-muted hover:bg-accented transition-colors cursor-pointer" @click="switcherOpen = false; sidebarOpen = false">
                <UIcon name="i-lucide-settings" class="size-3.5" />
                <span>Kelola Bisnis</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Navigation (only when activeBusiness is set) -->
          <nav v-if="activeBusiness" class="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
            <NuxtLink v-for="item in filteredNavItems" :key="item.to" :to="item.to" class="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-accented cursor-pointer" active-class="bg-primary-500/10 text-primary-500" @click="sidebarOpen = false">
              <UIcon :name="item.icon" class="size-4" />
              {{ item.label }}
            </NuxtLink>
            <div v-if="isSuperAdmin" class="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
              <p class="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Super Admin</p>
              <NuxtLink to="/dashboard/wishlists" class="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-accented cursor-pointer" active-class="bg-primary-500/10 text-primary-500" @click="sidebarOpen = false">
                <UIcon name="i-lucide-clipboard-list" class="size-4" />
                Wishlists
              </NuxtLink>
            </div>
            <div class="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
              <NuxtLink to="/cashier" class="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors cursor-pointer" @click="sidebarOpen = false">
                <UIcon name="i-lucide-scan-line" class="size-4" />
                Mode Kasir
              </NuxtLink>
            </div>
          </nav>

          <!-- Logout -->
          <div class="px-3 py-2 mt-auto shrink-0 border-t border-gray-100 dark:border-gray-800">
            <UModal v-model:open="logoutModalOpen">
              <button class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted hover:bg-accented transition-colors cursor-pointer" @click="sidebarOpen = false">
                <UIcon name="i-lucide-log-out" class="size-4" />
                Keluar
              </button>

              <template #content>
                <div class="p-6 text-center space-y-4">
                  <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                    <UIcon name="i-lucide-log-out" class="size-6 text-red-500" />
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-lg font-semibold">Keluar dari Akun?</h3>
                    <p class="text-sm text-(--ui-text-muted)">Anda perlu masuk kembali untuk mengakses dashboard.</p>
                  </div>
                  <div class="flex flex-col gap-2 pt-2">
                    <UButton to="/logout" color="error" class="w-full cursor-pointer" block>
                      Ya, Keluar
                    </UButton>
                    <UButton color="neutral" variant="ghost" class="w-full cursor-pointer" block @click="logoutModalOpen = false">
                      Batal
                    </UButton>
                  </div>
                </div>
              </template>
            </UModal>
          </div>
        </aside>

        <!-- Mobile overlay -->
        <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-black/50 lg:hidden" @click="sidebarOpen = false" />

        <!-- Content area -->
        <div class="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-950">
          <header class="h-12 flex items-center justify-between px-4 lg:px-6 shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div class="flex items-center gap-3">
              <button class="p-1.5 rounded-md hover:bg-accented transition-colors cursor-pointer lg:hidden inline-flex" @click="sidebarOpen = !sidebarOpen">
                <UIcon name="i-lucide-menu" class="size-4.5" />
              </button>
              <NuxtLink to="/dashboard/business" class="text-sm font-bold text-primary-500 lg:hidden">PoinSaku</NuxtLink>
            </div>
            <USwitch v-model="isDark" unchecked-icon="i-lucide-sun" checked-icon="i-lucide-moon" size="sm" />
          </header>
          <main class="flex-1 p-4 lg:p-5">
            <slot />
          </main>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const sidebarOpen = ref(false)
const switcherOpen = ref(false)
const logoutModalOpen = ref(false)
const router = useRouter()
const route = useRoute()

const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.preference === 'dark',
  set: (v) => { colorMode.preference = v ? 'dark' : 'light' },
})

const { businesses, activeBusiness, loading, refreshBusinesses, businessSlug } = useBusiness()
const { canManageMembers, canManageSettings, canManagePrograms, isSuperAdmin } = usePermission()

const basePath = computed(() => businessSlug.value ? `/dashboard/${businessSlug.value}` : '')

const allNavItems = computed(() => [
  { to: `${basePath.value}`, label: 'Dashboard', icon: 'i-lucide-layout-dashboard', show: true },
  { to: `${basePath.value}/branches`, label: 'Cabang', icon: 'i-lucide-map-pin', show: canManageSettings.value },
  { to: `${basePath.value}/programs`, label: 'Program', icon: 'i-lucide-star', show: true },
  { to: `${basePath.value}/customers`, label: 'Pelanggan', icon: 'i-lucide-users', show: true },
  { to: `${basePath.value}/transactions`, label: 'Transaksi', icon: 'i-lucide-history', show: true },
  { to: `${basePath.value}/members`, label: 'Anggota Tim', icon: 'i-lucide-user-plus', show: canManageMembers.value },
  { to: `${basePath.value}/settings`, label: 'Pengaturan', icon: 'i-lucide-settings', show: canManageSettings.value },
])

const filteredNavItems = computed(() => allNavItems.value.filter(i => i.show))

const showOnboarding = computed(() => {
  if (loading.value) return false
  if (businesses.value.length > 0) return false
  return !route.path.startsWith('/dashboard/business')
})

function handleSwitch(slug: string) {
  switcherOpen.value = false
  sidebarOpen.value = false
  router.push(`/dashboard/${slug}`)
}


</script>
