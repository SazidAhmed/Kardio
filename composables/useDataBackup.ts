import { ref } from 'vue'

const BACKUP_VERSION = 1

const ALL_STORAGE_KEYS = [
  'fitz-history',
  'fitz-plans',
  'fitz-achievements',
  'cardioflow-settings',
  'fitz-mode',
  'fitz-cardio-tab',
  'fitz-lifting-tab',
  'fitz-lift-plans',
  'fitz-lift-history',
  'fitz-lift-settings',
  'fitz-lift-achievements',
  'fitz-ai-history',
  'fitz-dark-mode',
  'fitz-reminder',
  'fitz-fab-position',
] as const

const isExporting = ref(false)
const isImporting = ref(false)
const importError = ref('')
const importSuccess = ref('')

export function useDataBackup() {
  function exportData() {
    if (typeof localStorage === 'undefined') return

    isExporting.value = true
    try {
      const data: Record<string, string | null> = {}
      for (const key of ALL_STORAGE_KEYS) {
        data[key] = localStorage.getItem(key)
      }

      const backup = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        app: 'fitz',
        data,
      }

      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const date = new Date().toISOString().slice(0, 10)
      const link = document.createElement('a')
      link.href = url
      link.download = `fitz-backup-${date}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      isExporting.value = false
    }
  }

  async function importData(file: File): Promise<boolean> {
    if (typeof localStorage === 'undefined') return false

    isImporting.value = true
    importError.value = ''
    importSuccess.value = ''

    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      if (!backup || backup.app !== 'fitz' || !backup.data) {
        importError.value = 'Invalid backup file format.'
        return false
      }

      // Write each key back to localStorage
      let restoredCount = 0
      for (const key of Object.keys(backup.data)) {
        if (backup.data[key] !== null && backup.data[key] !== undefined) {
          localStorage.setItem(key, backup.data[key])
          restoredCount++
        }
      }

      importSuccess.value = `Restored ${restoredCount} data entries. Reloading...`

      // Reload the app after a brief delay so stores pick up the new data
      setTimeout(() => {
        window.location.reload()
      }, 1500)

      return true
    } catch (e: any) {
      importError.value = e.message || 'Failed to import backup file.'
      return false
    } finally {
      isImporting.value = false
    }
  }

  function clearImportMessages() {
    importError.value = ''
    importSuccess.value = ''
  }

  return {
    exportData,
    importData,
    clearImportMessages,
    isExporting,
    isImporting,
    importError,
    importSuccess,
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const granted = await navigator.storage.persist()
      return granted
    } catch {
      return false
    }
  }
  return false
}
