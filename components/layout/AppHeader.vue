<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo-area">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ff3b5c" stroke="#ff3b5c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="logo-text">Fit-Z</h1>
      </div>
      <div class="header-actions">
        <!-- Mode Switcher -->
        <div class="mode-switcher">
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'cardio' }"
            @click="setMode('cardio')"
            title="Cardio Mode"
          >
            <span class="mode-icon">🔥</span>
            <span class="mode-label">Cardio</span>
          </button>
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'lifting' }"
            @click="setMode('lifting')"
            title="Lifting Mode"
          >
            <span class="mode-icon">💪</span>
            <span class="mode-label">Lifting</span>
          </button>
        </div>

        <button
          class="theme-toggle"
          @click="toggleDarkMode"
          :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <svg v-if="isDarkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        <!-- Settings Dropdown -->
        <div class="settings-wrapper" ref="settingsRef">
          <button
            class="theme-toggle"
            @click="showSettings = !showSettings"
            title="Settings & Backup"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          <!-- Dropdown -->
          <div v-if="showSettings" class="settings-dropdown">
            <div class="settings-dropdown-header">Data Backup</div>
            <button class="settings-dropdown-item" @click="handleExport" :disabled="backup.isExporting.value">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>{{ backup.isExporting.value ? 'Exporting...' : 'Export Backup' }}</span>
            </button>
            <button class="settings-dropdown-item" @click="triggerImport">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>{{ backup.isImporting.value ? 'Importing...' : 'Import Backup' }}</span>
            </button>
            <div v-if="backup.importError.value" class="settings-dropdown-msg error">{{ backup.importError.value }}</div>
            <div v-if="backup.importSuccess.value" class="settings-dropdown-msg success">{{ backup.importSuccess.value }}</div>
            <input ref="fileInputRef" type="file" accept=".json" style="display:none" @change="handleFileSelect" />
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useModeStore, type AppMode } from '~/stores/mode'
import { useDataBackup } from '~/composables/useDataBackup'

const modeStore = useModeStore()
const backup = useDataBackup()

const showSettings = ref(false)
const settingsRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const props = defineProps<{
  activeTab: 'timer' | 'plans' | 'history' | 'ai'
}>()

const emit = defineEmits<{
  'tab-change': [tab: 'timer' | 'plans' | 'history' | 'ai']
  'mode-change': [mode: AppMode]
}>()

const isDarkMode = ref(false)

const currentMode = computed(() => modeStore.currentMode)

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
  localStorage.setItem('fitz-dark-mode', isDarkMode.value.toString())
}

function setMode(mode: AppMode) {
  modeStore.setMode(mode)
  emit('mode-change', mode)
}

function handleExport() {
  backup.exportData()
  showSettings.value = false
}

function triggerImport() {
  backup.clearImportMessages()
  fileInputRef.value?.click()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await backup.importData(file)
  input.value = ''
}

function handleClickOutside(event: MouseEvent) {
  if (settingsRef.value && !settingsRef.value.contains(event.target as Node)) {
    showSettings.value = false
  }
}

onMounted(() => {
  const stored = localStorage.getItem('fitz-dark-mode')
  if (stored === 'true') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark-mode')
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.app-header {
  width: 100%;
  max-width: 480px;
  padding: 20px 24px 16px;
  text-align: center;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.theme-toggle:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Dark Mode */
:global(html.dark-mode) .theme-toggle {
  color: #ffffff;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(255, 59, 92, 0.2);
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-primary);
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.header-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.header-btn.active {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
  color: var(--accent-primary);
}

/* Mode Switcher */
.mode-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-primary);
  padding: 4px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border-color);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  color: var(--text-primary);
}

.mode-btn.active {
  background: var(--accent-primary);
  color: white;
}

.mode-icon {
  font-size: 14px;
}

.mode-label {
  display: none;
}

@media (min-width: 380px) {
  .mode-label {
    display: inline;
  }
}

/* Settings Dropdown */
.settings-wrapper {
  position: relative;
}

.settings-dropdown {
  position: absolute;
  top: 44px;
  right: 0;
  min-width: 200px;
  background: var(--bg-card);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 0;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  z-index: 300;
  animation: fadeIn 0.15s ease;
}

.settings-dropdown-header {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.settings-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.settings-dropdown-item:hover {
  background: var(--bg-primary);
}

.settings-dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-dropdown-item svg {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.settings-dropdown-msg {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
}

.settings-dropdown-msg.error {
  color: #ff3b5c;
}

.settings-dropdown-msg.success {
  color: #34c759;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
