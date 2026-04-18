<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo-area">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ff3b5c" stroke="#ff3b5c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="logo-text">Kardio</h1>
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
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useModeStore, type AppMode } from '~/stores/mode'

const modeStore = useModeStore()

const props = defineProps<{
  activeTab: 'timer' | 'plans' | 'history'
}>()

const emit = defineEmits<{
  'tab-change': [tab: 'timer' | 'plans' | 'history']
  'mode-change': [mode: AppMode]
}>()

const isDarkMode = ref(false)

const currentMode = computed(() => modeStore.currentMode)

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
  localStorage.setItem('cardioflow-dark-mode', isDarkMode.value.toString())
}

function setMode(mode: AppMode) {
  modeStore.setMode(mode)
  emit('mode-change', mode)
}

onMounted(() => {
  const stored = localStorage.getItem('cardioflow-dark-mode')
  if (stored === 'true') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark-mode')
  }
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
</style>
