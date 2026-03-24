<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })

const { data: response, pending: loading } = await useFetch('/api/wishlist')

const submissions = computed(() => response.value?.data ?? [])
const total = computed(() => response.value?.total ?? 0)
</script>

<template>
  <div>
    <div class="mb-3">
      <h1 class="text-lg font-semibold">Wishlist Submissions</h1>
      <p class="text-sm text-(--ui-text-muted)">{{ total }} pendaftar</p>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!submissions.length" class="text-center py-8">
      <UIcon name="i-lucide-clipboard-list" class="size-10 text-(--ui-text-muted) mx-auto mb-4" />
      <p class="text-(--ui-text-muted)">Belum ada pendaftar wishlist</p>
    </div>

    <div v-else class="space-y-2">
      <UCard v-for="item in submissions" :key="item.id" class="glass-card !py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-medium text-sm">{{ item.name }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ item.email }}</p>
            <p v-if="item.company" class="text-xs text-(--ui-text-muted)">{{ item.company }}</p>
            <p v-if="item.message" class="text-xs text-(--ui-text-muted) mt-1 truncate max-w-xs">{{ item.message }}</p>
          </div>
          <div class="shrink-0 text-right space-y-1">
            <UBadge v-if="item.industry" variant="soft" size="sm">{{ item.industry }}</UBadge>
            <p class="text-xs text-(--ui-text-muted)">{{ new Date(item.created_at).toLocaleString('id-ID') }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
