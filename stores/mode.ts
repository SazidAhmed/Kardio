import { defineStore } from 'pinia'

export type AppMode = 'cardio' | 'lifting'
export type CardioTab = 'timer' | 'plans' | 'history' | 'ai'
export type LiftingTab = 'plans' | 'history' | 'ai'

const MODE_STORAGE_KEY = 'fitz-mode'
const CARDIO_TAB_STORAGE_KEY = 'fitz-cardio-tab'
const LIFTING_TAB_STORAGE_KEY = 'fitz-lifting-tab'

export const useModeStore = defineStore('mode', {
  state: () => ({
    currentMode: 'cardio' as AppMode,
    cardioTab: 'timer' as CardioTab,
    liftingTab: 'plans' as LiftingTab,
  }),

  getters: {
    isCardioMode: (state) => state.currentMode === 'cardio',
    isLiftingMode: (state) => state.currentMode === 'lifting',
    activeTab: (state) => {
      return state.currentMode === 'cardio' ? state.cardioTab : state.liftingTab
    },
  },

  actions: {
    setMode(mode: AppMode) {
      // Reset target mode's tab to default (exit AI if active)
      if (mode === 'cardio') {
        this.cardioTab = 'timer'
        this.saveCardioTab()
      } else {
        this.liftingTab = 'plans'
        this.saveLiftingTab()
      }
      this.currentMode = mode
      this.saveMode()
    },

    setCardioTab(tab: CardioTab) {
      this.cardioTab = tab
      this.saveCardioTab()
    },

    setLiftingTab(tab: LiftingTab) {
      this.liftingTab = tab
      this.saveLiftingTab()
    },

    switchTab(tab: CardioTab | LiftingTab) {
      if (this.currentMode === 'cardio') {
        this.setCardioTab(tab as CardioTab)
      } else {
        this.setLiftingTab(tab as LiftingTab)
      }
    },

    saveMode() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MODE_STORAGE_KEY, this.currentMode)
      }
    },

    saveCardioTab() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CARDIO_TAB_STORAGE_KEY, this.cardioTab)
      }
    },

    saveLiftingTab() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LIFTING_TAB_STORAGE_KEY, this.liftingTab)
      }
    },

    loadMode() {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(MODE_STORAGE_KEY)
        if (stored === 'cardio' || stored === 'lifting') {
          this.currentMode = stored
        }

        const cardioTabStored = localStorage.getItem(CARDIO_TAB_STORAGE_KEY)
        if (cardioTabStored === 'timer' || cardioTabStored === 'plans' || cardioTabStored === 'history' || cardioTabStored === 'ai') {
          this.cardioTab = cardioTabStored
        }

        const liftingTabStored = localStorage.getItem(LIFTING_TAB_STORAGE_KEY)
        if (liftingTabStored === 'plans' || liftingTabStored === 'history' || liftingTabStored === 'ai') {
          this.liftingTab = liftingTabStored
        }
      }
    },
  },
})
