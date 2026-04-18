<template>
  <div class="lift-history-view">
    <!-- Header Stats -->
    <section class="section">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ totalWorkouts }}</span>
          <span class="stat-label">WORKOUTS</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ totalSets }}</span>
          <span class="stat-label">SETS</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ formatWeight(totalVolume) }}<small>kg</small></span>
          <span class="stat-label">VOLUME</span>
        </div>
      </div>
    </section>

    <!-- Personal Records -->
    <section class="section">
      <label class="section-label">PERSONAL RECORDS</label>
      <div class="records-grid">
        <div class="record-card">
          <span class="record-icon">🏋️</span>
          <span class="record-value">{{ formatWeight(personalRecords.maxVolume) }}kg</span>
          <span class="record-label">Max Volume</span>
        </div>
        <div class="record-card">
          <span class="record-icon">⚡</span>
          <span class="record-value">{{ personalRecords.maxSets }}</span>
          <span class="record-label">Most Sets</span>
        </div>
        <div class="record-card">
          <span class="record-icon">🔥</span>
          <span class="record-value">{{ personalRecords.longestWorkout }}</span>
          <span class="record-label">Longest Workout</span>
        </div>
      </div>
    </section>

    <!-- Weekly Activity Chart -->
    <section class="section">
      <label class="section-label">WEEKLY ACTIVITY</label>
      <div class="chart-card">
        <div class="weekly-chart">
          <svg class="chart-svg" viewBox="0 0 300 120" preserveAspectRatio="none">
            <line x1="0" y1="30" x2="300" y2="30" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="60" x2="300" y2="60" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="90" x2="300" y2="90" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <rect
              v-for="(value, i) in weeklyData"
              :key="i"
              :x="i * 43"
              :y="120 - (value.volume / Math.max(...weeklyData.map(d => d.volume), 1) * 100)"
              width="35"
              :height="(value.volume / Math.max(...weeklyData.map(d => d.volume), 1) * 100)"
              fill="var(--accent-primary)"
              rx="4"
              opacity="0.8"
            />
          </svg>
          <div class="chart-labels">
            <span v-for="(day, i) in weeklyData" :key="i" class="chart-label">
              {{ day.label }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Session History -->
    <section class="section">
      <div class="section-header">
        <label class="section-label">SESSION HISTORY</label>
        <button v-if="store.history.length > 0" class="btn-export" @click="exportCSV">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>
      <div v-if="store.history.length === 0" class="empty-state">
        <div class="empty-icon">🏋️</div>
        <p class="empty-text">No lifting sessions yet.</p>
        <p class="empty-subtext">Start your first workout in the Plans tab!</p>
      </div>
      <div v-else class="session-list">
        <div
          v-for="session in store.history"
          :key="session.id"
          class="session-card"
          @click="toggleSessionDetail(session.id)"
        >
          <div class="session-header">
            <div class="session-info">
              <span class="session-name">{{ session.planName }}</span>
              <span class="session-meta">{{ session.date }} · {{ session.duration }} · {{ formatWeight(session.totalVolume) }}kg</span>
            </div>
            <div class="session-badge" :class="session.status">
              {{ session.status === 'completed' ? 'DONE' : 'PARTIAL' }}
            </div>
          </div>
          <div v-if="expandedSessionId === session.id" class="session-detail">
            <div class="exercise-breakdown">
              <div v-for="ex in session.exercises" :key="ex.id" class="detail-exercise">
                <span class="detail-ex-name">{{ ex.name }}</span>
                <div class="detail-sets">
                  <span v-for="(set, i) in ex.sets" :key="i" class="detail-set" :class="{ done: set.completed }">
                    {{ set.reps }}×{{ formatWeight(set.weight) }}kg
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLiftStore } from '~/stores/lift'

const store = useLiftStore()
const expandedSessionId = ref<string | null>(null)

onMounted(() => {
  store.loadHistory()
})

// Stats
const totalWorkouts = computed(() => store.history.length)

const totalSets = computed(() => {
  return store.history.reduce((sum, session) => {
    return sum + session.exercises.reduce((exSum, ex) => exSum + ex.sets.length, 0)
  }, 0)
})

const totalVolume = computed(() => {
  return store.history.reduce((sum, session) => sum + session.totalVolume, 0)
})

// Personal Records
const personalRecords = computed(() => {
  if (store.history.length === 0) {
    return { maxVolume: 0, maxSets: 0, longestWorkout: '0:00' }
  }

  const maxVolume = Math.max(...store.history.map(s => s.totalVolume))
  const maxSets = Math.max(...store.history.map(s =>
    s.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  ))
  const longestWorkout = store.history.reduce((max, s) => {
    const duration = s.duration || '0:00'
    const [m, sec] = duration.split(':').map(Number)
    const totalSec = (m || 0) * 60 + (sec || 0)
    const [maxM, maxSec] = max.split(':').map(Number)
    const maxTotalSec = (maxM || 0) * 60 + (maxSec || 0)
    return totalSec > maxTotalSec ? duration : max
  }, '0:00')

  return { maxVolume, maxSets, longestWorkout }
})

// Weekly Data for Chart
const weeklyData = computed(() => {
  const days: { label: string; volume: number }[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)

    const daySessions = store.history.filter(s => {
      const sDate = new Date(s.date)
      return sDate.toDateString() === d.toDateString()
    })

    const volume = daySessions.reduce((sum, s) => sum + s.totalVolume, 0)
    days.push({ label: dayLabel, volume })
  }

  return days
})

// Helpers
function formatWeight(weight: number): string {
  return weight.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function toggleSessionDetail(id: string) {
  expandedSessionId.value = expandedSessionId.value === id ? null : id
}

function exportCSV() {
  const headers = ['Date', 'Time', 'Plan Name', 'Duration', 'Total Volume (kg)', 'Status', 'Exercises']
  const rows = store.history.map(s => [
    new Date(s.date).toLocaleDateString(),
    s.time,
    s.planName,
    s.duration,
    s.totalVolume,
    s.status,
    s.exercises.map(ex => `${ex.name} (${ex.sets.length} sets)`).join('; ')
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `kardio-lifting-history-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<style scoped>
.lift-history-view {
  width: 100%;
  padding: 0 16px;
  padding-bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section {
  width: 100%;
}

.section-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header .section-label {
  margin-bottom: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px 12px;
  text-align: center;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-value small {
  font-size: 14px;
  font-weight: 700;
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* Records Grid */
.records-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.record-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 14px 8px;
  text-align: center;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.record-icon {
  font-size: 24px;
}

.record-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-primary);
  font-variant-numeric: tabular-nums;
}

.record-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* Chart */
.chart-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.weekly-chart {
  width: 100%;
}

.chart-svg {
  width: 100%;
  height: auto;
}

.chart-labels {
  display: flex;
  justify-content: space-around;
  margin-top: 8px;
}

.chart-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Export Button */
.btn-export {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-export:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon { font-size: 48px; }
.empty-text { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.empty-subtext { font-size: 13px; color: var(--text-secondary); }

/* Session List */
.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.session-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.session-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.session-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.session-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.session-badge.completed {
  background: #e8f5e9;
  color: var(--color-walk);
}

.session-badge.partial {
  background: #fff3e0;
  color: var(--color-partial);
}

/* Session Detail */
.session-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.exercise-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-exercise {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-ex-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-sets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.detail-set {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.detail-set.done {
  background: #e8f5e9;
  color: #34c759;
  border-color: #34c759;
}
</style>
