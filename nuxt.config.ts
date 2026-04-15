export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  ssr: false, // Disable SSR for client-side only app
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'CardioFlow - Cardio Interval Trainer',
      meta: [
        { name: 'description', content: 'A beautiful cardio interval training timer app to track your workouts and sessions.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap' },
      ],
    },
  },
})
