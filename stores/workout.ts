import { defineStore } from 'pinia'

// Audio feedback instance (created lazily to avoid SSR issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let audioFeedback: any = null

function getAudioFeedback() {
  if (!audioFeedback && typeof window !== 'undefined') {
    // useAudioFeedback is auto-imported by Nuxt from composables/
    // @ts-expect-error - Nuxt auto-import
    audioFeedback = useAudioFeedback()
  }
  return audioFeedback
}

// === NEW: Dynamic Workout Plan Model ===
export interface WorkoutExercise {
  id: string
  name: string
  duration: number // in seconds
  sets: number // Number of sets for this exercise
  color?: string // optional color for the exercise
}

export interface WorkoutPlan {
  id: string
  name: string
  icon: string
  description?: string
  exercises: WorkoutExercise[]
  restBetweenSets: number // Rest between sets of same exercise (seconds)
  restBetweenExercises: number // Rest between different exercises (seconds)
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

// Achievement system
export interface Achievement {
  id: string
  name: string
  icon: string
  description: string
  unlocked: boolean
  unlockedAt?: string
}

export type TimerPhase = 'idle' | 'warmup' | 'exercise' | 'rest' | 'cooldown' | 'finished'

const STORAGE_KEY = 'fitz-history'
const PLANS_STORAGE_KEY = 'fitz-plans'
const ACHIEVEMENTS_STORAGE_KEY = 'fitz-achievements'

// Store interval outside of Pinia state to avoid SSR serialization issues
let timerInterval: ReturnType<typeof setInterval> | null = null

// Achievement definitions
const achievementDefinitions: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  {
    id: 'first_step',
    name: 'First Step',
    icon: '🏃',
    description: 'Complete your first workout',
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    icon: '🔥',
    description: '3-day streak',
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    icon: '💎',
    description: '7-day streak',
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    icon: '⚡',
    description: '14-day streak',
  },
  {
    id: 'workout_warrior',
    name: 'Workout Warrior',
    icon: '🏋️',
    description: '10 total workouts',
  },
  {
    id: 'century_club',
    name: 'Century Club',
    icon: '⏱️',
    description: '100 total minutes',
  },
  {
    id: 'goal_crusher',
    name: 'Goal Crusher',
    icon: '🎯',
    description: 'Hit weekly target 4 times',
  },
  {
    id: 'beast_mode',
    name: 'Beast Mode',
    icon: '💪',
    description: 'Complete a workout with 5+ rounds',
  },
]

// No preset plans — users start from scratch
const defaultPlans: WorkoutPlan[] = []

export const useWorkoutStore = defineStore('workout', {
  state: () => ({
    // === NEW: Dynamic Workout Plans ===
    plans: [] as WorkoutPlan[],
    selectedPlanId: '' as string,

    // Editing state for plan creation/editing
    editingPlan: null as WorkoutPlan | null,

    // Legacy: Keep for migration/compatibility
    favoritePresets: [] as string[],

    // Timer state - updated for set-based model
    timerState: 'idle' as 'idle' | 'running' | 'paused' | 'finished',
    currentPhase: 'idle' as TimerPhase,
    currentExerciseIndex: 0, // Which exercise we're on
    currentSet: 1, // Which set of the current exercise (1 to rounds)
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

    // Achievements
    achievements: [] as Achievement[],
  }),

  getters: {
    // === NEW: Dynamic Plan Getters ===
    selectedPlan(state): WorkoutPlan | null {
      return state.plans.find(p => p.id === state.selectedPlanId) || state.plans[0] || null
    },

    allPlans(state): WorkoutPlan[] {
      return state.plans
    },

    // Calculate total workout duration for selected plan (per-exercise sets)
    totalWorkoutSeconds(state): number {
      const plan = this.selectedPlan
      if (!plan) return 0

      // For each exercise: (exercise duration + rest between sets) * sets - last rest
      const perExerciseTime = plan.exercises.reduce((total, ex) => {
        const exerciseTime = ex.duration * ex.sets
        const restTime = plan.restBetweenSets > 0
          ? plan.restBetweenSets * (ex.sets - 1)
          : 0
        return total + exerciseTime + restTime
      }, 0)

      // Rest between exercises
      const restBetweenExercises = plan.restBetweenExercises > 0 && plan.exercises.length > 1
        ? plan.restBetweenExercises * (plan.exercises.length - 1)
        : 0

      return plan.warmupDuration + perExerciseTime + restBetweenExercises + plan.cooldownDuration
    },

    // Get current exercise during workout
    currentExercise(state): WorkoutExercise | null {
      const plan = this.selectedPlan
      if (!plan || state.currentExerciseIndex >= plan.exercises.length) return null
      return plan.exercises[state.currentExerciseIndex]
    },

    isFavorite(state) {
      return (planId: string) => state.favoritePresets.includes(planId)
    },

    favoritedPlans(state) {
      return state.plans.filter(p => state.favoritePresets.includes(p.id))
    },

    // Per-exercise sets flow: Exercise -> Rest (between sets) -> Exercise -> Rest (between exercises) -> Next Exercise
    nextPhase(state): TimerPhase {
      const plan = this.selectedPlan
      if (!plan) return 'idle'

      const exercise = plan.exercises[state.currentExerciseIndex]
      const totalSets = exercise?.sets ?? 1

      if (state.currentPhase === 'idle') return 'warmup'
      if (state.currentPhase === 'warmup') return 'exercise'
      if (state.currentPhase === 'exercise') {
        // Check if we have more sets of this exercise
        if (state.currentSet < totalSets) {
          // More sets to go - rest between sets
          if (plan.restBetweenSets > 0) return 'rest'
          return 'exercise'
        }
        // All sets of this exercise done
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

    // Get daily minutes for the last 7 days (for weekly chart)
    dailyMinutesLast7Days(state): number[] {
      const days: number[] = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toDateString()
        const daySessions = state.history.filter(s => new Date(s.date).toDateString() === dateStr)
        const totalMinutes = daySessions.reduce((sum, s) => {
          const [min, sec] = s.duration.split(':').map(Number)
          return sum + min + sec / 60
        }, 0)
        days.push(Math.round(totalMinutes))
      }
      return days
    },

    // Get daily minutes for the last 30 days (for monthly chart)
    dailyMinutesLast30Days(state): number[] {
      const days: number[] = []
      const now = new Date()
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toDateString()
        const daySessions = state.history.filter(s => new Date(s.date).toDateString() === dateStr)
        const totalMinutes = daySessions.reduce((sum, s) => {
          const [min, sec] = s.duration.split(':').map(Number)
          return sum + min + sec / 60
        }, 0)
        days.push(Math.round(totalMinutes))
      }
      return days
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

    // Duplicate a plan
    duplicatePlan(id: string) {
      const plan = this.plans.find(p => p.id === id)
      if (!plan) return null

      const newPlan: WorkoutPlan = {
        ...JSON.parse(JSON.stringify(plan)),
        id: Date.now().toString(),
        name: `${plan.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.plans.push(newPlan)
      this.savePlans()
      return newPlan.id
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
            this.plans = []
          }
        } else {
          this.plans = []
        }
        if (!this.selectedPlanId && this.plans.length > 0) {
          this.selectedPlanId = this.plans[0].id
        }
      } else {
        this.plans = []
      }
    },

    // Save achievements to localStorage
    saveAchievements() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(this.achievements))
      }
    },

    // Load achievements from localStorage
    loadAchievements() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY)
        if (stored) {
          try {
            this.achievements = JSON.parse(stored)
          } catch {
            this.achievements = achievementDefinitions.map(def => ({
              ...def,
              unlocked: false,
            }))
          }
        } else {
          // First time - initialize with all locked
          this.achievements = achievementDefinitions.map(def => ({
            ...def,
            unlocked: false,
          }))
        }
      } else {
        this.achievements = achievementDefinitions.map(def => ({
          ...def,
          unlocked: false,
        }))
      }
    },

    // Check and unlock achievements
    checkAchievements(): string[] {
      const newlyUnlocked: string[] = []

      // First Step - first workout completed
      if (this.history.length >= 1) {
        const firstStep = this.achievements.find(a => a.id === 'first_step')
        if (firstStep && !firstStep.unlocked) {
          firstStep.unlocked = true
          firstStep.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(firstStep.name)
        }
      }

      // On Fire - 3-day streak
      if (this.streak >= 3) {
        const onFire = this.achievements.find(a => a.id === 'on_fire')
        if (onFire && !onFire.unlocked) {
          onFire.unlocked = true
          onFire.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(onFire.name)
        }
      }

      // Dedicated - 7-day streak
      if (this.streak >= 7) {
        const dedicated = this.achievements.find(a => a.id === 'dedicated')
        if (dedicated && !dedicated.unlocked) {
          dedicated.unlocked = true
          dedicated.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(dedicated.name)
        }
      }

      // Unstoppable - 14-day streak
      if (this.streak >= 14) {
        const unstoppable = this.achievements.find(a => a.id === 'unstoppable')
        if (unstoppable && !unstoppable.unlocked) {
          unstoppable.unlocked = true
          unstoppable.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(unstoppable.name)
        }
      }

      // Workout Warrior - 10 total workouts
      if (this.history.length >= 10) {
        const warrior = this.achievements.find(a => a.id === 'workout_warrior')
        if (warrior && !warrior.unlocked) {
          warrior.unlocked = true
          warrior.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(warrior.name)
        }
      }

      // Century Club - 100 total minutes
      if (this.totalMinutes >= 100) {
        const century = this.achievements.find(a => a.id === 'century_club')
        if (century && !century.unlocked) {
          century.unlocked = true
          century.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(century.name)
        }
      }

      // Beast Mode - workout with 5+ rounds
      const latestWorkout = this.history[0]
      if (latestWorkout && latestWorkout.rounds >= 5) {
        const beast = this.achievements.find(a => a.id === 'beast_mode')
        if (beast && !beast.unlocked) {
          beast.unlocked = true
          beast.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(beast.name)
        }
      }

      if (newlyUnlocked.length > 0) {
        this.saveAchievements()
      }

      return newlyUnlocked
    },

    // Legacy: Keep for backward compatibility with existing calls
    selectPreset(id: string) {
      this.selectPlan(id)
    },

    // Legacy config update - updates the selected plan instead
    updateExerciseConfig(exerciseIndex: number, key: string, delta: number) {
      const plan = this.selectedPlan
      if (!plan || exerciseIndex >= plan.exercises.length) return

      const step = key === 'sets' ? 1 : 5
      const exercise = plan.exercises[exerciseIndex]

      switch (key) {
        case 'sets':
          exercise.sets = Math.max(1, exercise.sets + delta * step)
          break
        case 'duration':
          exercise.duration = Math.max(5, exercise.duration + delta * step)
          break
      }
      this.savePlans()
    },

    updateConfig(key: string, delta: number) {
      const plan = this.selectedPlan
      if (!plan) return

      const step = 5

      switch (key) {
        case 'warmup':
          plan.warmupDuration = Math.max(0, plan.warmupDuration + delta * step)
          break
        case 'cooldown':
          plan.cooldownDuration = Math.max(0, plan.cooldownDuration + delta * step)
          break
        case 'rest':
          plan.restBetweenSets = Math.max(0, plan.restBetweenSets + delta * step)
          break
      }
      this.savePlans()
    },

    async startTimer() {
      const audio = getAudioFeedback()
      const plan = this.selectedPlan
      if (!plan) return

      if (this.timerState === 'idle') {
        this.currentSet = 1
        this.currentExerciseIndex = 0
        this.totalElapsed = 0

        if (plan.warmupDuration > 0) {
          this.currentPhase = 'warmup'
          this.timeRemaining = plan.warmupDuration
          await audio?.playPhaseChange('warmup')
        } else {
          this.currentPhase = 'exercise'
          this.timeRemaining = plan.exercises[0]?.duration || 30
          await audio?.playPhaseChange('exercise')
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
      this.currentSet = 1
      this.currentExerciseIndex = 0
      this.timeRemaining = plan?.warmupDuration || 30
      this.totalElapsed = 0
    },

    async tick() {
      const audio = getAudioFeedback()
      this.timeRemaining--
      this.totalElapsed++

      // Play countdown beeps for last 3 seconds
      if (this.timeRemaining > 0 && this.timeRemaining <= 3) {
        await audio?.playCountdownBeep(this.timeRemaining)
      }

      if (this.timeRemaining <= 0) {
        await this.advancePhase()
      }
    },

    async advancePhase() {
      const audio = getAudioFeedback()
      const plan = this.selectedPlan
      if (!plan) return

      if (this.currentPhase === 'warmup') {
        // Warmup done - start first exercise, set 1
        this.currentExerciseIndex = 0
        this.currentSet = 1
        this.currentPhase = 'exercise'
        const exercise = plan.exercises[0]
        this.timeRemaining = exercise?.duration || 30
        if (exercise) {
          audio?.speak(`${exercise.name}, set ${this.currentSet}`)
          await audio?.playPhaseStart()
        }
      } else if (this.currentPhase === 'exercise') {
        const currentExercise = plan.exercises[this.currentExerciseIndex]

        // Check if we have more sets of this exercise
        if (this.currentSet < currentExercise.sets) {
          // More sets to go - rest between sets
          if (plan.restBetweenSets > 0) {
            this.currentPhase = 'rest'
            this.timeRemaining = plan.restBetweenSets
            audio?.speak('Rest')
            await audio?.playPhaseStart()
          } else {
            // No rest - start next set immediately
            this.currentSet++
            this.timeRemaining = currentExercise?.duration || 30
            if (currentExercise) {
              audio?.speak(`${currentExercise.name}, set ${this.currentSet}`)
              await audio?.playPhaseStart()
            }
          }
        } else {
          // All sets of this exercise done - move to next exercise
          if (this.currentExerciseIndex < plan.exercises.length - 1) {
            // More exercises to go
            if (plan.restBetweenExercises > 0) {
              this.currentPhase = 'rest'
              this.timeRemaining = plan.restBetweenExercises
              audio?.speak('Rest')
              await audio?.playPhaseStart()
            } else {
              // No rest - start next exercise immediately
              this.currentExerciseIndex++
              this.currentSet = 1
              const nextExercise = plan.exercises[this.currentExerciseIndex]
              this.timeRemaining = nextExercise?.duration || 30
              if (nextExercise) {
                audio?.speak(`${nextExercise.name}, set ${this.currentSet}`)
                await audio?.playPhaseStart()
              }
            }
          } else {
            // All exercises done - cooldown
            if (plan.cooldownDuration > 0) {
              this.currentPhase = 'cooldown'
              this.timeRemaining = plan.cooldownDuration
              await audio?.playPhaseChange('cooldown')
            } else {
              this.finishWorkout(true)
            }
          }
        }
      } else if (this.currentPhase === 'rest') {
        const currentExercise = plan.exercises[this.currentExerciseIndex]

        // Determine if this rest was between sets or between exercises
        if (this.currentSet < currentExercise.sets) {
          // Rest between sets - continue with next set of same exercise
          this.currentSet++
          this.currentPhase = 'exercise'
          this.timeRemaining = currentExercise?.duration || 30
          if (currentExercise) {
            audio?.speak(`${currentExercise.name}, set ${this.currentSet}`)
            await audio?.playPhaseStart()
          }
        } else {
          // Rest between exercises - move to next exercise
          this.currentExerciseIndex++
          this.currentSet = 1
          this.currentPhase = 'exercise'
          const nextExercise = plan.exercises[this.currentExerciseIndex]
          this.timeRemaining = nextExercise?.duration || 30
          if (nextExercise) {
            audio?.speak(`${nextExercise.name}, set ${this.currentSet}`)
            await audio?.playPhaseStart()
          }
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
        rounds: this.currentSet,
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
      if (this.currentSet > this.personalRecords.mostRounds) {
        this.personalRecords.mostRounds = this.currentSet
      }

      // Update longest streak
      const currentStreak = this.streak
      if (currentStreak > this.personalRecords.longestStreak) {
        this.personalRecords.longestStreak = currentStreak
      }

      this.saveHistory()
      this.saveSettings()

      // Check for new achievements
      const newlyUnlocked = this.checkAchievements()

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
