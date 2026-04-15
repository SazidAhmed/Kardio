import { defineStore } from 'pinia'
import { useAudioFeedback } from '~/composables/useAudioFeedback'

// Audio feedback instance (created lazily to avoid SSR issues)
let audioFeedback: ReturnType<typeof useAudioFeedback> | null = null

function getAudioFeedback() {
  if (!audioFeedback && typeof window !== 'undefined') {
    audioFeedback = useAudioFeedback()
  }
  return audioFeedback
}

// === NEW: Dynamic Workout Plan Model ===
export interface WorkoutExercise {
  id: string
  name: string
  duration: number // in seconds
  color?: string // optional color for the exercise
}

export interface WorkoutPlan {
  id: string
  name: string
  icon: string
  description?: string
  exercises: WorkoutExercise[]
  rounds: number
  restBetweenRounds: number // in seconds, 0 = no rest
  warmupDuration: number // in seconds, 0 = no warmup
  cooldownDuration: number // in seconds, 0 = no cooldown
  createdAt: string
  updatedAt: string
}

// Legacy interface for backward compatibility with history
export interface WorkoutSession {
  id: string
  name: string
  date: string
  time: string
  rounds: number
  duration: string
  status: 'completed' | 'partial'
  note?: string
}

export type TimerPhase = 'idle' | 'warmup' | 'exercise' | 'rest' | 'cooldown' | 'finished'

const STORAGE_KEY = 'cardioflow-history'
const PLANS_STORAGE_KEY = 'cardioflow-plans'

// Store interval outside of Pinia state to avoid SSR serialization issues
let timerInterval: ReturnType<typeof setInterval> | null = null

// Default plans for new users
const defaultPlans: WorkoutPlan[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    icon: '🌱',
    description: 'Easy start for beginners',
    exercises: [
      { id: 'e1', name: 'Run', duration: 20, color: '#ff3b30' },
      { id: 'e2', name: 'Walk', duration: 40, color: '#34c759' },
    ],
    rounds: 8,
    restBetweenRounds: 0,
    warmupDuration: 30,
    cooldownDuration: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fatburn',
    name: 'Fat Burn',
    icon: '🔥',
    description: 'High intensity fat burning',
    exercises: [
      { id: 'e1', name: 'Run', duration: 30, color: '#ff3b30' },
      { id: 'e2', name: 'Walk', duration: 30, color: '#34c759' },
    ],
    rounds: 12,
    restBetweenRounds: 0,
    warmupDuration: 30,
    cooldownDuration: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hiitbeast',
    name: 'HIIT Beast',
    icon: '⚡',
    description: 'Maximum intensity training',
    exercises: [
      { id: 'e1', name: 'Run', duration: 40, color: '#ff3b30' },
      { id: 'e2', name: 'Walk', duration: 20, color: '#34c759' },
    ],
    rounds: 15,
    restBetweenRounds: 0,
    warmupDuration: 30,
    cooldownDuration: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const useWorkoutStore = defineStore('workout', {
  state: () => ({
    // === NEW: Dynamic Workout Plans ===
    plans: [] as WorkoutPlan[],
    selectedPlanId: '' as string,

    // Editing state for plan creation/editing
    editingPlan: null as WorkoutPlan | null,

    // Legacy: Keep for migration/compatibility
    favoritePresets: [] as string[],

    // Timer state - updated for dynamic model
    timerState: 'idle' as 'idle' | 'running' | 'paused' | 'finished',
    currentPhase: 'idle' as TimerPhase,
    currentRound: 1,
    currentExerciseIndex: 0,
    timeRemaining: 0,
    totalElapsed: 0,

    // History
    history: [] as WorkoutSession[],

    // Goals & Settings
    weeklyTargetMinutes: 150,

    // Personal Records
    personalRecords: {
      longestWorkoutMinutes: 0,
      mostRounds: 0,
      longestStreak: 0,
    },

    // Streak tracking
    lastWorkoutDate: null as string | null,

    // Workout notes for next session
    nextWorkoutNote: '' as string,
  }),

  getters: {
    // === NEW: Dynamic Plan Getters ===
    selectedPlan(state): WorkoutPlan | null {
      return state.plans.find(p => p.id === state.selectedPlanId) || state.plans[0] || null
    },

    allPlans(state): WorkoutPlan[] {
      return state.plans
    },

    // Calculate total workout duration for selected plan
    totalWorkoutSeconds(state): number {
      const plan = this.selectedPlan
      if (!plan) return 0

      const exercisesTime = plan.exercises.reduce((sum, ex) => sum + ex.duration, 0)
      const roundsTime = exercisesTime * plan.rounds
      const restTime = plan.restBetweenRounds > 0 ? plan.restBetweenRounds * (plan.rounds - 1) : 0
      return plan.warmupDuration + roundsTime + restTime + plan.cooldownDuration
    },

    // Get current exercise during workout
    currentExercise(state): WorkoutExercise | null {
      const plan = this.selectedPlan
      if (!plan || state.currentExerciseIndex >= plan.exercises.length) return null
      return plan.exercises[state.currentExerciseIndex]
    },

    // Check if user has any custom plans
    hasCustomPlans(state): boolean {
      return state.plans.some(p => !['beginner', 'fatburn', 'hiitbeast'].includes(p.id))
    },

    isFavorite(state) {
      return (planId: string) => state.favoritePresets.includes(planId)
    },

    favoritedPlans(state) {
      return state.plans.filter(p => state.favoritePresets.includes(p.id))
    },

    // Legacy compatibility - map old getters to new model
    nextPhase(state): TimerPhase {
      const plan = this.selectedPlan
      if (!plan) return 'idle'

      if (state.currentPhase === 'idle') return 'warmup'
      if (state.currentPhase === 'warmup') return 'exercise'
      if (state.currentPhase === 'exercise') {
        // Check if there are more exercises in this round
        if (state.currentExerciseIndex < plan.exercises.length - 1) {
          return 'exercise'
        }
        // Last exercise of round - check if rest or next round or cooldown
        if (state.currentRound < plan.rounds) {
          if (plan.restBetweenRounds > 0) return 'rest'
          return 'exercise'
        }
        return 'cooldown'
      }
      if (state.currentPhase === 'rest') return 'exercise'
      if (state.currentPhase === 'cooldown') return 'finished'
      return 'idle'
    },

    weekHistory(state): WorkoutSession[] {
      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return state.history.filter(s => new Date(s.date) >= weekAgo)
    },

    // Helper to get exercise color
    exerciseColor(): (exerciseName: string) => string {
      const colorMap: Record<string, string> = {
        'Run': '#ff3b30',
        'Walk': '#34c759',
        'Jog': '#ff9500',
        'Sprint': '#ff2d55',
        'Rest': '#af52de',
        'Push-ups': '#5856d6',
        'Squats': '#007aff',
        'Burpees': '#ff3b30',
        'Jumping Jacks': '#34c759',
        'Plank': '#5ac8fa',
        'Lunges': '#ff9500',
        'High Knees': '#ff2d55',
        'Mountain Climbers': '#5856d6',
      }
      return (exerciseName: string) => colorMap[exerciseName] || '#5856d6'
    },

    streak(state): number {
      // Simple streak: count consecutive days from today that have sessions
      if (state.history.length === 0) return 0
      const today = new Date().toDateString()
      const dates = [...new Set(state.history.map(s => new Date(s.date).toDateString()))]
      let streak = 0
      let checkDate = new Date()
      while (true) {
        if (dates.includes(checkDate.toDateString())) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
      return streak
    },

    totalMinutes(state): number {
      return Math.round(state.history.reduce((sum, s) => {
        const [min, sec] = s.duration.split(':').map(Number)
        return sum + min + sec / 60
      }, 0))
    },

    weekMinutes(state): number {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekSessions = state.history.filter(s => new Date(s.date) >= weekStart)
      return Math.round(weekSessions.reduce((sum, s) => {
        const [min, sec] = s.duration.split(':').map(Number)
        return sum + min + sec / 60
      }, 0))
    },

    weekProgressPercent(state): number {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekSessions = state.history.filter(s => new Date(s.date) >= weekStart)
      const minutes = weekSessions.reduce((sum, s) => {
        const [min, sec] = s.duration.split(':').map(Number)
        return sum + min + sec / 60
      }, 0)
      return Math.min(100, Math.round((minutes / state.weeklyTargetMinutes) * 100))
    },

    daysSinceLastWorkout(state): number {
      if (!state.lastWorkoutDate) return Infinity
      const last = new Date(state.lastWorkoutDate)
      const now = new Date()
      const diffMs = now.getTime() - last.getTime()
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    },

    hasStreakReminder(state): boolean {
      if (!state.lastWorkoutDate) return false
      const last = new Date(state.lastWorkoutDate)
      const now = new Date()
      const diffMs = now.getTime() - last.getTime()
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      return days >= 2
    },
  },

  actions: {
    // === NEW: Plan Management Actions ===

    // Create a new workout plan
    createPlan(planData: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>) {
      const newPlan: WorkoutPlan = {
        ...planData,
        id: 'plan_' + Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.plans.push(newPlan)
      this.savePlans()
      return newPlan.id
    },

    // Update an existing plan
    updatePlan(id: string, updates: Partial<Omit<WorkoutPlan, 'id' | 'createdAt'>>) {
      const plan = this.plans.find(p => p.id === id)
      if (plan) {
        Object.assign(plan, { ...updates, updatedAt: new Date().toISOString() })
        this.savePlans()
      }
    },

    // Delete a plan
    deletePlan(id: string) {
      const idx = this.plans.findIndex(p => p.id === id)
      if (idx !== -1) {
        this.plans.splice(idx, 1)
        // If we deleted the selected plan, select the first available
        if (this.selectedPlanId === id) {
          this.selectedPlanId = this.plans[0]?.id || ''
        }
        this.savePlans()
      }
    },

    // Select a plan for workout
    selectPlan(id: string) {
      this.selectedPlanId = id
      this.resetTimer()
    },

    // Set plan for editing
    setEditingPlan(plan: WorkoutPlan | null) {
      this.editingPlan = plan
    },

    // Save plans to localStorage
    savePlans() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(this.plans))
      }
    },

    // Load plans from localStorage
    loadPlans() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(PLANS_STORAGE_KEY)
        if (stored) {
          try {
            this.plans = JSON.parse(stored)
          } catch {
            this.plans = [...defaultPlans]
          }
        } else {
          // First time - use defaults
          this.plans = [...defaultPlans]
        }
        // Select first plan if none selected
        if (!this.selectedPlanId && this.plans.length > 0) {
          this.selectedPlanId = this.plans[0].id
        }
      } else {
        this.plans = [...defaultPlans]
      }
    },

    // Legacy: Keep for backward compatibility with existing calls
    selectPreset(id: string) {
      this.selectPlan(id)
    },

    // Legacy config update - updates the selected plan instead
    updateConfig(key: string, delta: number) {
      const plan = this.selectedPlan
      if (!plan) return

      const step = key === 'rounds' ? 1 : 5

      switch (key) {
        case 'rounds':
          plan.rounds = Math.max(1, plan.rounds + delta * step)
          break
        case 'warmup':
          plan.warmupDuration = Math.max(0, plan.warmupDuration + delta * step)
          break
        case 'cooldown':
          plan.cooldownDuration = Math.max(0, plan.cooldownDuration + delta * step)
          break
        case 'rest':
          plan.restBetweenRounds = Math.max(0, plan.restBetweenRounds + delta * step)
          break
      }
      this.savePlans()
    },

    startTimer() {
      const audio = getAudioFeedback()
      const plan = this.selectedPlan
      if (!plan) return

      if (this.timerState === 'idle') {
        this.currentRound = 1
        this.currentExerciseIndex = 0
        this.totalElapsed = 0

        if (plan.warmupDuration > 0) {
          this.currentPhase = 'warmup'
          this.timeRemaining = plan.warmupDuration
          audio?.playPhaseChange('warmup')
        } else {
          this.currentPhase = 'exercise'
          this.timeRemaining = plan.exercises[0]?.duration || 30
          audio?.playPhaseChange('exercise')
        }
      }
      this.timerState = 'running'
      timerInterval = setInterval(() => this.tick(), 1000)
    },

    // Legacy: setPreviewPhase replaced with direct timeRemaining updates
    setPreviewPhase(phase: TimerPhase) {
      // No-op for dynamic model - UI now handles this directly
      console.log('setPreviewPhase is deprecated in dynamic model')
    },

    pauseTimer() {
      this.timerState = 'paused'
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    },

    resetTimer() {
      const plan = this.selectedPlan
      this.timerState = 'idle'
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      this.currentPhase = 'idle'
      this.currentRound = 1
      this.currentExerciseIndex = 0
      this.timeRemaining = plan?.warmupDuration || 30
      this.totalElapsed = 0
    },

    tick() {
      const audio = getAudioFeedback()
      this.timeRemaining--
      this.totalElapsed++

      // Play countdown beeps for last 3 seconds
      if (this.timeRemaining > 0 && this.timeRemaining <= 3) {
        audio?.playCountdownBeep(this.timeRemaining)
      }

      if (this.timeRemaining <= 0) {
        this.advancePhase()
      }
    },

    advancePhase() {
      const audio = getAudioFeedback()
      const plan = this.selectedPlan
      if (!plan) return

      if (this.currentPhase === 'warmup') {
        // Warmup done - start first exercise
        this.currentExerciseIndex = 0
        this.currentPhase = 'exercise'
        const exercise = plan.exercises[0]
        this.timeRemaining = exercise?.duration || 30
        if (exercise) {
          audio?.speak(exercise.name)
          audio?.playPhaseStart()
        }
      } else if (this.currentPhase === 'exercise') {
        // Check if there are more exercises in this round
        if (this.currentExerciseIndex < plan.exercises.length - 1) {
          // Next exercise in same round
          this.currentExerciseIndex++
          const exercise = plan.exercises[this.currentExerciseIndex]
          this.timeRemaining = exercise.duration
          audio?.speak(exercise.name)
          audio?.playPhaseStart()
        } else {
          // Last exercise done - check if more rounds or cooldown
          if (this.currentRound < plan.rounds) {
            // More rounds to go
            if (plan.restBetweenRounds > 0) {
              this.currentPhase = 'rest'
              this.timeRemaining = plan.restBetweenRounds
              audio?.speak('Rest')
              audio?.playPhaseStart()
            } else {
              // No rest - start next round immediately
              this.currentRound++
              this.currentExerciseIndex = 0
              const exercise = plan.exercises[0]
              this.timeRemaining = exercise?.duration || 30
              if (exercise) {
                audio?.speak(`Round ${this.currentRound}, ${exercise.name}`)
                audio?.playPhaseStart()
              }
            }
          } else {
            // All rounds done - cooldown
            if (plan.cooldownDuration > 0) {
              this.currentPhase = 'cooldown'
              this.timeRemaining = plan.cooldownDuration
              audio?.playPhaseChange('cooldown')
            } else {
              this.finishWorkout(true)
            }
          }
        }
      } else if (this.currentPhase === 'rest') {
        // Rest done - start next round
        this.currentRound++
        this.currentExerciseIndex = 0
        this.currentPhase = 'exercise'
        const exercise = plan.exercises[0]
        this.timeRemaining = exercise?.duration || 30
        if (exercise) {
          audio?.speak(`Round ${this.currentRound}, ${exercise.name}`)
          audio?.playPhaseStart()
        }
      } else if (this.currentPhase === 'cooldown') {
        this.finishWorkout(true)
      }
    },

    finishWorkout(completed: boolean) {
      const audio = getAudioFeedback()
      const plan = this.selectedPlan

      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }

      // Announce workout completion
      if (completed) {
        audio?.playPhaseChange('cooldown', 0)
      }

      const elapsed = this.totalElapsed
      const min = Math.floor(elapsed / 60).toString().padStart(2, '0')
      const sec = (elapsed % 60).toString().padStart(2, '0')

      const now = new Date()
      const session: WorkoutSession = {
        id: Date.now().toString(),
        name: plan?.name || 'Workout',
        date: now.toISOString(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        rounds: this.currentRound,
        duration: `${min}:${sec}`,
        status: completed ? 'completed' : 'partial',
        note: this.nextWorkoutNote || undefined,
      }
      this.history.unshift(session)

      // Update last workout date
      this.lastWorkoutDate = now.toISOString()

      // Update personal records
      const elapsedMinutes = elapsed / 60
      if (elapsedMinutes > this.personalRecords.longestWorkoutMinutes) {
        this.personalRecords.longestWorkoutMinutes = Math.round(elapsedMinutes)
      }
      if (this.currentRound > this.personalRecords.mostRounds) {
        this.personalRecords.mostRounds = this.currentRound
      }

      // Update longest streak
      const currentStreak = this.streak
      if (currentStreak > this.personalRecords.longestStreak) {
        this.personalRecords.longestStreak = currentStreak
      }

      this.saveHistory()
      this.saveSettings()
      this.timerState = 'finished'
    },

    saveHistory() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history))
      }
    },

    loadHistory() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          try { this.history = JSON.parse(stored) } catch {}
        }
      }
    },

    deleteSession(id: string) {
      const idx = this.history.findIndex(s => s.id === id)
      if (idx !== -1) {
        this.history.splice(idx, 1)
        this.saveHistory()
      }
    },

    setWeeklyTarget(minutes: number) {
      this.weeklyTargetMinutes = Math.max(30, Math.min(600, minutes))
      this.saveSettings()
    },

    dismissStreakReminder() {
      // Reset last workout date to prevent repeated reminders in same session
      this.lastWorkoutDate = new Date().toISOString()
    },

    saveSettings() {
      if (typeof localStorage !== 'undefined') {
        const settings = {
          weeklyTargetMinutes: this.weeklyTargetMinutes,
          personalRecords: this.personalRecords,
          lastWorkoutDate: this.lastWorkoutDate,
          favoritePresets: this.favoritePresets,
          nextWorkoutNote: this.nextWorkoutNote,
        }
        localStorage.setItem('cardioflow-settings', JSON.stringify(settings))
      }
    },

    loadSettings() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('cardioflow-settings')
        if (stored) {
          try {
            const settings = JSON.parse(stored)
            this.weeklyTargetMinutes = settings.weeklyTargetMinutes ?? 150
            this.personalRecords = settings.personalRecords ?? { longestWorkoutMinutes: 0, mostRounds: 0, longestStreak: 0 }
            this.lastWorkoutDate = settings.lastWorkoutDate ?? null
            this.favoritePresets = settings.favoritePresets ?? []
            this.nextWorkoutNote = settings.nextWorkoutNote ?? ''
          } catch {}
        }
      }
    },

    toggleFavorite(presetId: string) {
      const idx = this.favoritePresets.indexOf(presetId)
      if (idx === -1) {
        this.favoritePresets.push(presetId)
      } else {
        this.favoritePresets.splice(idx, 1)
      }
      this.saveSettings()
    },

    setWorkoutNote(note: string) {
      this.nextWorkoutNote = note
    },

    clearWorkoutNote() {
      this.nextWorkoutNote = ''
    },
  },
})
