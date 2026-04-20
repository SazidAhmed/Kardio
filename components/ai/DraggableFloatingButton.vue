<template>
  <div
    ref="buttonRef"
    class="floating-ai-button"
    :class="{ 'is-dragging': isDragging, 'is-open': isOpen }"
    :style="buttonStyle"
    @mousedown="startDrag"
    @touchstart="startDrag"
    @click="handleClick"
  >
    <div class="fab-inner">
      <svg v-if="!isOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/>
        <path d="M9 9h.01M15 9h.01M8 14c1.2 1 2.56 1.5 4 1.5S14.8 15 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </div>

    <!-- Tooltip -->
    <div v-if="!isDragging && showTooltip" class="fab-tooltip">
      AI Planner
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  isOpen?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const buttonRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const showTooltip = ref(false)
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null

// Position state
const position = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

// Load saved position or default to bottom-right
onMounted(() => {
  const saved = localStorage.getItem('kardio-fab-position')
  if (saved) {
    position.value = JSON.parse(saved)
  } else {
    // Default position: bottom-right with padding
    const padding = 20
    position.value = {
      x: window.innerWidth - 72 - padding,
      y: window.innerHeight - 140 // Above bottom nav
    }
  }

  // Show tooltip briefly on mount
  showTooltip.value = true
  tooltipTimeout = setTimeout(() => {
    showTooltip.value = false
  }, 3000)
})

onUnmounted(() => {
  if (tooltipTimeout) clearTimeout(tooltipTimeout)
  removeListeners()
})

const buttonStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  cursor: isDragging.value ? 'grabbing' : 'grab'
}))

let startX = 0
let startY = 0
let hasMoved = false

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  hasMoved = false

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  startX = clientX
  startY = clientY
  dragOffset.value.x = clientX - position.value.x
  dragOffset.value.y = clientY - position.value.y

  // Add global listeners
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)

  // Hide tooltip during drag
  showTooltip.value = false
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  e.preventDefault()

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  // Check if actually moved (for click detection)
  if (Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5) {
    hasMoved = true
  }

  // Calculate new position with boundary constraints
  const buttonSize = 56
  const maxX = window.innerWidth - buttonSize - 8
  const maxY = window.innerHeight - buttonSize - 8
  const minY = 80 // Keep below header

  let newX = clientX - dragOffset.value.x
  let newY = clientY - dragOffset.value.y

  // Constrain to viewport
  newX = Math.max(8, Math.min(newX, maxX))
  newY = Math.max(minY, Math.min(newY, maxY))

  position.value = { x: newX, y: newY }
}

function stopDrag() {
  isDragging.value = false
  removeListeners()

  // Snap to edge if close (optional UX enhancement)
  const buttonSize = 56
  const maxX = window.innerWidth - buttonSize - 8
  const snapThreshold = 60

  if (position.value.x < snapThreshold) {
    position.value.x = 16
  } else if (position.value.x > maxX - snapThreshold) {
    position.value.x = maxX - 8
  }

  // Save position
  localStorage.setItem('kardio-fab-position', JSON.stringify(position.value))
}

function removeListeners() {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
}

function handleClick() {
  // Only emit click if we didn't drag
  if (!hasMoved && !isDragging.value) {
    emit('click')
  }
}
</script>

<style scoped>
.floating-ai-button {
  position: fixed;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5856D6 0%, #7B79E0 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  touch-action: none;
  z-index: 150;
  box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.floating-ai-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 28px rgba(88, 86, 214, 0.5), 0 3px 12px rgba(0, 0, 0, 0.2);
}

.floating-ai-button.is-dragging {
  cursor: grabbing;
  transform: scale(1.1);
  box-shadow: 0 8px 32px rgba(88, 86, 214, 0.6), 0 4px 16px rgba(0, 0, 0, 0.25);
  transition: none;
}

.floating-ai-button.is-open {
  background: linear-gradient(135deg, #ff3b5c 0%, #ff6b7a 100%);
}

.fab-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.fab-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card, #1c1c1e);
  color: var(--text-primary, #ffffff);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color, #2c2c2e);
  pointer-events: none;
  animation: fadeIn 0.2s ease;
}

.fab-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--bg-card, #1c1c1e);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Pulse animation when idle */
.floating-ai-button:not(.is-dragging):not(.is-open)::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #5856D6;
  opacity: 0;
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}
</style>
