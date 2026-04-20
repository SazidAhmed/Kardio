<template>
  <div class="app-shell">
    <div class="app-container">
      <!-- Header -->
      <LayoutAppHeader
        :active-tab="activeTab"
        @tab-change="handleTabChange"
        @mode-change="handleModeChange"
      />

      <!-- Divider -->
      <div class="divider" />

      <!-- Page Content -->
      <main class="main-content">
        <!-- Cardio Mode Views -->
        <template v-if="modeStore.isCardioMode">
          <ViewsTimerView
            v-if="activeTab === 'timer'"
            key="timer-view"
            @switch-tab="handleTabChange"
          />
          <ViewsCardioPlansView
            v-else-if="activeTab === 'plans'"
            key="cardio-plans-view"
            @select-plan="handlePlanSelected"
          />
          <ViewsCardioHistoryView
            v-else-if="activeTab === 'history'"
            key="cardio-history-view"
          />
          <ViewsAiHubView
            v-else-if="activeTab === 'ai'"
            key="cardio-ai-view"
          />
        </template>

        <!-- Lifting Mode Views -->
        <template v-if="modeStore.isLiftingMode">
          <ViewsLiftPlansView
            v-if="activeTab === 'plans'"
            key="lift-plans-view"
          />
          <ViewsLiftHistoryView
            v-else-if="activeTab === 'history'"
            key="lift-history-view"
          />
          <ViewsAiHubView
            v-else-if="activeTab === 'ai'"
            key="lift-ai-view"
          />
        </template>
      </main>

      <!-- PWA Install Banner -->
      <div v-if="pwa.showInstallPrompt.value && !pwa.isInstalled.value" class="install-banner">
        <span class="install-icon">📲</span>
        <span class="install-text">Install Kardio for quick access</span>
        <button class="install-btn" @click="pwa.installApp">Install</button>
        <button class="install-dismiss" @click="pwa.showInstallPrompt.value = false">×</button>
      </div>

      <!-- Bottom Nav -->
      <LayoutBottomNav
        :active-tab="activeTab"
        :mode="modeStore.currentMode"
        @tab-change="handleTabChange"
      />

      <!-- Draggable Floating AI Button -->
      <AiDraggableFloatingButton
        :is-open="activeTab === 'ai'"
        @click="handleAiButtonClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWorkoutStore } from '~/stores/workout'
import { useAiStore } from '~/stores/ai'
import { useModeStore, type AppMode, type CardioTab, type LiftingTab } from '~/stores/mode'
import { usePWA } from '~/composables/usePWA'

const store = useWorkoutStore()
const aiStore = useAiStore()
const modeStore = useModeStore()
const pwa = usePWA()

// Active tab based on current mode
const activeTab = computed(() => modeStore.activeTab)

function handleTabChange(tab: CardioTab | LiftingTab) {
  modeStore.switchTab(tab)
}

function handleAiButtonClick() {
  if (activeTab.value === 'ai') {
    // Go back to main view based on mode
    if (modeStore.isCardioMode) {
      modeStore.switchTab('timer')
    } else {
      modeStore.switchTab('plans')
    }
  } else {
    // Open AI tab
    modeStore.switchTab('ai')
  }
}

function handleModeChange(mode: AppMode) {
  // Mode is already set in the store, this just handles any additional side effects
  // The view will automatically re-render based on the new mode
}

function handlePlanSelected() {
  // Switch to timer tab when a plan is selected (only in cardio mode)
  if (modeStore.isCardioMode) {
    modeStore.setCardioTab('timer')
  }
}

onMounted(async () => {
  // Load mode from storage
  modeStore.loadMode()
  aiStore.loadHistory()

  // Load cardio store data
  store.loadHistory()
  store.loadSettings()
  store.loadPlans()
  store.loadAchievements()

  // Load lift store
  const { useLiftStore } = await import('~/stores/lift')
  const liftStore = useLiftStore()
  liftStore.loadPlans()
  liftStore.loadHistory()
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
