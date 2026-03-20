<template>
  <div class="min-h-screen bg-default relative overflow-hidden">
    <!-- Decorative gradient orbs -->
    <div class="fixed inset-0 -z-10 pointer-events-none">
      <div class="absolute -top-32 right-1/3 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
      <div class="absolute bottom-1/3 -left-20 w-64 h-64 bg-cyan-300/10 dark:bg-cyan-500/5 rounded-full blur-3xl" />
    </div>

    <header class="glass shadow-sm">
      <div class="flex h-14 items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/dashboard/business" class="flex items-center gap-1.5 text-sm text-muted hover:text-default transition-colors cursor-pointer">
            <UIcon name="i-lucide-arrow-left" class="size-4" />
            <span>Dashboard</span>
          </NuxtLink>
          <span class="text-(--ui-text-muted)/40">|</span>
          <div class="flex items-center gap-2 text-primary">
            <UIcon name="i-lucide-scan-line" class="size-4.5" />
            <span class="font-heading font-bold">Mode Kasir</span>
          </div>
        </div>
      </div>
    </header>
    <main class="p-4">
      <slot />
    </main>
  </div>
</template>
