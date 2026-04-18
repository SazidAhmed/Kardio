<template>
  <div class="app-shell">
    <div class="app-container">
      <!-- Header -->
      <LayoutAppHeader />

      <!-- Divider -->
      <div class="divider" />

      <!-- Page Content -->
      <main class="main-content">
        <ViewsTimerView
          v-if="activeTab === 'timer'"
          key="timer-view"
          @switch-tab="handleTabChange"
        />
        <ViewsPlansView
          v-else-if="activeTab === 'plans'"
          key="plans-view"
          @select-plan="handlePlanSelected"
        />
        <ViewsHistoryView
          v-else-if="activeTab === 'history'"
          key="history-view"
        />
      </main>

      <!-- PWA Install Banner -->
      <div v-if="pwa.showInstallPrompt.value && !pwa.isInstalled.value" class="install-banner">
        <span class="install-icon">📲</span>
        <span class="install-text">Install Kardio for quick access</span>
        <button class="install-btn" @click="pwa.installApp">Install</button>
        <button class="install-dismiss" @click="pwa.showInstallPrompt.value = false">×</button>
      </div>

      <!-- Bottom Nav -->
      <LayoutBottomNav :active-tab="activeTab" @tab-change="handleTabChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkoutStore } from '~/stores/workout'
import { usePWA } from '~/composables/usePWA'

const store = useWorkoutStore()
const activeTab = ref<'timer' | 'history' | 'plans'>('timer')
const pwa = usePWA()

function handleTabChange(tab: 'timer' | 'history' | 'plans') {
  activeTab.value = tab
}

function handlePlanSelected() {
  // Switch to timer tab when a plan is selected
  activeTab.value = 'timer'
}

onMounted(() => {
  store.loadHistory()
  store.loadSettings()
  store.loadPlans() // Load workout plans on app start
  store.loadAchievements() // Load achievements
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  background: var(--bg-primary);
}

.app-container {
  width: 100%;
  max-width: 480px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 0 0 16px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

/* PWA Install Banner */
.install-banner {
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card);
  border: 1.5px solid var(--accent-primary);
  border-radius: var(--radius-full, 9999px);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(88, 86, 214, 0.3);
  z-index: 200;
  animation: slideUp 0.3s ease;
}

.install-icon {
  font-size: 18px;
}

.install-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.install-btn {
  padding: 6px 14px;
  border-radius: var(--radius-full, 9999px);
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}

.install-btn:hover {
  background: var(--accent-secondary);
}

.install-dismiss {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style>
