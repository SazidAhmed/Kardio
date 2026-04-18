import { ref, onMounted, onUnmounted } from 'vue'

const isInstalled = ref(false)
const showInstallPrompt = ref(false)
let deferredPrompt: any = null

export function usePWA() {
  function handleBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    deferredPrompt = e
    showInstallPrompt.value = true
  }

  function handleAppInstalled() {
    isInstalled.value = true
    showInstallPrompt.value = false
    deferredPrompt = null
  }

  async function installApp() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      isInstalled.value = true
    }
    deferredPrompt = null
    showInstallPrompt.value = false
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration failed:', err)
      })
    }
  }

  function checkIfInstalled() {
    // Check if app is already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true
    }
    // Also check for iOS standalone
    if ((navigator as any).standalone === true) {
      isInstalled.value = true
    }
  }

  onMounted(() => {
    registerServiceWorker()
    checkIfInstalled()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    isInstalled,
    showInstallPrompt,
    installApp,
  }
}
