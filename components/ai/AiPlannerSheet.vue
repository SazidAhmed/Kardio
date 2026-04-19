<template>
  <div v-if="open" class="planner-overlay" @click.self="closeSheet">
    <div class="planner-sheet">
      <div class="planner-header">
        <div>
          <p class="planner-eyebrow">AI Planner</p>
          <h3>Generate plans from body photos</h3>
        </div>
        <button class="planner-close" @click="closeSheet">x</button>
      </div>

      <div class="planner-body">
        <div v-if="!result" class="planner-form">
          <div class="notice-card">
            <p class="notice-title">Before you generate</p>
            <p class="notice-text">
              Upload up to 3 photos from different angles. The AI provides general training guidance only and should not be treated as medical advice.
            </p>
          </div>

          <div class="form-section">
            <label class="field-label">Photos</label>
            <input
              class="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              @change="handleFiles"
            >
            <p class="field-help">Recommended: front, side, back. Max 3 images. Photos are resized locally before sending.</p>
            <div v-if="photoPreviews.length > 0" class="preview-grid">
              <div v-for="preview in photoPreviews" :key="preview.name" class="preview-card">
                <img :src="preview.url" :alt="preview.name">
                <span>{{ preview.name }}</span>
              </div>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="field-label">Age</label>
              <input v-model.number="profile.age" type="number" min="12" max="100" class="field-input">
            </div>
            <div class="form-group">
              <label class="field-label">Sex</label>
              <select v-model="profile.sex" class="field-input">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div class="form-group">
              <label class="field-label">Height (cm)</label>
              <input v-model.number="profile.heightCm" type="number" min="100" max="250" class="field-input">
            </div>
            <div class="form-group">
              <label class="field-label">Weight (kg)</label>
              <input v-model.number="profile.weightKg" type="number" min="30" max="300" class="field-input">
            </div>
            <div class="form-group span-2">
              <label class="field-label">Goal</label>
              <input v-model="profile.goal" type="text" class="field-input" placeholder="Fat loss, endurance, recomposition, strength">
            </div>
            <div class="form-group">
              <label class="field-label">Experience</label>
              <select v-model="profile.experience" class="field-input">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div class="form-group">
              <label class="field-label">Days per week</label>
              <input v-model.number="profile.daysPerWeek" type="number" min="1" max="7" class="field-input">
            </div>
            <div class="form-group span-2">
              <label class="field-label">Equipment</label>
              <textarea v-model="profile.equipment" class="field-input textarea-input" rows="2" placeholder="Gym access, dumbbells, treadmill, bodyweight only"></textarea>
            </div>
            <div class="form-group span-2">
              <label class="field-label">Injuries or limits</label>
              <textarea v-model="profile.injuries" class="field-input textarea-input" rows="2" placeholder="Knee pain, lower back sensitivity, none"></textarea>
            </div>
          </div>

          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

          <button class="primary-btn" :disabled="isSubmitting" @click="generatePlans">
            {{ isSubmitting ? 'Generating...' : 'Generate AI Plans' }}
          </button>
        </div>

        <div v-else class="result-view">
          <div class="analysis-card">
            <div class="analysis-head">
              <div>
                <p class="planner-eyebrow">Analysis</p>
                <h4>{{ result.analysis.summary }}</h4>
              </div>
              <span class="confidence-badge">{{ result.analysis.confidence }}</span>
            </div>
            <p class="disclaimer-text">{{ result.analysis.disclaimer }}</p>
            <div v-if="result.analysis.focusAreas.length" class="chip-row">
              <span v-for="item in result.analysis.focusAreas" :key="item" class="chip">{{ item }}</span>
            </div>
            <ul v-if="result.analysis.flags.length" class="flag-list">
              <li v-for="item in result.analysis.flags" :key="item">{{ item }}</li>
            </ul>
          </div>

          <div class="plan-card">
            <div class="plan-card-head">
              <div>
                <span class="plan-icon">{{ result.cardioPlan.icon }}</span>
                <h4>{{ result.cardioPlan.name }}</h4>
              </div>
              <button class="secondary-btn" :disabled="cardioSaved" @click="saveCardioPlan">
                {{ cardioSaved ? 'Saved' : 'Save Cardio' }}
              </button>
            </div>
            <p class="plan-description">{{ result.cardioPlan.description }}</p>
            <div class="meta-row">
              <span>Warmup {{ result.cardioPlan.warmupDuration }}s</span>
              <span>Cooldown {{ result.cardioPlan.cooldownDuration }}s</span>
              <span>Rest {{ result.cardioPlan.restBetweenSets }}s</span>
            </div>
            <div class="exercise-list">
              <div v-for="exercise in result.cardioPlan.exercises" :key="exercise.name" class="exercise-row">
                <span>{{ exercise.name }}</span>
                <span>{{ exercise.sets }} x {{ exercise.duration }}s</span>
              </div>
            </div>
          </div>

          <div class="plan-card">
            <div class="plan-card-head">
              <div>
                <span class="plan-icon">{{ result.liftPlan.icon }}</span>
                <h4>{{ result.liftPlan.name }}</h4>
              </div>
              <button class="secondary-btn" :disabled="liftSaved" @click="saveLiftPlan">
                {{ liftSaved ? 'Saved' : 'Save Lift' }}
              </button>
            </div>
            <p class="plan-description">{{ result.liftPlan.description }}</p>
            <div class="meta-row">
              <span>Rest {{ result.liftPlan.restBetweenSets }}s</span>
              <span>{{ result.liftPlan.exercises.length }} exercises</span>
            </div>
            <div class="exercise-list">
              <div v-for="exercise in result.liftPlan.exercises" :key="exercise.name" class="exercise-stack">
                <div class="exercise-row">
                  <span>{{ exercise.name }}</span>
                  <span>{{ exercise.sets.length }} sets</span>
                </div>
                <div class="set-chip-row">
                  <span v-for="(set, index) in exercise.sets" :key="`${exercise.name}-${index}`" class="set-chip">
                    {{ set.reps }} reps @ {{ set.weight }}kg
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p v-if="saveMessage" class="save-text">{{ saveMessage }}</p>

          <div class="result-actions">
            <button class="secondary-btn" :disabled="cardioSaved && liftSaved" @click="saveBothPlans">
              {{ cardioSaved && liftSaved ? 'Both Saved' : 'Save Both Plans' }}
            </button>
            <button class="ghost-btn" @click="resetPlanner">Generate Again</button>
            <button class="primary-btn" @click="closeSheet">Done</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useWorkoutStore } from '~/stores/workout'
import { useLiftStore } from '~/stores/lift'
import type { AiPlannerImage, AiPlannerProfile, AiPlannerResponse } from '~/types/ai'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const workoutStore = useWorkoutStore()
const liftStore = useLiftStore()

const defaultProfile = (): AiPlannerProfile => ({
  age: 25,
  sex: 'male',
  heightCm: 170,
  weightKg: 70,
  goal: 'Improve conditioning and build lean muscle',
  experience: 'beginner',
  equipment: 'Basic gym access',
  injuries: 'None',
  daysPerWeek: 4,
})

const profile = reactive<AiPlannerProfile>(defaultProfile())
const uploads = ref<AiPlannerImage[]>([])
const photoPreviews = ref<Array<{ name: string; url: string }>>([])
const result = ref<AiPlannerResponse | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref('')
const saveMessage = ref('')
const cardioSaved = ref(false)
const liftSaved = ref(false)

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    cleanupPreviews()
  }
})

function closeSheet() {
  emit('close')
}

function cleanupPreviews() {
  for (const preview of photoPreviews.value) {
    URL.revokeObjectURL(preview.url)
  }
}

function resetPlanner() {
  cleanupPreviews()
  uploads.value = []
  photoPreviews.value = []
  result.value = null
  errorMessage.value = ''
  saveMessage.value = ''
  cardioSaved.value = false
  liftSaved.value = false
  Object.assign(profile, defaultProfile())
}

async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result.split(',')[1] : ''
      resolve(value)
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

async function resizeImage(file: File) {
  const sourceUrl = URL.createObjectURL(file)

  try {
    return await new Promise<File>((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        const maxDimension = 1400
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
        const width = Math.round(image.width * scale)
        const height = Math.round(image.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Canvas is unavailable in this browser.'))
          return
        }

        ctx.drawImage(image, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error(`Failed to compress ${file.name}`))
            return
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.86)
      }
      image.onerror = () => reject(new Error(`Failed to load ${file.name}`))
      image.src = sourceUrl
    })
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

async function handleFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).slice(0, 3)
  const preparedFiles = await Promise.all(files.map((file) => resizeImage(file)))

  cleanupPreviews()
  photoPreviews.value = preparedFiles.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  }))
  uploads.value = await Promise.all(preparedFiles.map(async (file) => ({
    mimeType: file.type || 'image/jpeg',
    data: await fileToBase64(file),
  })))
  errorMessage.value = ''
}

function validateForm() {
  if (uploads.value.length === 0) {
    return 'Upload at least one body photo.'
  }
  if (!profile.goal.trim()) {
    return 'Enter a training goal.'
  }
  if (!profile.equipment.trim()) {
    return 'Describe available equipment.'
  }
  if (!profile.injuries.trim()) {
    return 'State any injuries or enter None.'
  }
  return ''
}

async function generatePlans() {
  errorMessage.value = validateForm()
  saveMessage.value = ''

  if (errorMessage.value) {
    return
  }

  isSubmitting.value = true
  try {
    result.value = await $fetch<AiPlannerResponse>('/api/ai/generate-routines', {
      method: 'POST',
      body: {
        profile,
        images: uploads.value,
        context: {
          cardioHistory: workoutStore.history.slice(0, 5).map((session) => ({
            name: session.name,
            duration: session.duration,
            status: session.status,
            date: session.date,
          })),
          liftHistory: liftStore.history.slice(0, 5).map((session) => ({
            planName: session.planName,
            totalVolume: session.totalVolume,
            duration: session.duration,
            status: session.status,
            date: session.date,
          })),
        },
      },
    })
    cardioSaved.value = false
    liftSaved.value = false
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to generate plans.'
  } finally {
    isSubmitting.value = false
  }
}

function saveCardioPlan() {
  if (!result.value) return

  const cardioPlan = result.value.cardioPlan
  const planId = workoutStore.createPlan({
    name: cardioPlan.name,
    icon: cardioPlan.icon,
    description: cardioPlan.description,
    exercises: cardioPlan.exercises.map((exercise, index) => ({
      id: `ai_cardio_${Date.now()}_${index}`,
      name: exercise.name,
      duration: exercise.duration,
      sets: exercise.sets,
      color: exercise.color,
    })),
    restBetweenSets: cardioPlan.restBetweenSets,
    restBetweenExercises: cardioPlan.restBetweenExercises,
    warmupDuration: cardioPlan.warmupDuration,
    cooldownDuration: cardioPlan.cooldownDuration,
  })

  workoutStore.selectPlan(planId)
  cardioSaved.value = true
  saveMessage.value = 'Cardio plan saved to My Workout Plans.'
}

function saveLiftPlan() {
  if (!result.value) return

  const liftPlan = result.value.liftPlan
  const planId = liftStore.createPlan({
    name: liftPlan.name,
    icon: liftPlan.icon,
    description: liftPlan.description,
    restBetweenSets: liftPlan.restBetweenSets,
    exercises: liftPlan.exercises.map((exercise, exerciseIndex) => ({
      id: `ai_lift_${Date.now()}_${exerciseIndex}`,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight,
        completed: false,
      })),
    })),
  })

  liftStore.selectPlan(planId)
  liftSaved.value = true
  saveMessage.value = cardioSaved.value
    ? 'Cardio and lift plans saved.'
    : 'Lift plan saved to Select Routine.'
}

function saveBothPlans() {
  if (!cardioSaved.value) {
    saveCardioPlan()
  }
  if (!liftSaved.value) {
    saveLiftPlan()
  }
  saveMessage.value = 'Cardio and lift plans saved.'
}
</script>

<style scoped>
.planner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 25, 0.62);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 300;
}

.planner-sheet {
  width: 100%;
  max-width: 480px;
  max-height: 92vh;
  background: var(--bg-card);
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.planner-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.planner-header h3 {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.planner-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--accent-primary);
}

.planner-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
}

.planner-body {
  padding: 20px;
  overflow-y: auto;
}

.planner-form,
.result-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice-card,
.analysis-card,
.plan-card {
  padding: 16px;
  background: var(--bg-primary);
  border-radius: 18px;
  border: 1px solid var(--border-color);
}

.notice-title {
  margin: 0 0 6px;
  font-weight: 700;
  color: var(--text-primary);
}

.notice-text,
.plan-description,
.disclaimer-text {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.45;
  font-size: 13px;
}

.form-section,
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.span-2 {
  grid-column: span 2;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-help {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.field-input,
.file-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}

.textarea-input {
  resize: vertical;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.preview-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-card img {
  width: 100%;
  aspect-ratio: 1 / 1.2;
  object-fit: cover;
  border-radius: 14px;
}

.preview-card span {
  font-size: 11px;
  color: var(--text-secondary);
  word-break: break-word;
}

.primary-btn,
.secondary-btn,
.ghost-btn {
  padding: 12px 16px;
  border-radius: 999px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn {
  background: var(--accent-primary);
  color: white;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn {
  background: var(--bg-card);
  color: var(--accent-primary);
  border: 1.5px solid var(--accent-primary);
}

.ghost-btn {
  background: transparent;
  color: var(--text-secondary);
  border: 1.5px solid var(--border-color);
}

.error-text,
.save-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.error-text {
  color: #ff3b30;
}

.save-text {
  color: #34c759;
}

.analysis-head,
.plan-card-head,
.exercise-row,
.meta-row,
.result-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.analysis-head h4,
.plan-card-head h4 {
  margin: 4px 0 0;
  font-size: 17px;
  color: var(--text-primary);
}

.confidence-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--accent-glow);
  color: var(--accent-primary);
  text-transform: capitalize;
  font-size: 12px;
  font-weight: 700;
}

.chip-row,
.set-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.chip,
.set-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.flag-list {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--text-secondary);
}

.plan-icon {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 22px;
}

.meta-row {
  margin-top: 12px;
  flex-wrap: wrap;
  justify-content: flex-start;
  color: var(--text-tertiary);
  font-size: 12px;
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.exercise-row {
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
}

.exercise-stack {
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--bg-card);
}

@media (max-width: 420px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }

  .preview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analysis-head,
  .plan-card-head,
  .result-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .secondary-btn,
  .primary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
