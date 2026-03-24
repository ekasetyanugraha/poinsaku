<template>
  <div class="min-h-screen bg-(--ui-bg) relative overflow-hidden" style="scroll-behavior: smooth">
    <!-- Decorative gradient orbs -->
    <div class="fixed inset-0 -z-10 pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
      <div class="absolute top-1/3 -left-32 w-80 h-80 bg-cyan-300/10 dark:bg-cyan-500/5 rounded-full blur-3xl" />
      <div class="absolute bottom-0 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
    </div>

    <!-- Floating glassmorphism navbar -->
    <header class="fixed top-4 left-4 right-4 z-50 rounded-2xl glass">
      <div class="container mx-auto flex h-14 items-center justify-between px-5">
        <NuxtLink to="/" class="text-xl font-heading font-bold text-primary-500 cursor-pointer transition-colors duration-200 hover:text-primary-500/80">
          PoinSaku
        </NuxtLink>
        <nav class="flex items-center gap-2 sm:gap-4">
          <template v-if="isWishlistMode">
            <NuxtLink to="/wishlist">
              <UButton size="sm" class="cursor-pointer">Bergabung Wishlist</UButton>
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-sm font-medium text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200"
            >
              Masuk
            </NuxtLink>
            <NuxtLink to="/register">
              <UButton size="sm" class="cursor-pointer">Daftar Gratis</UButton>
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Main content with top padding to account for fixed navbar -->
    <main class="pt-22">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="glass-subtle mt-12">
      <div class="container mx-auto px-4 py-10">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <!-- Brand column -->
          <div class="sm:col-span-2 lg:col-span-1">
            <NuxtLink to="/" class="text-xl font-heading font-bold text-primary-500 cursor-pointer">
              PoinSaku
            </NuxtLink>
            <p class="mt-3 text-sm text-(--ui-text-muted) leading-relaxed">
              Platform kartu stempel digital untuk bisnis Indonesia. Tingkatkan loyalitas pelanggan tanpa ribet.
            </p>
          </div>

          <!-- Product column -->
          <div>
            <h4 class="font-heading font-semibold text-(--ui-text) mb-4">Produk</h4>
            <ul class="space-y-2.5">
              <li>
                <a href="#features" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  Fitur Unggulan
                </a>
              </li>
              <li>
                <a href="#how-it-works" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  Cara Kerja
                </a>
              </li>
              <li>
                <a href="#" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  Harga
                </a>
              </li>
            </ul>
          </div>

          <!-- Resources column -->
          <div>
            <h4 class="font-heading font-semibold text-(--ui-text) mb-4">Sumber Daya</h4>
            <ul class="space-y-2.5">
              <li>
                <a href="#" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  Panduan Memulai
                </a>
              </li>
              <li>
                <a href="#" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  Hubungi Kami
                </a>
              </li>
            </ul>
          </div>

          <!-- Legal column -->
          <div>
            <h4 class="font-heading font-semibold text-(--ui-text) mb-4">Legal</h4>
            <ul class="space-y-2.5">
              <li>
                <a href="#" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  Syarat & Ketentuan
                </a>
              </li>
              <li>
                <a href="#" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) cursor-pointer transition-colors duration-200">
                  Kebijakan Privasi
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="mt-10 pt-6 border-t border-sky-200/50 dark:border-sky-800/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-sm text-(--ui-text-muted)">
            &copy; 2026 PoinSaku. Kartu stempel digital untuk bisnis Indonesia.
          </p>
          <p class="text-sm text-(--ui-text-muted)">
            Dibuat dengan dedikasi di Indonesia
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const isWishlistMode = computed(() => config.public.wishlistMode)
</script>
