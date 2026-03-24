<template>
  <div>
    <!-- Hero Section -->
    <section class="relative py-16 lg:py-24 bg-gradient-to-br from-primary/10 via-cyan-100/40 to-violet-100/30 dark:from-primary/15 dark:via-cyan-900/20 dark:to-violet-900/15 overflow-hidden">
      <!-- Decorative gradient orbs -->
      <div class="absolute top-20 -left-32 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute bottom-10 -right-24 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-violet-400/10 rounded-full blur-3xl pointer-events-none" />
      <div class="container mx-auto px-4 relative z-10">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Hero text -->
          <div class="text-center lg:text-left">
            <h1 class="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Kartu Stempel Digital
              <br />
              <span class="text-primary">untuk Bisnis Anda</span>
            </h1>
            <p class="mt-6 text-base text-muted max-w-2xl mx-auto lg:mx-0">
              Tingkatkan loyalitas pelanggan dengan kartu stempel digital yang terintegrasi dengan Apple Wallet, Google Wallet, dan Samsung Wallet. Tanpa perlu download aplikasi.
            </p>
            <div class="mt-8 flex justify-center lg:justify-start gap-4">
              <NuxtLink :to="isWishlistMode ? '/wishlist' : '/register'">
                <UButton size="lg" class="cursor-pointer">{{ isWishlistMode ? 'Bergabung Wishlist' : 'Mulai Sekarang' }}</UButton>
              </NuxtLink>
              <a href="#features">
                <UButton variant="outline" size="lg" class="cursor-pointer">Pelajari Lebih Lanjut</UButton>
              </a>
            </div>
          </div>

          <!-- Stamp card mockup -->
          <div class="hidden lg:flex justify-center">
            <div class="relative">
              <!-- Main card -->
              <div class="w-80 rounded-2xl glass p-6 shadow-xl">
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <p class="font-heading font-bold text-default text-lg">Kopi Nusantara</p>
                    <p class="text-sm text-muted">Program Loyalitas</p>
                  </div>
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UIcon name="i-lucide-store" class="size-5 text-primary" />
                  </div>
                </div>
                <!-- Stamp grid -->
                <div class="grid grid-cols-4 gap-3 mb-6">
                  <div
                    v-for="n in 8"
                    :key="n"
                    class="w-14 h-14 rounded-xl flex items-center justify-center"
                    :class="n <= 5 ? 'bg-primary/15 border-2 border-primary/30' : 'bg-muted border-2 border-dashed border-default'"
                  >
                    <UIcon v-if="n <= 5" name="i-lucide-qr-code" class="size-6 text-primary" />
                    <span v-else class="text-xs text-muted">{{ n }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted">5 dari 8 stempel</span>
                  <span class="font-heading font-semibold text-primary">Gratis 1 Kopi</span>
                </div>
              </div>

              <!-- Floating badge -->
              <div class="absolute -top-4 -right-4 glass rounded-xl px-4 py-2 shadow-lg">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-gift" class="size-4 text-primary" />
                  <span class="text-sm font-medium text-default">Hadiah tersedia!</span>
                </div>
              </div>

              <!-- Bottom floating element -->
              <div class="absolute -bottom-3 -left-4 glass rounded-xl px-4 py-2 shadow-lg">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-users" class="size-4 text-primary" />
                  <span class="text-sm font-medium text-default">+24 pelanggan hari ini</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Trust / Stats Section -->
    <section class="py-12">
      <div class="container mx-auto px-4">
        <p class="text-center text-muted font-medium mb-8">
          Dipercaya oleh bisnis di seluruh Indonesia
        </p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div v-for="stat in stats" :key="stat.label" class="glass rounded-xl p-6 text-center">
            <p class="font-heading text-3xl sm:text-4xl font-bold text-primary">{{ stat.value }}</p>
            <p class="mt-1 text-sm text-muted">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="scroll-mt-20 py-16 relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-primary/5 via-cyan-100/20 to-violet-100/10 dark:from-primary/8 dark:via-cyan-900/10 dark:to-violet-900/5 -z-10" />
      <div class="absolute top-1/2 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div class="container mx-auto px-4">
        <h2 class="font-heading text-2xl font-bold text-center mb-4">Mengapa PoinSaku?</h2>
        <p class="text-center text-muted max-w-2xl mx-auto mb-10">
          Platform kartu stempel digital terlengkap yang dirancang khusus untuk kebutuhan bisnis Indonesia.
        </p>
        <div class="grid md:grid-cols-3 gap-6">
          <UCard
            v-for="feature in features"
            :key="feature.title"
            class="glass cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
          >
            <template #header>
              <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <UIcon :name="feature.icon" class="size-6" />
              </div>
              <h3 class="font-heading text-lg font-semibold">{{ feature.title }}</h3>
            </template>

            <p class="text-muted">{{ feature.description }}</p>
          </UCard>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="scroll-mt-20 py-16">
      <div class="container mx-auto px-4">
        <h2 class="font-heading text-2xl font-bold text-center mb-4">Cara Kerja</h2>
        <p class="text-center text-muted max-w-2xl mx-auto mb-12">
          Empat langkah sederhana untuk memulai program loyalitas digital Anda.
        </p>
        <div class="relative grid md:grid-cols-4 gap-6">
          <!-- Connector line (hidden on mobile) -->
          <div class="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-linear-to-r from-primary-500/20 via-primary-500/40 to-primary-500/20" />

          <div v-for="(step, i) in steps" :key="i" class="relative text-center">
            <div
              class="relative z-10 w-14 h-14 rounded-full bg-linear-to-br from-primary-500 to-cyan-600 text-white flex items-center justify-center text-xl font-heading font-bold mx-auto mb-4 shadow-lg shadow-primary-500/25"
            >
              {{ i + 1 }}
            </div>
            <div class="glass rounded-xl p-5">
              <h3 class="font-heading font-semibold mb-2 text-base">{{ step.title }}</h3>
              <p class="text-sm text-muted leading-relaxed">{{ step.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 relative">
      <div class="absolute inset-0 -z-10 pointer-events-none">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>
      <div class="container mx-auto px-4">
        <div class="glass rounded-3xl p-8 sm:p-12 text-center max-w-4xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-3xl font-bold mb-4">
            {{ isWishlistMode ? 'Tertarik dengan PoinSaku?' : 'Siap untuk Meningkatkan Loyalitas Pelanggan?' }}
          </h2>
          <p class="text-base text-muted mb-6 max-w-2xl mx-auto">
            {{ isWishlistMode ? 'Bergabung dengan wishlist kami dan jadilah yang pertama tahu saat PoinSaku diluncurkan.' : 'Daftar sekarang dan mulai buat program loyalitas pertama Anda. Gratis untuk memulai, tanpa kartu kredit.' }}
          </p>
          <NuxtLink :to="isWishlistMode ? '/wishlist' : '/register'">
            <UButton size="lg" class="cursor-pointer">{{ isWishlistMode ? 'Bergabung Wishlist' : 'Daftar Gratis Sekarang' }}</UButton>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { isEnabled } = useFeatureToggles()
const isWishlistMode = computed(() => isEnabled('wishlist_mode'))

const features = [
  {
    title: 'Tanpa Download Aplikasi',
    description: 'Pelanggan cukup scan QR code dan isi data dalam 30 detik. Kartu stempel langsung masuk ke dompet digital.',
    icon: 'i-lucide-smartphone',
  },
  {
    title: 'Integrasi Wallet',
    description: 'Mendukung Apple Wallet, Google Wallet, dan Samsung Wallet. Kartu stempel selalu ada di smartphone pelanggan.',
    icon: 'i-lucide-wallet',
  },
  {
    title: 'Anti-Fraud QR Code',
    description: 'Dynamic QR code yang berubah setiap 60 detik, mencegah screenshot dan penyalahgunaan stempel.',
    icon: 'i-lucide-shield-check',
  },
]

const stats = [
  { value: '1,000+', label: 'Bisnis Terdaftar' },
  { value: '50,000+', label: 'Kartu Stempel Aktif' },
  { value: '250,000+', label: 'Stempel Dikumpulkan' },
  { value: '98%', label: 'Tingkat Kepuasan' },
]

const steps = [
  { title: 'Daftar Bisnis', description: 'Buat akun dan atur program loyalitas sesuai kebutuhan bisnis Anda.' },
  { title: 'Pasang QR Code', description: 'Cetak dan pasang QR code di toko atau tempat usaha Anda.' },
  { title: 'Pelanggan Scan', description: 'Pelanggan scan QR, isi nama & nomor HP, dan langsung dapat kartu stempel.' },
  { title: 'Kumpul & Tukar', description: 'Pelanggan kumpulkan stempel dan tukarkan hadiah saat target tercapai.' },
]
</script>
