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

export interface WorkoutPreset {
  id: string
  name: string
  icon: string
  warmup: number
  run: number
  walk: number
  cooldown: number
  rounds: number
  rest: number
}

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

export type TimerPhase = 'idle' | 'warmup' | 'run' | 'walk' | 'rest' | 'cooldown'

const STORAGE_KEY = 'cardioflow-history'

// Store interval outside of Pinia state to avoid SSR serialization issues
let timerInterval: ReturnType<typeof setInterval> | null = null

export const useWorkoutStore = defineStore('workout', {
  state: () => ({
    presets: [
      { id: 'beginner', name: 'Beginner', icon: '🌱', warmup: 30, run: 20, walk: 40, cooldown: 30, rounds: 8, rest: 0 },
      { id: 'fatburn', name: 'Fat Burn', icon: '🔥', warmup: 30, run: 30, walk: 30, cooldown: 30, rounds: 12, rest: 0 },
      { id: 'hiitbeast', name: 'HIIT Beast', icon: '⚡', warmup: 30, run: 40, walk: 20, cooldown: 30, rounds: 15, rest: 0 },
      { id: 'custom', name: 'Custom', icon: '⚙️', warmup: 30, run: 40, walk: 20, cooldown: 30, rounds: 15, rest: 0 },
    ] as WorkoutPreset[],

    selectedPresetId: 'beginner' as string,

    // Custom config (applies only when custom is selected, but also editable for all)
    config: {
      warmup: 30,
      run: 20,
      walk: 40,
      cooldown: 30,
      rounds: 8,
      rest: 0, // Optional rest between rounds (0 = disabled)
    },

    // Favorited presets
    favoritePresets: [] as string[],

    // Timer state
    timerState: 'idle' as 'idle' | 'running' | 'paused' | 'finished',
    currentPhase: 'warmup' as TimerPhase,
    previewPhase: 'warmup' as TimerPhase, // For previewing phase time before starting
    currentRound: 1,
    timeRemaining: 30,
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
    selectedPreset(state): WorkoutPreset {
      return state.presets.find(p => p.id === state.selectedPresetId) || state.presets[0]
    },

    effectiveConfig(state) {
      return state.config
    },

    totalWorkoutSeconds(state): number {
      const c = state.config
      const restTime = c.rest > 0 ? c.rest * (c.rounds - 1) : 0
      return c.warmup + (c.run + c.walk) * c.rounds + restTime + c.cooldown
    },

    isFavorite(state) {
      return (presetId: string) => state.favoritePresets.includes(presetId)
    },

    favoritedPresets(state) {
      return state.presets.filter(p => state.favoritePresets.includes(p.id))
    },

    nextPhase(state): TimerPhase {
      if (state.currentPhase === 'warmup') return 'run'
      if (state.currentPhase === 'run') return 'walk'
      if (state.currentPhase === 'walk') {
        // Check if we need rest before next round (except after last round)
        if (state.currentRound < state.config.rounds && state.config.rest > 0) return 'rest'
        if (state.currentRound < state.config.rounds) return 'run'
        return 'cooldown'
      }
      if (state.currentPhase === 'rest') return 'run'
      return 'idle'
    },

    nextPhaseDuration(state): number {
      const next = (() => {
        if (state.currentPhase === 'warmup') return 'run'
        if (state.currentPhase === 'run') return 'walk'
        if (state.currentPhase === 'walk') {
          if (state.currentRound < state.config.rounds && state.config.rest > 0) return 'rest'
          if (state.currentRound < state.config.rounds) return 'run'
          return 'cooldown'
        }
        if (state.currentPhase === 'rest') return 'run'
        return 'cooldown'
      })()
      return (state.config as any)[next] || 0
    },

    weekHistory(state): WorkoutSession[] {
      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return state.history.filter(s => new Date(s.date) >= weekAgo)
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
    selectPreset(id: string) {
      this.selectedPresetId = id
      const preset = this.presets.find(p => p.id === id)
      if (preset) {
        this.config = {
          warmup: preset.warmup,
          run: preset.run,
          walk: preset.walk,
          cooldown: preset.cooldown,
          rounds: preset.rounds,
          rest: preset.rest || 0,
        }
      }
      this.resetTimer()
    },

    updateConfig(key: keyof typeof this.config, delta: number) {
      const min = key === 'rounds' ? 1 : 5
      const step = key === 'rounds' ? 1 : 5
      this.config[key] = Math.max(min, this.config[key] + delta * step)

      // If custom preset is selected, update it
      if (this.selectedPresetId === 'custom') {
        const customPreset = this.presets.find(p => p.id === 'custom')
        if (customPreset) {
          Object.assign(customPreset, this.config)
        }
      }
    },

    startTimer() {
      const audio = getAudioFeedback()
      if (this.timerState === 'idle') {
        this.currentPhase = 'warmup'
        this.currentRound = 1
        this.timeRemaining = this.config.warmup
        this.previewPhase = 'warmup'
        this.totalElapsed = 0
        // Announce workout start
        audio?.playPhaseChange('warmup')
      }
      this.timerState = 'running'
      timerInterval = setInterval(() => this.tick(), 1000)
    },

    setPreviewPhase(phase: TimerPhase) {
      if (this.timerState === 'idle' && phase !== 'idle') {
        this.previewPhase = phase
        this.timeRemaining = this.config[phase]
      }
    },

    pauseTimer() {
      this.timerState = 'paused'
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    },

    resetTimer() {
      this.timerState = 'idle'
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      this.currentPhase = 'warmup'
      this.currentRound = 1
      this.timeRemaining = this.config.warmup
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

      if (this.currentPhase === 'warmup') {
        this.currentPhase = 'run'
        this.timeRemaining = this.config.run
        audio?.playPhaseChange('run')
      } else if (this.currentPhase === 'run') {
        this.currentPhase = 'walk'
        this.timeRemaining = this.config.walk
        audio?.playPhaseChange('walk')
      } else if (this.currentPhase === 'walk') {
        if (this.currentRound < this.config.rounds) {
          // Check if rest is enabled before next round
          if (this.config.rest > 0) {
            this.currentPhase = 'rest'
            this.timeRemaining = this.config.rest
            audio?.speak('Rest')
            audio?.playPhaseStart()
          } else {
            this.currentRound++
            this.currentPhase = 'run'
            this.timeRemaining = this.config.run
            audio?.playPhaseChange('run')
          }
        } else {
          this.currentPhase = 'cooldown'
          this.timeRemaining = this.config.cooldown
          audio?.playPhaseChange('cooldown')
        }
      } else if (this.currentPhase === 'rest') {
        // After rest, increment round and start running
        this.currentRound++
        this.currentPhase = 'run'
        this.timeRemaining = this.config.run
        audio?.playPhaseChange('run')
      } else if (this.currentPhase === 'cooldown') {
        this.finishWorkout(true)
      }
    },

    finishWorkout(completed: boolean) {
      const audio = getAudioFeedback()

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
        name: this.selectedPreset.name,
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
