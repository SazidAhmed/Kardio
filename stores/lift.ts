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

const LIFT_PLANS_KEY = 'kardio-lift-plans'
const LIFT_HISTORY_KEY = 'kardio-lift-history'

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

// Default lift plans
const defaultLiftPlans: LiftPlan[] = [
  {
    id: 'push',
    name: 'Push Day',
    icon: '💪',
    description: 'Chest, shoulders & triceps',
    exercises: [
      { id: 'pe1', name: 'Bench Press', sets: Array.from({ length: 4 }, () => ({ reps: 8, weight: 60, completed: false })) },
      { id: 'pe2', name: 'Overhead Press', sets: Array.from({ length: 3 }, () => ({ reps: 8, weight: 40, completed: false })) },
      { id: 'pe3', name: 'Incline Dumbbell Press', sets: Array.from({ length: 3 }, () => ({ reps: 10, weight: 24, completed: false })) },
      { id: 'pe4', name: 'Tricep Dips', sets: Array.from({ length: 3 }, () => ({ reps: 12, weight: 0, completed: false })) },
    ],
    restBetweenSets: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pull',
    name: 'Pull Day',
    icon: '🏋️',
    description: 'Back & biceps',
    exercises: [
      { id: 'ple1', name: 'Deadlift', sets: Array.from({ length: 4 }, () => ({ reps: 5, weight: 80, completed: false })) },
      { id: 'ple2', name: 'Barbell Row', sets: Array.from({ length: 4 }, () => ({ reps: 8, weight: 50, completed: false })) },
      { id: 'ple3', name: 'Pull-ups', sets: Array.from({ length: 3 }, () => ({ reps: 8, weight: 0, completed: false })) },
      { id: 'ple4', name: 'Bicep Curls', sets: Array.from({ length: 3 }, () => ({ reps: 12, weight: 16, completed: false })) },
    ],
    restBetweenSets: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'legs',
    name: 'Leg Day',
    icon: '🦵',
    description: 'Quads, hamstrings & calves',
    exercises: [
      { id: 'le1', name: 'Squat', sets: Array.from({ length: 4 }, () => ({ reps: 8, weight: 70, completed: false })) },
      { id: 'le2', name: 'Leg Press', sets: Array.from({ length: 3 }, () => ({ reps: 10, weight: 100, completed: false })) },
      { id: 'le3', name: 'Romanian Deadlift', sets: Array.from({ length: 3 }, () => ({ reps: 8, weight: 60, completed: false })) },
      { id: 'le4', name: 'Calf Raises', sets: Array.from({ length: 4 }, () => ({ reps: 15, weight: 40, completed: false })) },
    ],
    restBetweenSets: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

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
            this.plans = [...defaultLiftPlans]
          }
        } else {
          this.plans = [...defaultLiftPlans]
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
      this.saveHistory()

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
  },
})
