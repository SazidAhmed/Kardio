import { defineStore } from 'pinia'
import type { AiPlannerProfile, AiPlannerResponse } from '~/types/ai'

const AI_HISTORY_KEY = 'kardio-ai-history'
const AI_HISTORY_LIMIT = 20

export interface AiGenerationRecord {
  id: string
  createdAt: string
  profile: AiPlannerProfile
  result: AiPlannerResponse
  savedTargets: {
    cardio: boolean
    lift: boolean
  }
}

export const useAiStore = defineStore('ai', {
  state: () => ({
    history: [] as AiGenerationRecord[],
  }),

  getters: {
    recentHistory(state) {
      return state.history
    },
  },

  actions: {
    recordGeneration(payload: { profile: AiPlannerProfile, result: AiPlannerResponse }) {
      const record: AiGenerationRecord = {
        id: `ai_${Date.now()}`,
        createdAt: new Date().toISOString(),
        profile: JSON.parse(JSON.stringify(payload.profile)) as AiPlannerProfile,
        result: JSON.parse(JSON.stringify(payload.result)) as AiPlannerResponse,
        savedTargets: {
          cardio: false,
          lift: false,
        },
      }

      this.history.unshift(record)
      this.history = this.history.slice(0, AI_HISTORY_LIMIT)
      this.saveHistory()

      return record.id
    },

    markPlanSaved(recordId: string, target: 'cardio' | 'lift') {
      const record = this.history.find(item => item.id === recordId)
      if (!record || record.savedTargets[target]) {
        return
      }

      record.savedTargets[target] = true
      this.saveHistory()
    },

    deleteHistoryItem(recordId: string) {
      const index = this.history.findIndex(item => item.id === recordId)
      if (index === -1) {
        return
      }

      this.history.splice(index, 1)
      this.saveHistory()
    },

    clearHistory() {
      this.history = []
      this.saveHistory()
    },

    saveHistory() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(this.history))
      }
    },

    loadHistory() {
      if (typeof localStorage === 'undefined') {
        return
      }

      const stored = localStorage.getItem(AI_HISTORY_KEY)
      if (!stored) {
        this.history = []
        return
      }

      try {
        const parsed = JSON.parse(stored)
        this.history = Array.isArray(parsed) ? parsed : []
      } catch {
        this.history = []
      }
    },
  },
})
