<template>
  <div class="timer-view">
    <!-- Workout Plan Selection -->
    <section class="section">
      <div class="section-header">
        <label class="section-label">SELECT PLAN</label>
        <button class="btn-manage" @click="emit('switch-tab', 'plans')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Manage
        </button>
      </div>
      <div class="preset-scroll">
        <div class="preset-list">
          <button
            v-for="plan in store.plans"
            :key="plan.id"
            class="preset-card"
            :class="{ active: store.selectedPlanId === plan.id, favorite: store.isFavorite(plan.id) }"
            @click="store.selectPlan(plan.id)"
          >
            <div class="preset-header">
              <span class="preset-icon">{{ plan.icon }}</span>
              <button
                class="btn-star"
                :class="{ starred: store.isFavorite(plan.id) }"
                @click.stop="store.toggleFavorite(plan.id)"
                :title="store.isFavorite(plan.id) ? 'Remove from favorites' : 'Add to favorites'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </button>
            </div>
            <span class="preset-name">{{ plan.name }}</span>
            <span class="preset-meta">{{ plan.exercises.length }} exercises · {{ plan.rounds }} rounds</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Exercise Cards - Dynamic from selected plan -->
    <section class="section">
      <label class="section-label">EXERCISES</label>
      <div class="exercises-grid">
        <!-- Warmup Card -->
        <div
          v-if="selectedPlan?.warmupDuration > 0"
          class="config-card"
          :class="{ active: isPhaseActive('warmup') }"
        >
          <label class="config-label">WARMUP</label>
          <div class="stepper">
            <button class="step-btn" @click="store.updateConfig('warmup', -1)" :disabled="store.timerState === 'running'">
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <span class="step-value">{{ selectedPlan?.warmupDuration }}s</span>
            <button class="step-btn" @click="store.updateConfig('warmup', 1)" :disabled="store.timerState === 'running'">
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Dynamic Exercise Cards -->
        <div
          v-for="(exercise, index) in selectedPlan?.exercises"
          :key="exercise.id"
          class="config-card exercise-card"
          :class="{ active: isExerciseActive(index) }"
          :style="{ '--exercise-color': getExerciseColor(exercise.name) }"
        >
          <label class="config-label">{{ exercise.name.toUpperCase() }}</label>
          <div class="stepper">
            <button
              class="step-btn"
              @click="updateExerciseDuration(index, -5)"
              :disabled="store.timerState === 'running'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <span class="step-value" :style="{ color: getExerciseColor(exercise.name) }">{{ exercise.duration }}s</span>
            <button
              class="step-btn"
              @click="updateExerciseDuration(index, 5)"
              :disabled="store.timerState === 'running'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <!-- Sets control -->
          <div class="stepper sets-stepper">
            <button
              class="step-btn"
              @click="updateExerciseSets(index, -1)"
              :disabled="store.timerState === 'running'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <span class="step-value">{{ exercise.sets }} sets</span>
            <button
              class="step-btn"
              @click="updateExerciseSets(index, 1)"
              :disabled="store.timerState === 'running'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Rest Between Sets Card -->
        <div
          v-if="selectedPlan?.restBetweenSets > 0"
          class="config-card"
          :class="{ active: isPhaseActive('rest') }"
        >
          <label class="config-label">REST <small>(between sets)</small></label>
          <div class="stepper">
            <button class="step-btn" @click="store.updateConfig('rest', -1)" :disabled="store.timerState === 'running'">
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <span class="step-value">{{ selectedPlan?.restBetweenSets }}s</span>
            <button class="step-btn" @click="store.updateConfig('rest', 1)" :disabled="store.timerState === 'running'">
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Cooldown Card -->
        <div
          v-if="selectedPlan?.cooldownDuration > 0"
          class="config-card"
          :class="{ active: isPhaseActive('cooldown') }"
        >
          <label class="config-label">COOLDOWN</label>
          <div class="stepper">
            <button class="step-btn" @click="store.updateConfig('cooldown', -1)" :disabled="store.timerState === 'running'">
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <span class="step-value">{{ selectedPlan?.cooldownDuration }}s</span>
            <button class="step-btn" @click="store.updateConfig('cooldown', 1)" :disabled="store.timerState === 'running'">
              <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Workout Summary Card -->
    <section class="section">
      <div class="summary-card">
        <div class="summary-top">
          <span class="summary-time">{{ formatTotalTime }}</span>
          <span class="summary-name">{{ selectedPlan?.exercises.length }} exercises · {{ selectedPlan?.name }}</span>
        </div>
      </div>
    </section>

    <!-- Circular Timer -->
    <section class="section timer-section">
      <button class="btn-mute" @click.stop="toggleMute" :title="isMuted ? 'Unmute' : 'Mute'">
        <svg v-if="isMuted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
      <div
        class="dial-container"
        :class="{ clickable: store.timerState === 'idle' || store.timerState === 'paused' || store.timerState === 'running' }"
        @click="handleTimerClick"
      >
        <svg class="dial-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="88" fill="none" stroke="#5856d6" stroke-width="6" stroke-opacity="0.3"/>
          <circle
            cx="100" cy="100" r="88" fill="none"
            :stroke="phaseColor" stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="553"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 100 100)"
            class="dial-progress"
          />
        </svg>

        <div class="timer-display">
          <span class="timer-digits">{{ timerFormatted }}</span>
        </div>
      </div>

      <div v-if="store.timerState !== 'idle' && store.currentExercise" class="phase-indicator">
        <span class="phase-current" :style="{ color: phaseColor }">
          {{ displayPhaseName }}
        </span>
        <span class="phase-round">— Set {{ store.currentSet }}/{{ store.currentExercise.sets }}</span>
      </div>

      <p v-if="store.timerState === 'idle' || store.timerState === 'paused'" class="up-next">
        <template v-if="selectedPlan?.warmupDuration > 0">
          Starting with: <strong :style="{ color: phaseColors.warmup }">WARMUP</strong>
          <span class="up-next-time">({{ formatSeconds(selectedPlan.warmupDuration) }})</span>
        </template>
        <template v-else-if="selectedPlan?.exercises.length > 0">
          Starting with: <strong :style="{ color: getExerciseColor(selectedPlan.exercises[0].name) }">{{ selectedPlan.exercises[0].name.toUpperCase() }}</strong>
          <span class="up-next-time">({{ formatSeconds(selectedPlan.exercises[0].duration) }})</span>
        </template>
      </p>
    </section>

    <!-- Action Buttons -->
    <section class="section action-section">
      <button
        v-if="store.timerState === 'idle'"
        class="btn-start"
        @click="store.startTimer()"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Start
      </button>

      <div v-if="store.timerState === 'paused'" class="paused-actions">
        <button class="btn-resume" @click="store.startTimer()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Resume
        </button>
        <button class="btn-reset-small" @click="store.resetTimer()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg>
          Reset
        </button>
      </div>

      <div v-if="store.timerState === 'running'" class="running-actions">
        <button class="btn-pause" @click="store.pauseTimer()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          Pause
        </button>
        <button class="btn-stop" @click="store.finishWorkout(false)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          Stop
        </button>
        <button class="btn-reset-small" @click="store.resetTimer()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg>
          Reset
        </button>
      </div>

      <button v-if="store.timerState === 'finished'" class="btn-start" @click="store.resetTimer()">
        Workout Done! Restart
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWorkoutStore, type WorkoutPlan, type WorkoutExercise } from '~/stores/workout'

const store = useWorkoutStore()
const emit = defineEmits<{
  'switch-tab': [tab: 'timer' | 'history' | 'plans']
}>()

const isMuted = ref(false) // Simplified - audio feedback handled in store

function toggleMute() {
  isMuted.value = !isMuted.value
}

// Get selected plan
const selectedPlan = computed<WorkoutPlan | null>(() => store.selectedPlan)

// Helper to get exercise color
function getExerciseColor(name: string): string {
  return store.exerciseColor(name)
}

// Check if phase is currently active
function isPhaseActive(phase: string): boolean {
  if (store.timerState === 'idle') return false
  return store.currentPhase === phase
}

// Check if specific exercise is currently active
function isExerciseActive(index: number): boolean {
  if (store.timerState === 'idle') return false
  return store.currentPhase === 'exercise' && store.currentExerciseIndex === index
}

// Update exercise duration in the plan
function updateExerciseDuration(index: number, delta: number) {
  store.updateExerciseConfig(index, 'duration', delta)
}

// Update exercise sets in the plan
function updateExerciseSets(index: number, delta: number) {
  store.updateExerciseConfig(index, 'sets', delta)
}

const phaseColors: Record<string, string> = {
  warmup: '#ff9500',
  exercise: '#ff3b30',
  rest: '#af52de',
  cooldown: '#5ac8fa',
  idle: '#5856d6',
  finished: '#34c759',
}

const phaseColor = computed(() => {
  if (store.currentPhase === 'exercise' && store.currentExercise) {
    return store.currentExercise.color || getExerciseColor(store.currentExercise.name)
  }
  return phaseColors[store.currentPhase] || '#5856d6'
})

// Display name for current phase
const displayPhaseName = computed(() => {
  if (store.currentPhase === 'exercise' && store.currentExercise) {
    return store.currentExercise.name.toUpperCase()
  }
  return store.currentPhase.toUpperCase()
})

const formatSeconds = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const timerFormatted = computed(() => formatSeconds(store.timeRemaining))

// Handle click on timer dial - toggle start/pause
function handleTimerClick() {
  if (store.timerState === 'idle') {
    store.startTimer()
  } else if (store.timerState === 'running') {
    store.pauseTimer()
  } else if (store.timerState === 'paused') {
    store.startTimer()
  }
}

const formatTotalTime = computed(() => {
  const total = store.totalWorkoutSeconds
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const dashOffset = computed(() => {
  const circumference = 553 // 2 * PI * 88
  if (store.timerState === 'idle') return circumference
  const phaseDuration = (() => {
    if (store.currentPhase === 'warmup') return store.config.warmup
    if (store.currentPhase === 'run') return store.config.run
    if (store.currentPhase === 'walk') return store.config.walk
    if (store.currentPhase === 'cooldown') return store.config.cooldown
    return 1
  })()
  const ratio = store.timeRemaining / phaseDuration
  return circumference * ratio
})
</script>

<style scoped>
.timer-view {
  width: 100%;
  padding: 0 16px;
  padding-bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section {
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.btn-manage {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--bg-card);
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-manage:hover {
  background: var(--accent-glow);
}

/* Preset Cards */
.preset-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.preset-scroll::-webkit-scrollbar { display: none; }

.preset-list {
  display: flex;
  gap: 6px;
  padding-bottom: 4px;
  width: 100%;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: var(--bg-card);
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

.preset-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.preset-card.active {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
}

.preset-icon { font-size: 16px; }
.preset-name { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
.preset-meta { font-size: 9px; color: var(--text-secondary); white-space: nowrap; }

/* Config Grid */
.exercises-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.config-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.config-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.config-card.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.exercise-card.active {
  border-color: var(--exercise-color, var(--accent-primary));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--exercise-color, var(--accent-primary)) 20%, transparent);
}

.exercise-card .step-value {
  color: var(--exercise-color, var(--accent-primary));
}

.exercise-card .sets-stepper {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.exercise-card .sets-stepper .step-value {
  color: var(--text-secondary);
  font-size: 13px;
}

.rounds-card {
  width: 100%;
}

.config-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.step-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.step-btn:hover:not(:disabled) {
  background: var(--accent-glow);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.step-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.step-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 50px;
  text-align: center;
}

.rounds-value { font-size: 24px; }

/* Summary Card */
.summary-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
}

.summary-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-time {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-name {
  font-size: 12px;
  color: var(--text-secondary);
}

.phase-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.phase-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.phase-tag.warmup { background: #fff3e0; color: var(--color-warmup); }
.phase-tag.run { background: #ffebee; color: var(--color-run); }
.phase-tag.walk { background: #e8f5e9; color: var(--color-walk); }
.phase-tag.cooldown { background: #e3f2fd; color: var(--color-cooldown); }

/* Timer Dial */
.timer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.dial-container {
  position: relative;
  width: 200px;
  height: 200px;
}

.dial-container.clickable {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.dial-container.clickable:hover {
  transform: scale(1.02);
}

.dial-container.clickable:active {
  transform: scale(0.98);
}

.dial-svg {
  width: 200px;
  height: 200px;
}

.dial-progress {
  transition: stroke-dashoffset 0.9s linear, stroke 0.3s ease;
}

.timer-display {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-digits {
  font-size: 42px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
}

.phase-indicator {
  text-align: center;
  font-size: 14px;
}

.phase-current { font-weight: 700; }
.phase-round { color: var(--text-secondary); margin-left: 4px; }

.up-next {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Mute Button */
.btn-mute {
  position: absolute;
  top: 0;
  right: 0;
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
  z-index: 10;
}

.btn-mute:hover {
  background: var(--bg-primary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.timer-section {
  position: relative;
}

/* Action Buttons */
.action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.btn-start {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 260px;
  padding: 16px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
}

.btn-start:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(88, 86, 214, 0.5);
}

.running-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  justify-content: center;
}

.paused-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 220px;
  justify-content: center;
}

.btn-resume {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-card);
}

.btn-resume:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(88, 86, 214, 0.4);
}

.btn-pause {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.btn-stop {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius-full);
  border: none;
  background: #ffebee;
  color: var(--color-run);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-small {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-small:hover {
  background: var(--bg-primary);
  border-color: var(--text-secondary);
}

/* Preset Star Button */
.preset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 2px;
}

.btn-star {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--border-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
  margin-left: 2px;
  flex-shrink: 0;
}

.btn-star svg {
  width: 14px;
  height: 14px;
}

.btn-star:hover {
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.btn-star.starred {
  color: #ff9500;
}

.btn-star.starred:hover {
  color: #ff6b35;
}

.preset-card.favorite {
  border-color: #ff9500;
  background: #fff8f0;
}
</style>
