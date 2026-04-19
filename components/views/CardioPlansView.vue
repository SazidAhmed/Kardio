<template>
  <div class="plans-view">
    <!-- Header -->
    <section class="section">
      <div class="plans-header">
        <h2 class="section-title">My Workout Plans</h2>
        <div class="header-actions">
          <button class="btn-ai" @click="showAiPlanner = true">
            AI Plan
          </button>
          <button class="btn-add" @click="startCreatePlan">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round"/>
            </svg>
            New Plan
          </button>
        </div>
      </div>
    </section>

    <section class="section">
      <button class="ai-banner" @click="showAiPlanner = true">
        <div>
          <span class="ai-banner-label">New</span>
          <h3>Generate a cardio and lifting plan from body photos</h3>
          <p>Upload up to 3 images, add your goal and equipment, then review the AI plan before saving.</p>
        </div>
        <span class="ai-banner-cta">Open</span>
      </button>
    </section>

    <!-- Plans List -->
    <section class="section">
      <div v-if="store.plans.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p class="empty-text">No workout plans yet</p>
        <p class="empty-subtext">Create your first custom plan to get started</p>
      </div>

      <div v-else class="plans-list">
        <div
          v-for="plan in store.plans"
          :key="plan.id"
          class="plan-card"
          :class="{ active: store.selectedPlanId === plan.id }"
          @click="selectPlan(plan.id)"
        >
          <div class="plan-header">
            <div class="plan-info">
              <span class="plan-icon">{{ plan.icon }}</span>
              <div class="plan-details">
                <span class="plan-name">{{ plan.name }}</span>
                <span class="plan-meta">{{ plan.exercises.length }} exercises · {{ totalSetsInPlan(plan) }} sets total</span>
              </div>
            </div>
            <div class="plan-actions">
              <button
                class="btn-star"
                :class="{ starred: store.isFavorite(plan.id) }"
                @click.stop="store.toggleFavorite(plan.id)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
              <button class="btn-duplicate" @click.stop="duplicatePlan(plan.id)" title="Duplicate plan">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button class="btn-edit" @click.stop="startEditPlan(plan)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                class="btn-delete"
                @click.stop="confirmDeletePlan(plan)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Exercise Preview -->
          <div class="plan-exercises-preview">
            <div
              v-for="(ex, idx) in plan.exercises.slice(0, 4)"
              :key="ex.id"
              class="exercise-pill"
              :style="{ backgroundColor: getExerciseColor(ex.name) + '20', color: getExerciseColor(ex.name) }"
            >
              {{ ex.name }} ({{ ex.duration }}s)
            </div>
            <div v-if="plan.exercises.length > 4" class="exercise-more">
              +{{ plan.exercises.length - 4 }} more
            </div>
          </div>

          <div class="plan-footer">
            <span class="plan-duration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ formatDuration(calculateTotalDuration(plan)) }}
            </span>
            <span v-if="plan.warmupDuration > 0" class="plan-tag">Warmup</span>
            <span v-if="plan.cooldownDuration > 0" class="plan-tag">Cooldown</span>
            <span v-if="plan.restBetweenSets > 0" class="plan-tag">Rest Between Sets</span>
            <span v-if="plan.restBetweenExercises > 0" class="plan-tag">Rest Between Exercises</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Plan Editor Modal -->
    <div v-if="showEditor" class="modal-overlay" @click.self="closeEditor">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPlan ? 'Edit Plan' : 'New Workout Plan' }}</h3>
          <button class="btn-close" @click="closeEditor">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Plan Basic Info -->
          <div class="form-section">
            <label class="form-label">Plan Name</label>
            <input
              v-model="planForm.name"
              type="text"
              class="form-input"
              placeholder="e.g., Fat Burn, Morning HIIT"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Icon</label>
              <div class="icon-picker">
                <button
                  v-for="icon in availableIcons"
                  :key="icon"
                  class="icon-option"
                  :class="{ active: planForm.icon === icon }"
                  @click="planForm.icon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>
          </div>

          <!-- Global Settings -->
          <div class="form-section">
            <label class="section-label">SETTINGS</label>
            <div class="settings-grid">
              <div class="setting-item">
                <label class="setting-label">Warmup (s)</label>
                <div class="stepper">
                  <button class="step-btn" @click="updateFormValue('warmupDuration', -5)">−</button>
                  <span class="step-value">{{ planForm.warmupDuration }}</span>
                  <button class="step-btn" @click="updateFormValue('warmupDuration', 5)">+</button>
                </div>
              </div>
              <div class="setting-item">
                <label class="setting-label">Rest Between Sets (s)</label>
                <div class="stepper">
                  <button class="step-btn" @click="updateFormValue('restBetweenSets', -5)">−</button>
                  <span class="step-value">{{ planForm.restBetweenSets }}</span>
                  <button class="step-btn" @click="updateFormValue('restBetweenSets', 5)">+</button>
                </div>
              </div>
              <div class="setting-item">
                <label class="setting-label">Rest Between Exercises (s)</label>
                <div class="stepper">
                  <button class="step-btn" @click="updateFormValue('restBetweenExercises', -5)">−</button>
                  <span class="step-value">{{ planForm.restBetweenExercises }}</span>
                  <button class="step-btn" @click="updateFormValue('restBetweenExercises', 5)">+</button>
                </div>
              </div>
              <div class="setting-item">
                <label class="setting-label">Cooldown (s)</label>
                <div class="stepper">
                  <button class="step-btn" @click="updateFormValue('cooldownDuration', -5)">−</button>
                  <span class="step-value">{{ planForm.cooldownDuration }}</span>
                  <button class="step-btn" @click="updateFormValue('cooldownDuration', 5)">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Exercises -->
          <div class="form-section">
            <div class="exercises-header">
              <label class="section-label">EXERCISES</label>
              <span class="exercises-count">{{ planForm.exercises.length }} total</span>
            </div>

            <div class="exercises-list">
              <div
                v-for="(ex, idx) in planForm.exercises"
                :key="ex.id"
                class="exercise-editor"
              >
                <div class="exercise-number">{{ idx + 1 }}</div>
                <div class="exercise-inputs">
                  <input
                    v-model="ex.name"
                    type="text"
                    class="exercise-name-input"
                    placeholder="Exercise name"
                    list="exercise-suggestions"
                  />
                  <datalist id="exercise-suggestions">
                    <option v-for="suggestion in exerciseSuggestions" :key="suggestion" :value="suggestion"/>
                  </datalist>
                  <div class="duration-input-wrapper">
                    <input
                      v-model.number="ex.duration"
                      type="number"
                      class="exercise-duration-input"
                      min="5"
                      max="600"
                      step="5"
                    />
                    <span class="duration-unit">s</span>
                  </div>
                  <div class="sets-input-wrapper">
                    <input
                      v-model.number="ex.sets"
                      type="number"
                      class="exercise-sets-input"
                      min="1"
                      max="10"
                      step="1"
                    />
                    <span class="sets-unit">sets</span>
                  </div>
                </div>
                <div class="exercise-color" :style="{ backgroundColor: getExerciseColor(ex.name) }"></div>
                <button class="btn-remove-exercise" @click="removeExercise(idx)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <button class="btn-add-exercise" @click="addExercise">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round"/>
                <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round"/>
              </svg>
              Add Exercise
            </button>
          </div>

          <!-- Total Duration Preview -->
          <div class="form-section total-preview">
            <div class="total-row">
              <span class="total-label">Total Duration</span>
              <span class="total-value">{{ formatDuration(calculateFormTotalDuration()) }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeEditor">Cancel</button>
          <button
            v-if="editingPlan"
            class="btn-danger-outline"
            @click="closeEditor(); confirmDeletePlan(editingPlan)"
          >
            Delete
          </button>
          <button class="btn-primary" @click="savePlan">
            {{ editingPlan ? 'Save' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-content confirm-modal">
        <div class="confirm-icon">🗑️</div>
        <h3>Delete Plan?</h3>
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
import { ref, reactive, computed } from 'vue'
import { useWorkoutStore, type WorkoutPlan, type WorkoutExercise } from '~/stores/workout'

const store = useWorkoutStore()
const emit = defineEmits<{
  'select-plan': [planId: string]
}>()

// Editor state
const showEditor = ref(false)
const editingPlan = ref<WorkoutPlan | null>(null)
const showDeleteConfirm = ref(false)
const planToDelete = ref<WorkoutPlan | null>(null)
const showAiPlanner = ref(false)

// Available icons
const availableIcons = ['🌱', '🔥', '⚡', '💪', '🏃', '🚴', '🏊', '🧘', '⭐', '💎', '🎯', '🚀']

// Exercise suggestions
const exerciseSuggestions = [
  'Run', 'Walk', 'Rest', 'Push-ups', 'Squats', 'Burpees',
  'Plank', 'Lunges', 'High Knees', 'Mountain Climbers',
  'Jump Rope', 'Box Jumps', 'Kettlebell Swings',
  'Bicycle Crunches', 'Leg Raises', 'Russian Twists'
]

// Default form state
const defaultForm = {
  name: '',
  icon: '💪',
  description: '',
  warmupDuration: 30,
  cooldownDuration: 30,
  restBetweenSets: 30,
  restBetweenExercises: 60,
  exercises: [{ id: '1', name: 'New Exercise', duration: 30, sets: 3, color: '#5856d6' }] as WorkoutExercise[],
}

const planForm = reactive({ ...defaultForm })

// Generate unique ID for exercises
let exerciseIdCounter = 1
function generateExerciseId() {
  return `ex_${Date.now()}_${exerciseIdCounter++}`
}

function startCreatePlan() {
  editingPlan.value = null
  Object.assign(planForm, { ...defaultForm })
  planForm.exercises = [{ id: generateExerciseId(), name: 'New Exercise', duration: 30, sets: 3, color: '#5856d6' }]
  showEditor.value = true
}

function startEditPlan(plan: WorkoutPlan) {
  editingPlan.value = plan
  Object.assign(planForm, {
    name: plan.name,
    icon: plan.icon,
    description: plan.description || '',
    warmupDuration: plan.warmupDuration,
    cooldownDuration: plan.cooldownDuration,
    restBetweenSets: plan.restBetweenSets,
    restBetweenExercises: plan.restBetweenExercises,
    exercises: plan.exercises.map((ex: WorkoutExercise) => ({ ...ex })),
  })
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingPlan.value = null
}

function addExercise() {
  planForm.exercises.push({
    id: generateExerciseId(),
    name: 'New Exercise',
    duration: 30,
    sets: 3,
    color: '#5856d6',
  })
}

function removeExercise(index: number) {
  if (planForm.exercises.length > 1) {
    planForm.exercises.splice(index, 1)
  }
}


function updateFormValue(key: keyof typeof planForm, delta: number) {
  const current = planForm[key] as number
  ;(planForm as any)[key] = Math.max(0, current + delta)
}

function getExerciseColor(name: string): string {
  return store.exerciseColor(name)
}

function totalSetsInPlan(plan: WorkoutPlan): number {
  return plan.exercises.reduce((sum: number, ex: WorkoutExercise) => sum + (ex.sets || 1), 0)
}

function calculateTotalDuration(plan: WorkoutPlan): number {
  // For each exercise: (duration + rest between sets) * sets - last rest
  const perExerciseTime = plan.exercises.reduce((sum: number, ex: WorkoutExercise) => {
    const exerciseTime = ex.duration * (ex.sets || 1)
    const restBetweenSetsTime = plan.restBetweenSets > 0
      ? plan.restBetweenSets * ((ex.sets || 1) - 1)
      : 0
    return sum + exerciseTime + restBetweenSetsTime
  }, 0)

  // Rest between exercises
  const restBetweenExercises = plan.restBetweenExercises > 0 && plan.exercises.length > 1
    ? plan.restBetweenExercises * (plan.exercises.length - 1)
    : 0

  return plan.warmupDuration + perExerciseTime + restBetweenExercises + plan.cooldownDuration
}

function calculateFormTotalDuration(): number {
  const perExerciseTime = planForm.exercises.reduce((sum: number, ex: WorkoutExercise) => {
    const exerciseTime = ex.duration * (ex.sets || 1)
    const restBetweenSetsTime = planForm.restBetweenSets > 0
      ? planForm.restBetweenSets * ((ex.sets || 1) - 1)
      : 0
    return sum + exerciseTime + restBetweenSetsTime
  }, 0)

  const restBetweenExercises = planForm.restBetweenExercises > 0 && planForm.exercises.length > 1
    ? planForm.restBetweenExercises * (planForm.exercises.length - 1)
    : 0

  return planForm.warmupDuration + perExerciseTime + restBetweenExercises + planForm.cooldownDuration
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function isDefaultPlan(id: string): boolean {
  return ['beginner', 'fatburn', 'hiitbeast'].includes(id)
}

function savePlan() {
  if (!planForm.name.trim()) {
    alert('Please enter a plan name')
    return
  }

  if (planForm.exercises.length === 0) {
    alert('Please add at least one exercise')
    return
  }

  // Update exercise colors
  const exercisesWithColors = planForm.exercises.map((ex: WorkoutExercise) => ({
    ...ex,
    color: getExerciseColor(ex.name),
  }))

  if (editingPlan.value) {
    // Update existing
    store.updatePlan(editingPlan.value.id, {
      name: planForm.name.trim(),
      icon: planForm.icon,
      description: planForm.description,
      exercises: exercisesWithColors,
      warmupDuration: planForm.warmupDuration,
      cooldownDuration: planForm.cooldownDuration,
      restBetweenSets: planForm.restBetweenSets,
      restBetweenExercises: planForm.restBetweenExercises,
    })
  } else {
    // Create new
    store.createPlan({
      name: planForm.name.trim(),
      icon: planForm.icon,
      description: planForm.description,
      exercises: exercisesWithColors,
      warmupDuration: planForm.warmupDuration,
      cooldownDuration: planForm.cooldownDuration,
      restBetweenSets: planForm.restBetweenSets,
      restBetweenExercises: planForm.restBetweenExercises,
    })
  }

  closeEditor()
}

function selectPlan(planId: string) {
  store.selectPlan(planId)
  emit('select-plan', planId)
}

function confirmDeletePlan(plan: WorkoutPlan) {
  planToDelete.value = plan
  showDeleteConfirm.value = true
}

function deletePlan() {
  if (planToDelete.value) {
    store.deletePlan(planToDelete.value.id)
    showDeleteConfirm.value = false
    planToDelete.value = null
  }
}

function duplicatePlan(planId: string) {
  store.duplicatePlan(planId)
}

</script>

<style scoped>
.plans-view {
  width: 100%;
  padding: 0 16px;
  padding-bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  width: 100%;
}

.plans-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.btn-ai {
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--accent-primary);
  background: transparent;
  color: var(--accent-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
}

.ai-banner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(88, 86, 214, 0.18);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at top left, rgba(88, 86, 214, 0.2), transparent 52%),
    linear-gradient(135deg, rgba(255, 149, 0, 0.08), rgba(88, 86, 214, 0.12));
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.ai-banner h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.ai-banner p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.ai-banner-cta {
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--accent-primary);
  color: white;
  font-size: 13px;
  font-weight: 700;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.empty-subtext {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* Plans List */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.plan-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.plan-card.active {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
}

.plan-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.plan-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plan-icon {
  font-size: 28px;
  line-height: 1;
}

.plan-details {
  display: flex;
  flex-direction: column;
}

.plan-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.plan-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.plan-actions {
  display: flex;
  gap: 4px;
}

.btn-star,
.btn-duplicate,
.btn-edit,
.btn-delete {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-star:hover,
.btn-duplicate:hover,
.btn-edit:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn-star.starred {
  color: #ff9500;
}

.btn-delete:hover {
  background: #ffebee;
  color: #ff3b30;
}

/* Exercise Preview */
.plan-exercises-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.exercise-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 20px;
}

.exercise-more {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 4px 8px;
}

/* Plan Footer */
.plan-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.plan-duration {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-right: 8px;
}

.plan-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-tertiary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border-color);
}

/* Form Styles */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Icon Picker */
.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-option:hover {
  border-color: var(--accent-primary);
}

.icon-option.active {
  border-color: var(--accent-primary);
  background: var(--accent-glow);
}

/* Settings Grid */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.setting-item {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.step-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.step-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.step-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 40px;
  text-align: center;
}

/* Exercises Editor */
.exercises-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.exercises-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.exercises-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exercise-editor {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}

.exercise-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.exercise-inputs {
  flex: 1;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.exercise-name-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}

.exercise-name-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.duration-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  padding: 0 10px;
  width: 80px;
  flex-shrink: 0;
}

.exercise-duration-input {
  width: 100%;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  text-align: center;
}

.exercise-duration-input:focus {
  outline: none;
}

.duration-unit {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 2px;
}

.sets-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  padding: 0 10px;
  width: 80px;
  flex-shrink: 0;
}

.exercise-sets-input {
  width: 100%;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  text-align: center;
}

.exercise-sets-input:focus {
  outline: none;
}

.sets-unit {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 2px;
}

.exercise-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.btn-remove-exercise {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.btn-remove-exercise:hover {
  background: #ffebee;
  color: #ff3b30;
}

.btn-add-exercise {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 2px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-exercise:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-glow);
}

/* Total Preview */
.total-preview {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: 14px 16px;
}

.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.total-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-primary);
}

/* Modal Buttons */
.btn-primary,
.btn-secondary,
.btn-danger {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: 15px;
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
  font-size: 15px;
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

/* Confirm Modal */
.confirm-modal {
  padding: 32px 24px;
  text-align: center;
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-modal h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.confirm-modal p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

/* Dark Mode */
:global(html.dark-mode) .modal-content {
  background: var(--bg-card);
}

:global(html.dark-mode) .confirm-modal {
  background: var(--bg-card);
}

/* Mobile Exercise Editor Improvements */
@media (max-width: 480px) {
  .duration-input-wrapper,
  .sets-input-wrapper {
    width: 60px;
    padding: 0 6px;
  }

  .exercise-name-input {
    min-width: 80px;
    font-size: 13px;
  }

  .exercise-editor {
    padding: 8px;
    gap: 6px;
  }

  .exercise-inputs {
    gap: 6px;
  }

  .exercise-number {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }

  .duration-unit,
  .sets-unit {
    font-size: 11px;
  }

  .btn-remove-exercise {
    width: 24px;
    height: 24px;
  }

  .exercise-color {
    width: 10px;
    height: 10px;
  }
}
</style>
