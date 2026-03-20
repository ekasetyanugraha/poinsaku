<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h1 class="text-lg font-semibold">Bisnis Saya</h1>
        <p class="text-sm text-(--ui-text-muted)">Kelola bisnis Anda</p>
      </div>
      <NuxtLink to="/dashboard/business/new">
        <UButton icon="i-lucide-plus">Bisnis Baru</UButton>
      </NuxtLink>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="businesses.length === 0" class="text-center py-8">
      <UIcon name="i-lucide-building-2" class="size-10 text-(--ui-text-muted) mx-auto mb-4" />
      <p class="text-(--ui-text-muted)">Belum ada bisnis. Buat bisnis pertama Anda.</p>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="biz in businesses" :key="biz.id" :to="`/dashboard/${biz.slug}`" class="block cursor-pointer">
        <UCard class="glass-card hover:shadow-lg transition-shadow cursor-pointer h-full">
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <UIcon name="i-lucide-building-2" class="size-5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold truncate">{{ biz.name }}</p>
                <p class="text-xs text-(--ui-text-muted)">{{ biz.slug }}</p>
              </div>
            </div>
          </template>
          <div class="flex items-center gap-2">
            <UBadge v-if="biz.phone" variant="soft" color="neutral" size="sm">{{ biz.phone }}</UBadge>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { businesses, loading } = useBusiness()
</script>
