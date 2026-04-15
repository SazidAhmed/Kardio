<template>
  <div class="app-shell">
    <div class="app-container">
      <!-- Header -->
      <LayoutAppHeader />

      <!-- Divider -->
      <div class="divider" />

      <!-- Page Content -->
      <main class="main-content">
        <ViewsTimerView v-if="activeTab === 'timer'" key="timer-view" />
        <ViewsHistoryView v-else-if="activeTab === 'history'" key="history-view" />
      </main>

      <!-- Bottom Nav -->
      <LayoutBottomNav :active-tab="activeTab" @tab-change="handleTabChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkoutStore } from '~/stores/workout'

const store = useWorkoutStore()
const activeTab = ref<'timer' | 'history'>('timer')

function handleTabChange(tab: 'timer' | 'history') {
  activeTab.value = tab
}

onMounted(() => {
  store.loadHistory()
  store.loadSettings()
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
</style>
