// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-03-14',
  devtools: { enabled: true },
  devServer: { port: 8989 },

  nitro: {
    preset: 'cloudflare-module',
  },

  vite: {
    optimizeDeps: {
      include: [
        'date-fns',
        'date-fns/locale'
      ],
    },
  },

  modules: [
    '@nuxtjs/supabase',
    '@nuxt/ui',
  ],

  css: ['~/assets/css/main.css'],

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/dashboard(/*)?', '/cashier(/*)?'],
      exclude: ['/', '/join/*', '/card/*', '/staff/login', '/wishlist'],
    },
  },

  ui: {
    theme: {
      colors: ['sky', 'success', 'error', 'info', 'warning']
    },
  },

  runtimeConfig: {
    applePassTypeId: '',
    appleTeamId: '',
    appleWwdrCert: '',
    appleSignerCert: '',
    appleSignerKey: '',
    appleSignerKeyPassphrase: '',
    googleWalletIssuerId: '',
    googleServiceAccountEmail: '',
    googleServiceAccountPrivateKey: '',
    samsungPartnerId: '',
    samsungCardId: '',
    samsungPrivateKey: '',
    qrTokenSecret: '',

    public: {
      appUrl: 'http://localhost:8989',
    },
  },

  app: {
    head: {
      title: 'PoinSaku - Kartu Stempel Digital',
      htmlAttrs: { lang: 'id' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Kartu stempel digital untuk bisnis Anda. Tanpa perlu download aplikasi.' },
        { name: 'theme-color', content: '#0ea5e9' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
      ],
    },
  },
})
