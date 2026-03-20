<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
const { businessSlug } = useBusiness()
const { customers, total, page, limit, search, loading } = useCustomer()

const totalPages = computed(() => Math.ceil(total.value / limit.value))
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h1 class="text-lg font-semibold">Pelanggan</h1>
        <p class="text-sm text-(--ui-text-muted)">{{ total }} pelanggan terdaftar</p>
      </div>
    </div>

    <div class="mb-4">
      <UInput v-model="search" placeholder="Cari nama atau telepon..." icon="i-lucide-search" class="max-w-sm" />
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!customers.length" class="text-center py-8">
      <UIcon name="i-lucide-users" class="size-10 text-(--ui-text-muted) mx-auto mb-4" />
      <p class="text-(--ui-text-muted)">{{ search ? 'Tidak ditemukan' : 'Belum ada pelanggan' }}</p>
    </div>

    <div v-else class="space-y-3">
      <NuxtLink v-for="c in customers" :key="c.id" :to="`/dashboard/${businessSlug}/customers/${c.id}`" class="block">
        <UCard class="glass-card hover:shadow-md transition-shadow cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold">{{ c.name }}</p>
              <p class="text-sm text-(--ui-text-muted)">{{ c.phone }}</p>
            </div>
            <div class="text-right text-sm text-(--ui-text-muted)">
              <p>{{ c.email || '' }}</p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

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
