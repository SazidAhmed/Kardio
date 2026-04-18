<template>
  <nav class="bottom-nav">
    <div class="nav-content" :class="{ 'two-items': currentMode === 'lifting' }">
      <!-- Timer Tab - Only for Cardio mode -->
      <button
        v-if="currentMode === 'cardio'"
        class="nav-item"
        :class="{ active: activeTab === 'timer' }"
        @click="$emit('tab-change', 'timer')"
      >
        <div class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
            <polyline points="12 7 12 12 15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="nav-label">Timer</span>
      </button>

      <!-- Plans Tab - Available in both modes -->
      <button
        class="nav-item"
        :class="{ active: activeTab === 'plans' }"
        @click="$emit('tab-change', 'plans')"
      >
        <div class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="nav-label">Plans</span>
      </button>

      <!-- History Tab - Available in both modes -->
      <button
        class="nav-item"
        :class="{ active: activeTab === 'history' }"
        @click="$emit('tab-change', 'history')"
      >
        <div class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="#FF9500" opacity="0.8"/>
            <rect x="13" y="2" width="9" height="9" rx="2" fill="#5856D6" opacity="0.8"/>
            <rect x="2" y="13" width="9" height="9" rx="2" fill="#34C759" opacity="0.8"/>
            <rect x="13" y="13" width="9" height="9" rx="2" fill="#FF3B30" opacity="0.8"/>
          </svg>
        </div>
        <span class="nav-label">History</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModeStore, type AppMode } from '~/stores/mode'

const props = defineProps<{
  activeTab: 'timer' | 'plans' | 'history'
  mode: AppMode
}>()

const emit = defineEmits<{
  'tab-change': [tab: 'timer' | 'plans' | 'history']
}>()

const currentMode = computed(() => props.mode)
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-color);
  z-index: 100;
  display: flex;
  justify-content: center;
}

.nav-content {
  display: flex;
  width: 100%;
  max-width: 480px;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
}

.nav-content.two-items {
  justify-content: center;
  gap: 24px;
}

.nav-content.two-items .nav-item {
  flex: 0 0 auto;
  min-width: 80px;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all 0.2s ease;
  border-radius: 12px;
  margin: 0 8px;
}

.nav-item.active {
  color: var(--accent-primary);
}

.nav-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2px;
}
</style>
