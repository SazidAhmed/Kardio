<template>
  <div class="lift-view">
    <!-- Idle State: Plan Selection + History -->
    <template v-if="store.workoutState === 'idle' || store.workoutState === 'finished'">
      <!-- Plan Selection -->
      <section class="section">
        <div class="section-header">
          <label class="section-label">SELECT ROUTINE</label>
          <div class="section-actions">
            <button class="btn-ai" @click="showAiPlanner = true">AI Plan</button>
            <button class="btn-manage" @click="showEditor = true; editingPlan = null; resetForm()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New
            </button>
          </div>
        </div>
        <button class="ai-banner" @click="showAiPlanner = true">
          <div>
            <span class="ai-banner-label">Body Photo Planner</span>
            <h3>Generate AI cardio and lifting routines together</h3>
            <p>Use Gemini to create draft plans from your photos, goal, equipment, and training level.</p>
          </div>
          <span class="ai-banner-cta">Open</span>
        </button>
        <div class="preset-scroll">
          <div class="preset-list">
            <button
              v-for="plan in store.plans"
              :key="plan.id"
              class="preset-card"
              :class="{ active: store.selectedPlanId === plan.id }"
              @click="store.selectPlan(plan.id)"
            >
              <div class="preset-header">
                <span class="preset-icon">{{ plan.icon }}</span>
                <button class="btn-edit-sm" @click.stop="openEditor(plan)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
              <span class="preset-name">{{ plan.name }}</span>
              <span class="preset-meta">{{ plan.exercises.length }} exercises · {{ plan.restBetweenSets }}s rest</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Plan Preview -->
      <section v-if="selectedPlan" class="section">
        <label class="section-label">EXERCISES</label>
        <div class="exercises-list">
          <div v-for="(exercise, index) in selectedPlan.exercises" :key="exercise.id" class="exercise-row">
            <div class="exercise-info">
              <span class="exercise-index">{{ index + 1 }}</span>
              <span class="exercise-name">{{ exercise.name }}</span>
            </div>
            <span class="exercise-meta">{{ exercise.sets.length }}×{{ exercise.sets[0]?.reps || 0 }} @ {{ exercise.sets[0]?.weight || 0 }}kg</span>
          </div>
        </div>
      </section>

      <!-- Start Button -->
      <section v-if="selectedPlan" class="section action-section">
        <button class="btn-start" @click="startWorkout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start Workout
        </button>
      </section>

      <!-- Finished State -->
      <section v-if="store.workoutState === 'finished'" class="section">
        <div class="finish-card">
          <div class="finish-icon">🎉</div>
          <div class="finish-stats">
            <div class="finish-stat">
              <span class="finish-stat-value">{{ store.totalVolume }}kg</span>
              <span class="finish-stat-label">Volume</span>
            </div>
            <div class="finish-stat">
              <span class="finish-stat-value">{{ store.totalSetsCompleted }}</span>
              <span class="finish-stat-label">Sets</span>
            </div>
            <div class="finish-stat">
              <span class="finish-stat-value">{{ store.formatElapsed }}</span>
              <span class="finish-stat-label">Time</span>
            </div>
          </div>
          <button class="btn-secondary" @click="store.resetWorkout()">Back to Plans</button>
        </div>
      </section>

    </template>

    <!-- Active Workout State -->
    <template v-if="store.workoutState === 'active'">
      <!-- Progress Bar -->
      <section class="section">
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: store.workoutProgress + '%' }"></div>
        </div>
        <div class="progress-info">
          <span>{{ store.totalSetsCompleted }}/{{ store.totalSets }} sets</span>
          <span>{{ store.formatElapsed }}</span>
        </div>
      </section>

      <!-- Current Exercise -->
      <section class="section">
        <div class="current-exercise-card">
          <div class="current-exercise-header">
            <span class="current-exercise-name">{{ store.currentExercise?.name }}</span>
            <span class="current-set-label">Set {{ store.currentSetIndex + 1 }}/{{ store.currentExercise?.sets.length }}</span>
          </div>

          <!-- Reps & Weight Controls -->
          <div class="set-controls">
            <div class="set-control">
              <label class="set-control-label">REPS</label>
              <div class="stepper">
                <button class="step-btn" @click="store.updateCurrentSet('reps', -1)">
                  <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
                <span class="step-value">{{ store.currentSet?.reps }}</span>
                <button class="step-btn" @click="store.updateCurrentSet('reps', 1)">
                  <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
            <div class="set-control">
              <label class="set-control-label">WEIGHT (kg)</label>
              <div class="stepper">
                <button class="step-btn" @click="store.updateCurrentSet('weight', -2.5)">
                  <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
                <span class="step-value">{{ store.currentSet?.weight }}</span>
                <button class="step-btn" @click="store.updateCurrentSet('weight', 2.5)">
                  <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Complete Set Button -->
          <button class="btn-complete-set" @click="store.completeSet()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            Complete Set
          </button>
        </div>
      </section>

      <!-- Exercise Overview -->
      <section class="section">
        <label class="section-label">ROUTINE</label>
        <div class="routine-overview">
          <div
            v-for="(ex, i) in store.activeExercises"
            :key="ex.id"
            class="routine-item"
            :class="{ current: i === store.currentExerciseIndex, done: ex.sets.every(s => s.completed) }"
          >
            <span class="routine-item-name">{{ ex.name }}</span>
            <div class="routine-item-sets">
              <span
                v-for="(s, si) in ex.sets"
                :key="si"
                class="routine-dot"
                :class="{ done: s.completed, current: i === store.currentExerciseIndex && si === store.currentSetIndex }"
              ></span>
            </div>
          </div>
        </div>
      </section>

      <!-- Finish Early -->
      <section class="section action-section">
        <button class="btn-finish" @click="store.finishWorkout(false)">
          Finish Workout
        </button>
      </section>
    </template>

    <!-- Rest Timer State -->
    <template v-if="store.workoutState === 'resting'">
      <section class="section timer-section">
        <div class="rest-label">REST</div>
        <div class="rest-dial-container">
          <svg class="rest-dial-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="88" fill="none" stroke="#5856d6" stroke-width="6" stroke-opacity="0.3"/>
            <circle
              cx="100" cy="100" r="88" fill="none"
              stroke="#ff9500" stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="553"
              :stroke-dashoffset="restDashOffset"
              transform="rotate(-90 100 100)"
              class="dial-progress"
            />
          </svg>
          <div class="rest-timer-display">
            <span class="rest-timer-digits">{{ formatRestTime }}</span>
          </div>
        </div>

        <div class="rest-actions">
          <button class="btn-skip" @click="store.skipRest()">
            Skip Rest
          </button>
          <button class="btn-add-time" @click="store.addRestTime(15)">
            +15s
          </button>
        </div>

        <!-- Next Up -->
        <div class="next-up">
          <span class="next-up-label">Next:</span>
          <span class="next-up-value">{{ nextUpText }}</span>
        </div>
      </section>
    </template>

    <!-- Plan Editor Modal -->
    <div v-if="showEditor" class="modal-overlay" @click.self="showEditor = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPlan ? 'Edit' : 'New' }} Routine</h3>
          <button class="btn-close" @click="showEditor = false">×</button>
        </div>

        <div class="modal-body">
          <!-- Plan Name -->
          <div class="form-group">
            <label class="form-label">Name</label>
            <input v-model="planForm.name" class="form-input" placeholder="e.g. Push Day" />
          </div>

          <!-- Icon -->
          <div class="form-group">
            <label class="form-label">Icon</label>
            <div class="icon-picker">
              <button
                v-for="icon in availableIcons"
                :key="icon"
                class="icon-option"
                :class="{ active: planForm.icon === icon }"
                @click="planForm.icon = icon"
              >{{ icon }}</button>
            </div>
          </div>

          <!-- Rest Between Sets -->
          <div class="form-group">
            <label class="form-label">Rest between sets (seconds)</label>
            <div class="stepper">
              <button class="step-btn" @click="planForm.restBetweenSets = Math.max(0, planForm.restBetweenSets - 15)">
                <svg width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              </button>
              <span class="step-value">{{ planForm.restBetweenSets }}s</span>
              <button class="step-btn" @click="planForm.restBetweenSets += 15">
                <svg width="16" height="16" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>

          <!-- Exercises -->
          <div class="form-group">
            <label class="form-label">Exercises</label>
            <div class="editor-exercises">
              <div v-for="(exercise, eIndex) in planForm.exercises" :key="eIndex" class="editor-exercise">
                <div class="editor-exercise-header">
                  <input v-model="exercise.name" class="form-input exercise-name-input" placeholder="Exercise name" />
                  <button class="btn-remove" @click="planForm.exercises.splice(eIndex, 1)">×</button>
                </div>
                <!-- Per-Set Configuration -->
                <div class="sets-list">
                  <div v-for="(set, sIndex) in exercise.sets" :key="sIndex" class="set-row">
                    <span class="set-number">Set {{ Number(sIndex) + 1 }}</span>
                    <div class="set-inputs">
                      <div class="set-input-group">
                        <label class="set-input-label">Reps</label>
                        <input
                          v-model.number="set.reps"
                          type="number"
                          class="set-input"
                          min="1"
                        />
                      </div>
                      <div class="set-input-group">
                        <label class="set-input-label">kg</label>
                        <input
                          v-model.number="set.weight"
                          type="number"
                          class="set-input"
                          min="0"
                          step="2.5"
                        />
                      </div>
                    </div>
                    <button
                      v-if="exercise.sets.length > 1"
                      class="btn-remove-set"
                      @click="exercise.sets.splice(sIndex, 1)"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <button
                    class="btn-add-set"
                    @click="exercise.sets.push({ reps: exercise.sets[exercise.sets.length - 1]?.reps || 8, weight: exercise.sets[exercise.sets.length - 1]?.weight || 0, completed: false })"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Set
                  </button>
                </div>
              </div>
              <button class="btn-add-exercise" @click="addExercise">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Exercise
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showEditor = false">Cancel</button>
          <button
            v-if="editingPlan"
            class="btn-danger-outline"
            @click="showEditor = false; confirmDeletePlan(editingPlan)"
          >
            Delete
          </button>
          <button class="btn-primary" @click="savePlan">
            {{ editingPlan ? 'Save' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-content confirm-modal">
        <div class="confirm-icon">🗑️</div>
        <h3>Delete Routine?</h3>
        <p>Are you sure you want to delete "{{ planToDelete?.name }}"? This cannot be undone.</p>
        <div class="confirm-actions">
          <button class="btn-secondary" @click="showDeleteConfirm = false">Keep</button>
          <button class="btn-danger" @click="deletePlan">Delete</button>
        </div>
      </div>
    </div>

    <AiPlannerSheet :open="showAiPlanner" @close="showAiPlanner = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLiftStore, type LiftPlan, type LiftExercise, type LiftSet } from '~/stores/lift'
import { useAudioFeedback } from '~/composables/useAudioFeedback'

const store = useLiftStore()
const audio = useAudioFeedback()

// Editor state
const showEditor = ref(false)
const editingPlan = ref<LiftPlan | null>(null)
const showDeleteConfirm = ref(false)
const planToDelete = ref<LiftPlan | null>(null)
const showAiPlanner = ref(false)

const availableIcons = ['💪', '🏋️', '🦵', '🔥', '⚡', '🏃', '🚴', '⭐', '💎', '🎯', '🚀', '🧱']

const exerciseSuggestions = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Pull-ups', 'Chin-ups', 'Dumbbell Curl', 'Tricep Extension', 'Leg Press',
  'Romanian Deadlift', 'Calf Raises', 'Lunges', 'Lat Pulldown',
  'Cable Fly', 'Face Pull', 'Hip Thrust', 'Leg Curl',
]

// Default form
const defaultForm = {
  name: '',
  icon: '💪',
  restBetweenSets: 90,
  exercises: [
    { id: `ex_${Date.now()}_1`, name: '', sets: [{ reps: 8, weight: 0, completed: false }] as LiftSet[] }
  ] as LiftExercise[],
}

const planForm = ref({ ...JSON.parse(JSON.stringify(defaultForm)) })

let exerciseIdCounter = 1
function generateId() {
  return `ex_${Date.now()}_${exerciseIdCounter++}`
}

function resetForm() {
  planForm.value = JSON.parse(JSON.stringify(defaultForm))
  planForm.value.exercises[0].id = generateId()
}

function openEditor(plan: LiftPlan) {
  editingPlan.value = plan
  planForm.value = {
    name: plan.name,
    icon: plan.icon,
    restBetweenSets: plan.restBetweenSets,
    exercises: plan.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s })),
    })),
  }
  showEditor.value = true
}

function addExercise() {
  planForm.value.exercises.push({
    id: generateId(),
    name: '',
    sets: [{ reps: 8, weight: 0, completed: false }],
  })
}

function savePlan() {
  if (!planForm.value.name.trim()) return

  const planData = {
    name: planForm.value.name.trim(),
    icon: planForm.value.icon,
    description: '',
    exercises: planForm.value.exercises,
    restBetweenSets: planForm.value.restBetweenSets,
  }

  if (editingPlan.value) {
    store.updatePlan(editingPlan.value.id, planData)
  } else {
    store.createPlan(planData)
  }
  showEditor.value = false
}

function confirmDeletePlan(plan: LiftPlan) {
  planToDelete.value = plan
  showDeleteConfirm.value = true
}

function deletePlan() {
  if (planToDelete.value) {
    store.deletePlan(planToDelete.value.id)
    planToDelete.value = null
  }
  showDeleteConfirm.value = false
}

// Computed
const selectedPlan = computed(() => store.selectedPlan)

const formatRestTime = computed(() => {
  const s = store.restTimeRemaining
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
})

const restDashOffset = computed(() => {
  const plan = store.selectedPlan
  if (!plan || plan.restBetweenSets === 0) return 553
  const progress = store.restTimeRemaining / plan.restBetweenSets
  return 553 * (1 - progress)
})

const nextUpText = computed(() => {
  const exercise = store.currentExercise
  if (!exercise) return ''

  if (store.currentSetIndex < exercise.sets.length - 1) {
    return `${exercise.name} — Set ${store.currentSetIndex + 2}`
  }

  const nextIndex = store.currentExerciseIndex + 1
  if (nextIndex < store.activeExercises.length) {
    const nextEx = store.activeExercises[nextIndex]
    return `${nextEx.name} — Set 1`
  }

  return 'Finish!'
})

// Start workout with countdown
const countdownValue = ref<number | null>(null)
const isCountingDown = computed(() => countdownValue.value !== null)

async function startWorkout() {
  // 3-2-1 countdown
  countdownValue.value = 3
  audio.playBeep(600, 0.2)

  await new Promise(r => setTimeout(r, 1000))
  if (countdownValue.value === null) return

  countdownValue.value = 2
  audio.playBeep(800, 0.2)

  await new Promise(r => setTimeout(r, 1000))
  if (countdownValue.value === null) return

  countdownValue.value = 1
  audio.playBeep(1000, 0.3)

  await new Promise(r => setTimeout(r, 1000))

  countdownValue.value = null

  // Announce first exercise
  const firstExercise = store.selectedPlan?.exercises[0]
  if (firstExercise) {
    audio.speak(`${firstExercise.name} set 1`)
  }

  store.startWorkout()
}
</script>

<style scoped>
.lift-view {
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

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
  margin-bottom: 8px;
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

.btn-ai {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--accent-primary);
  background: transparent;
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.ai-banner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(88, 86, 214, 0.18);
  background:
    radial-gradient(circle at top left, rgba(52, 199, 89, 0.18), transparent 48%),
    linear-gradient(135deg, rgba(88, 86, 214, 0.12), rgba(255, 149, 0, 0.08));
  text-align: left;
  cursor: pointer;
}

.ai-banner-label {
  display: inline-block;
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(88, 86, 214, 0.16);
  color: var(--accent-primary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.ai-banner h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text-primary);
}

.ai-banner p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.ai-banner-cta {
  padding: 9px 14px;
  border-radius: 999px;
  background: var(--accent-primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
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

.preset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 2px;
}

.preset-icon { font-size: 16px; }
.preset-name { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
.preset-meta { font-size: 9px; color: var(--text-secondary); white-space: nowrap; }

.btn-edit-sm {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
}

.btn-edit-sm:hover {
  background: var(--bg-primary);
  color: var(--accent-primary);
}

/* Exercise List (Plan Preview) */
.exercises-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exercise-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  border: 1.5px solid var(--border-color);
}

.exercise-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.exercise-index {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.exercise-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.exercise-meta {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
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

.btn-secondary {
  padding: 10px 16px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--bg-primary);
  border-color: var(--text-secondary);
}

/* Finish Card */
.finish-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  border: 2px solid var(--accent-primary);
}

.finish-icon { font-size: 40px; }

.finish-stats {
  display: flex;
  gap: 24px;
}

.finish-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.finish-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.finish-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Progress Bar */
.progress-bar-container {
  width: 100%;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--accent-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* Current Exercise Card */
.current-exercise-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 2px solid var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.current-exercise-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-exercise-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.current-set-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
  background: var(--accent-glow);
  padding: 4px 10px;
  border-radius: var(--radius-full);
}

.set-controls {
  display: flex;
  gap: 16px;
}

.set-control {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.set-control-label {
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
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.step-btn:hover {
  background: var(--accent-glow);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.step-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 50px;
  text-align: center;
}

.btn-complete-set {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: var(--radius-full);
  border: none;
  background: #34c759;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(52, 199, 89, 0.3);
}

.btn-complete-set:hover {
  background: #2db84e;
  transform: translateY(-1px);
}

.btn-finish {
  padding: 10px 20px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-finish:hover {
  border-color: #ff3b30;
  color: #ff3b30;
}

/* Routine Overview */
.routine-overview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.routine-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1.5px solid var(--border-color);
  transition: all 0.2s ease;
}

.routine-item.current {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
}

.routine-item.done {
  opacity: 0.5;
}

.routine-item-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.routine-item-sets {
  display: flex;
  gap: 4px;
}

.routine-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-color);
  transition: all 0.2s ease;
}

.routine-dot.done {
  background: #34c759;
}

.routine-dot.current {
  background: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

/* Rest Timer */
.timer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.rest-label {
  font-size: 14px;
  font-weight: 700;
  color: #ff9500;
  letter-spacing: 2px;
}

.rest-dial-container {
  position: relative;
  width: 200px;
  height: 200px;
}

.rest-dial-svg {
  width: 200px;
  height: 200px;
}

.dial-progress {
  transition: stroke-dashoffset 0.9s linear, stroke 0.3s ease;
}

.rest-timer-display {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rest-timer-digits {
  font-size: 42px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
}

.rest-actions {
  display: flex;
  gap: 10px;
}

.btn-skip {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-skip:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-add-time {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-time:hover {
  background: var(--accent-secondary);
}

.next-up {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.next-up-label {
  color: var(--text-secondary);
}

.next-up-value {
  font-weight: 600;
  color: var(--text-primary);
  margin-left: 4px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: var(--bg-card);
  border-radius: 20px 20px 0 0;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.form-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: var(--accent-primary);
}

.icon-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.icon-option {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-primary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-option.active {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
}

/* Editor Exercises */
.editor-exercises {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-exercise {
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-exercise-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exercise-name-input {
  flex: 1;
  padding: 8px 10px !important;
  font-size: 13px !important;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #ff3b30;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Per-Set Configuration */
.sets-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.set-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.set-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 48px;
}

.set-inputs {
  flex: 1;
  display: flex;
  gap: 12px;
}

.set-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.set-input-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.set-input {
  width: 60px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  outline: none;
}

.set-input:focus {
  border-color: var(--accent-primary);
}

.set-input::-webkit-outer-spin-button,
.set-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.btn-remove-set {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #ff3b30;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s ease;
}

.btn-remove-set:hover {
  background: #ffebee;
}

.btn-add-set {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add-set:hover {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
}

.btn-add-exercise {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: var(--radius-md);
  border: 1.5px dashed var(--border-color);
  background: transparent;
  color: var(--accent-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-exercise:hover {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px 20px;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-secondary);
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1.5px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-danger {
  background: #ff3b30;
  color: white;
}

.btn-danger:hover {
  background: #d32f2f;
}

.btn-danger-outline {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid #ff3b30;
  background: transparent;
  color: #ff3b30;
}

.btn-danger-outline:hover {
  background: #ffebee;
}

.confirm-modal {
  max-width: 320px;
  border-radius: 20px;
  margin: auto;
  padding: 24px;
  text-align: center;
}

.confirm-icon { font-size: 36px; margin-bottom: 8px; }
.confirm-modal h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.confirm-modal p { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }

.confirm-actions {
  display: flex;
  gap: 10px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
