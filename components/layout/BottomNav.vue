<template>
  <nav class="bottom-nav">
    <div class="nav-content">
      <button
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
defineProps<{
  activeTab: 'timer' | 'history'
}>()
defineEmits<{
  'tab-change': [tab: 'timer' | 'history']
}>()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.92);
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

/* Dark Mode */
:global(html.dark-mode) .bottom-nav {
  background: rgba(28, 28, 30, 0.92);
}
</style>
