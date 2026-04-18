import { ref, onMounted, onUnmounted } from 'vue'

const reminderEnabled = ref(false)
const reminderTime = ref('08:00') // Default 8:00 AM
const notificationPermission = ref<NotificationPermission>('default')

export function useReminder() {
  let reminderInterval: ReturnType<typeof setInterval> | null = null

  function checkPermission() {
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
    }
  }

  async function requestPermission() {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
    return permission === 'granted'
  }

  function loadSettings() {
    if (typeof localStorage === 'undefined') return
    const stored = localStorage.getItem('cardioflow-reminder')
    if (stored) {
      try {
        const settings = JSON.parse(stored)
        reminderEnabled.value = settings.enabled ?? false
        reminderTime.value = settings.time ?? '08:00'
      } catch {
        // ignore
      }
    }
  }

  function saveSettings() {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem('cardioflow-reminder', JSON.stringify({
      enabled: reminderEnabled.value,
      time: reminderTime.value,
    }))
  }

  function shouldShowReminder(): boolean {
    const now = new Date()
    const [hours, minutes] = reminderTime.value.split(':').map(Number)
    return now.getHours() === hours && now.getMinutes() === minutes
  }

  function showNotification() {
    if (notificationPermission.value !== 'granted') return

    // Lazy import to avoid SSR issues
    import('~/stores/workout').then(({ useWorkoutStore }) => {
      const store = useWorkoutStore()
      const streak = store.streak

      new Notification('Kardio Workout Reminder', {
        body: streak > 0
          ? `Keep your ${streak}-day streak going! Time to work out 💪`
          : 'Time for your workout! Let\'s get moving 🏃',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'kardio-reminder',
      })
    })
  }

  function startReminder() {
    if (reminderInterval) clearInterval(reminderInterval)

    // Check every minute
    reminderInterval = setInterval(() => {
      if (reminderEnabled.value && shouldShowReminder()) {
        showNotification()
      }
    }, 60000)
  }

  function toggleReminder() {
    if (!reminderEnabled.value) {
      // Turning on - need permission
      requestPermission().then((granted) => {
        if (granted) {
          reminderEnabled.value = true
          startReminder()
          saveSettings()
        } else {
          reminderEnabled.value = false
        }
      })
    } else {
      // Turning off
      reminderEnabled.value = false
      if (reminderInterval) {
        clearInterval(reminderInterval)
        reminderInterval = null
      }
      saveSettings()
    }
  }

  function setReminderTime(time: string) {
    reminderTime.value = time
    saveSettings()
    if (reminderEnabled.value) {
      startReminder()
    }
  }

  onMounted(() => {
    checkPermission()
    loadSettings()
    if (reminderEnabled.value && notificationPermission.value === 'granted') {
      startReminder()
    }
  })

  onUnmounted(() => {
    if (reminderInterval) {
      clearInterval(reminderInterval)
    }
  })

  return {
    reminderEnabled,
    reminderTime,
    notificationPermission,
    toggleReminder,
    setReminderTime,
    requestPermission,
  }
}
