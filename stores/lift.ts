import { defineStore } from 'pinia'

// Audio feedback instance (created lazily to avoid SSR issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let audioFeedback: any = null

function getAudioFeedback() {
  if (!audioFeedback && typeof window !== 'undefined') {
    // @ts-expect-error - Nuxt auto-import
    audioFeedback = useAudioFeedback()
  }
  return audioFeedback
}

const LIFT_PLANS_KEY = 'fitz-lift-plans'
const LIFT_HISTORY_KEY = 'fitz-lift-history'
const LIFT_SETTINGS_KEY = 'fitz-lift-settings'
const LIFT_ACHIEVEMENTS_KEY = 'fitz-lift-achievements'

export interface LiftSet {
  reps: number
  weight: number
  completed: boolean
}

export interface LiftExercise {
  id: string
  name: string
  sets: LiftSet[]
}

export interface LiftPlan {
  id: string
  name: string
  icon: string
  description?: string
  exercises: LiftExercise[]
  restBetweenSets: number // seconds
  createdAt: string
  updatedAt: string
}

export interface LiftSession {
  id: string
  planId: string
  planName: string
  date: string
  time: string
  exercises: LiftExercise[]
  totalVolume: number // total weight × reps completed
  duration: string
  status: 'completed' | 'partial'
}

export interface LiftAchievement {
  id: string
  name: string
  icon: string
  description: string
  unlocked: boolean
  unlockedAt?: string
}

const liftAchievementDefinitions: Omit<LiftAchievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_lift', name: 'First Lift', icon: '🏋️', description: 'Complete your first lifting session' },
  { id: 'on_fire', name: 'On Fire', icon: '🔥', description: '3-day streak' },
  { id: 'dedicated', name: 'Dedicated', icon: '💪', description: '7-day streak' },
  { id: 'iron_addict', name: 'Iron Addict', icon: '🏗️', description: '14-day streak' },
  { id: 'volume_king', name: 'Volume King', icon: '👑', description: '10,000kg total volume' },
  { id: 'set_machine', name: 'Set Machine', icon: '⚙️', description: '100 total sets' },
  { id: 'heavy_hitter', name: 'Heavy Hitter', icon: '🏆', description: '500kg+ in a single session' },
  { id: 'century_sets', name: 'Century Sets', icon: '💯', description: '10 workouts completed' },
]

// No preset plans — users start from scratch
const defaultLiftPlans: LiftPlan[] = []

export const useLiftStore = defineStore('lift', {
  state: () => ({
    // Plans
    plans: [] as LiftPlan[],
    selectedPlanId: '' as string,

    // Active workout state
    workoutState: 'idle' as 'idle' | 'active' | 'resting' | 'finished',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    activeExercises: [] as LiftExercise[], // deep copy of plan exercises for the active session
    sessionStartTime: '' as string,

    // Rest timer
    restTimeRemaining: 0,
    restTimerInterval: null as ReturnType<typeof setInterval> | null,

    // Workout elapsed time
    elapsedSeconds: 0,
    elapsedInterval: null as ReturnType<typeof setInterval> | null,

    // History
    history: [] as LiftSession[],

    // Goals & Settings
    weeklyTargetSets: 20,

    // Personal Records
    personalRecords: {
      maxVolume: 0,
      maxSets: 0,
      longestWorkout: '0:00',
      longestStreak: 0,
    },

    // Streak tracking
    lastWorkoutDate: null as string | null,

    // Achievements
    achievements: [] as LiftAchievement[],
  }),

  getters: {
    selectedPlan(state): LiftPlan | null {
      return state.plans.find(p => p.id === state.selectedPlanId) || state.plans[0] || null
    },

    currentExercise(state): LiftExercise | null {
      if (state.currentExerciseIndex >= state.activeExercises.length) return null
      return state.activeExercises[state.currentExerciseIndex]
    },

    currentSet(state): LiftSet | null {
      const exercise = this.currentExercise
      if (!exercise || state.currentSetIndex >= exercise.sets.length) return null
      return exercise.sets[state.currentSetIndex]
    },

    totalSetsCompleted(state): number {
      return state.activeExercises.reduce(
        (total, ex) => total + ex.sets.filter(s => s.completed).length,
        0
      )
    },

    totalSets(state): number {
      return state.activeExercises.reduce(
        (total, ex) => total + ex.sets.length,
        0
      )
    },

    totalVolume(state): number {
      return state.activeExercises.reduce(
        (total, ex) => total + ex.sets.reduce(
          (setTotal, s) => s.completed ? setTotal + s.reps * s.weight : setTotal,
          0
        ),
        0
      )
    },

    isLastSet(state): boolean {
      const exercise = this.currentExercise
      if (!exercise) return false
      return state.currentSetIndex >= exercise.sets.length - 1
    },

    isLastExercise(state): boolean {
      return state.currentExerciseIndex >= state.activeExercises.length - 1
    },

    workoutProgress(state): number {
      const total = this.totalSets
      if (total === 0) return 0
      return Math.round((this.totalSetsCompleted / total) * 100)
    },

    formatElapsed(state): string {
      const m = Math.floor(state.elapsedSeconds / 60).toString().padStart(2, '0')
      const sec = (state.elapsedSeconds % 60).toString().padStart(2, '0')
      return `${m}:${sec}`
    },

    // === History-based Getters ===

    streak(state): number {
      if (state.history.length === 0) return 0
      const dates = [...new Set(state.history.map(s => {
        try { return new Date(s.date).toDateString() } catch { return s.date }
      }))]
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

    weekSets(state): number {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekSessions = state.history.filter(s => {
        try { return new Date(s.date) >= weekStart } catch { return false }
      })
      return weekSessions.reduce((sum, s) =>
        sum + s.exercises.reduce((exSum, ex) => exSum + ex.sets.length, 0), 0
      )
    },

    weekProgressPercent(state): number {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekSessions = state.history.filter(s => {
        try { return new Date(s.date) >= weekStart } catch { return false }
      })
      const sets = weekSessions.reduce((sum, s) =>
        sum + s.exercises.reduce((exSum, ex) => exSum + ex.sets.length, 0), 0
      )
      return Math.min(100, Math.round((sets / state.weeklyTargetSets) * 100))
    },

    daysSinceLastWorkout(state): number {
      if (!state.lastWorkoutDate) return Infinity
      const last = new Date(state.lastWorkoutDate)
      const now = new Date()
      return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    },

    hasStreakReminder(state): boolean {
      return state.history.length > 0 && this.daysSinceLastWorkout > 3
    },

    dailyVolumeLast7Days(state): number[] {
      const days: number[] = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toDateString()
        const daySessions = state.history.filter(s => {
          try { return new Date(s.date).toDateString() === dateStr } catch { return false }
        })
        const volume = daySessions.reduce((sum, s) => sum + s.totalVolume, 0)
        days.push(Math.round(volume))
      }
      return days
    },

    dailyVolumeLast30Days(state): number[] {
      const days: number[] = []
      const now = new Date()
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toDateString()
        const daySessions = state.history.filter(s => {
          try { return new Date(s.date).toDateString() === dateStr } catch { return false }
        })
        const volume = daySessions.reduce((sum, s) => sum + s.totalVolume, 0)
        days.push(Math.round(volume))
      }
      return days
    },
  },

  actions: {
    // === Plan Management ===

    createPlan(planData: Omit<LiftPlan, 'id' | 'createdAt' | 'updatedAt'>) {
      const newPlan: LiftPlan = {
        ...planData,
        id: 'lift_' + Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.plans.push(newPlan)
      this.savePlans()
      return newPlan.id
    },

    updatePlan(id: string, updates: Partial<Omit<LiftPlan, 'id' | 'createdAt'>>) {
      const plan = this.plans.find(p => p.id === id)
      if (plan) {
        Object.assign(plan, { ...updates, updatedAt: new Date().toISOString() })
        this.savePlans()
      }
    },

    deletePlan(id: string) {
      const idx = this.plans.findIndex(p => p.id === id)
      if (idx !== -1) {
        this.plans.splice(idx, 1)
        if (this.selectedPlanId === id) {
          this.selectedPlanId = this.plans[0]?.id || ''
        }
        this.savePlans()
      }
    },

    selectPlan(id: string) {
      this.selectedPlanId = id
    },

    savePlans() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LIFT_PLANS_KEY, JSON.stringify(this.plans))
      }
    },

    loadPlans() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LIFT_PLANS_KEY)
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
      }
    },

    // === Active Workout ===

    startWorkout() {
      const plan = this.selectedPlan
      if (!plan) return

      // Deep copy exercises for the active session
      this.activeExercises = plan.exercises.map(ex => ({
        ...ex,
        id: ex.id,
        sets: ex.sets.map(s => ({ ...s, completed: false })),
      }))
      this.currentExerciseIndex = 0
      this.currentSetIndex = 0
      this.workoutState = 'active'
      this.sessionStartTime = new Date().toISOString()
      this.elapsedSeconds = 0
      this.startElapsedTimer()
    },

    completeSet() {
      const exercise = this.currentExercise
      const set = this.currentSet
      if (!exercise || !set) return

      // Mark current set as completed
      set.completed = true

      // Check if we need rest or move to next
      if (this.isLastSet) {
        // Last set of this exercise
        if (this.isLastExercise) {
          // Workout complete
          this.finishWorkout(true)
        } else {
          // Move to next exercise after rest
          this.startRest()
        }
      } else {
        // More sets in this exercise, rest first
        this.startRest()
      }
    },

    startRest() {
      const plan = this.selectedPlan
      if (!plan || plan.restBetweenSets <= 0) {
        this.advanceToNext()
        return
      }

      this.workoutState = 'resting'
      this.restTimeRemaining = plan.restBetweenSets

      // Announce rest
      const audio = getAudioFeedback()
      if (audio) {
        audio.playBeep(800, 0.2)
      }

      if (this.restTimerInterval) clearInterval(this.restTimerInterval)
      this.restTimerInterval = setInterval(() => {
        if (this.restTimeRemaining <= 1) {
          this.endRest()
        } else {
          this.restTimeRemaining--

          // Countdown beeps for last 3 seconds
          if (this.restTimeRemaining <= 3) {
            const audio = getAudioFeedback()
            if (audio) {
              audio.playBeep(1000 - (3 - this.restTimeRemaining) * 200, 0.15)
            }
          }
        }
      }, 1000)
    },

    endRest() {
      if (this.restTimerInterval) {
        clearInterval(this.restTimerInterval)
        this.restTimerInterval = null
      }
      this.restTimeRemaining = 0
      this.advanceToNext()
    },

    skipRest() {
      this.endRest()
    },

    addRestTime(seconds: number) {
      this.restTimeRemaining += seconds
    },

    advanceToNext() {
      const exercise = this.currentExercise
      if (!exercise) return

      if (this.isLastSet) {
        // Move to next exercise
        this.currentExerciseIndex++
        this.currentSetIndex = 0

        // Announce next exercise
        const nextExercise = this.currentExercise
        if (nextExercise) {
          const audio = getAudioFeedback()
          if (audio) {
            audio.speak(`${nextExercise.name} set 1`)
          }
        }
      } else {
        // Move to next set of same exercise
        this.currentSetIndex++

        // Announce next set
        const audio = getAudioFeedback()
        if (audio) {
          audio.speak(`${exercise.name} set ${this.currentSetIndex + 1}`)
        }
      }

      this.workoutState = 'active'
    },

    finishWorkout(completed: boolean) {
      this.workoutState = 'finished'
      this.stopElapsedTimer()

      if (this.restTimerInterval) {
        clearInterval(this.restTimerInterval)
        this.restTimerInterval = null
      }

      // Save to history
      const session: LiftSession = {
        id: 'ls_' + Date.now().toString(),
        planId: this.selectedPlan?.id || '',
        planName: this.selectedPlan?.name || 'Workout',
        date: new Date().toDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        exercises: JSON.parse(JSON.stringify(this.activeExercises)),
        totalVolume: this.totalVolume,
        duration: this.formatElapsed,
        status: completed ? 'completed' : 'partial',
      }
      this.history.unshift(session)

      // Update last workout date
      this.lastWorkoutDate = new Date().toISOString()

      // Update personal records
      if (session.totalVolume > this.personalRecords.maxVolume) {
        this.personalRecords.maxVolume = session.totalVolume
      }
      const sessionSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
      if (sessionSets > this.personalRecords.maxSets) {
        this.personalRecords.maxSets = sessionSets
      }
      const duration = session.duration || '0:00'
      const [m, sec] = duration.split(':').map(Number)
      const totalSec = (m || 0) * 60 + (sec || 0)
      const [maxM, maxSec] = this.personalRecords.longestWorkout.split(':').map(Number)
      const maxTotalSec = (maxM || 0) * 60 + (maxSec || 0)
      if (totalSec > maxTotalSec) {
        this.personalRecords.longestWorkout = duration
      }
      const currentStreak = this.streak
      if (currentStreak > this.personalRecords.longestStreak) {
        this.personalRecords.longestStreak = currentStreak
      }

      this.saveHistory()
      this.saveSettings()

      // Check for new achievements
      this.checkAchievements()

      // Announce completion
      if (completed) {
        const audio = getAudioFeedback()
        if (audio) {
          audio.speak('Workout complete! Great job!')
        }
      }
    },

    resetWorkout() {
      this.workoutState = 'idle'
      this.currentExerciseIndex = 0
      this.currentSetIndex = 0
      this.activeExercises = []
      this.restTimeRemaining = 0
      this.elapsedSeconds = 0
      this.stopElapsedTimer()
      if (this.restTimerInterval) {
        clearInterval(this.restTimerInterval)
        this.restTimerInterval = null
      }
    },

    // Update set weight/reps in active workout
    updateCurrentSet(field: 'weight' | 'reps', delta: number) {
      const set = this.currentSet
      if (!set) return
      if (field === 'weight') {
        set.weight = Math.max(0, set.weight + delta)
      } else {
        set.reps = Math.max(1, set.reps + delta)
      }
    },

    // === Elapsed Timer ===

    startElapsedTimer() {
      if (this.elapsedInterval) clearInterval(this.elapsedInterval)
      this.elapsedInterval = setInterval(() => {
        this.elapsedSeconds++
      }, 1000)
    },

    stopElapsedTimer() {
      if (this.elapsedInterval) {
        clearInterval(this.elapsedInterval)
        this.elapsedInterval = null
      }
    },

    // === History ===

    saveHistory() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LIFT_HISTORY_KEY, JSON.stringify(this.history))
      }
    },

    loadHistory() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LIFT_HISTORY_KEY)
        if (stored) {
          try {
            this.history = JSON.parse(stored)
          } catch {
            this.history = []
          }
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

    // === Settings ===

    setWeeklyTarget(sets: number) {
      this.weeklyTargetSets = Math.max(5, Math.min(200, sets))
      this.saveSettings()
    },

    dismissStreakReminder() {
      this.lastWorkoutDate = new Date().toISOString()
    },

    saveSettings() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LIFT_SETTINGS_KEY, JSON.stringify({
          weeklyTargetSets: this.weeklyTargetSets,
          personalRecords: this.personalRecords,
          lastWorkoutDate: this.lastWorkoutDate,
        }))
      }
    },

    loadSettings() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LIFT_SETTINGS_KEY)
        if (stored) {
          try {
            const settings = JSON.parse(stored)
            if (settings.weeklyTargetSets) this.weeklyTargetSets = settings.weeklyTargetSets
            if (settings.personalRecords) this.personalRecords = settings.personalRecords
            if (settings.lastWorkoutDate) this.lastWorkoutDate = settings.lastWorkoutDate
          } catch {}
        }
      }
    },

    // === Achievements ===

    loadAchievements() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LIFT_ACHIEVEMENTS_KEY)
        if (stored) {
          try {
            this.achievements = JSON.parse(stored)
          } catch {
            this.achievements = liftAchievementDefinitions.map(def => ({
              ...def,
              unlocked: false,
            }))
          }
        } else {
          this.achievements = liftAchievementDefinitions.map(def => ({
            ...def,
            unlocked: false,
          }))
        }
      }
    },

    saveAchievements() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LIFT_ACHIEVEMENTS_KEY, JSON.stringify(this.achievements))
      }
    },

    checkAchievements(): string[] {
      const newlyUnlocked: string[] = []

      // First Lift - first workout
      if (this.history.length >= 1) {
        const a = this.achievements.find(a => a.id === 'first_lift')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      // On Fire - 3-day streak
      if (this.streak >= 3) {
        const a = this.achievements.find(a => a.id === 'on_fire')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      // Dedicated - 7-day streak
      if (this.streak >= 7) {
        const a = this.achievements.find(a => a.id === 'dedicated')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      // Iron Addict - 14-day streak
      if (this.streak >= 14) {
        const a = this.achievements.find(a => a.id === 'iron_addict')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      // Volume King - 10,000kg total volume
      const totalVol = this.history.reduce((sum, s) => sum + s.totalVolume, 0)
      if (totalVol >= 10000) {
        const a = this.achievements.find(a => a.id === 'volume_king')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      // Set Machine - 100 total sets
      const totalSetsCount = this.history.reduce((sum, s) =>
        sum + s.exercises.reduce((exSum, ex) => exSum + ex.sets.length, 0), 0
      )
      if (totalSetsCount >= 100) {
        const a = this.achievements.find(a => a.id === 'set_machine')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      // Heavy Hitter - 500kg+ in single session
      const latestWorkout = this.history[0]
      if (latestWorkout && latestWorkout.totalVolume >= 500) {
        const a = this.achievements.find(a => a.id === 'heavy_hitter')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      // Century Sets - 10 workouts
      if (this.history.length >= 10) {
        const a = this.achievements.find(a => a.id === 'century_sets')
        if (a && !a.unlocked) {
          a.unlocked = true
          a.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(a.name)
        }
      }

      if (newlyUnlocked.length > 0) {
        this.saveAchievements()
      }

      return newlyUnlocked
    },
  },
})
