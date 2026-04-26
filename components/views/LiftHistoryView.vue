<template>
  <div class="lift-history-view">
    <!-- Streak Reminder -->
    <section v-if="store.hasStreakReminder" class="section">
      <div class="reminder-banner" @click="dismissReminder">
        <span class="reminder-icon">🔥</span>
        <div class="reminder-text">
          <strong>Keep your streak alive!</strong>
          <span>You haven't lifted in {{ store.daysSinceLastWorkout }} days</span>
        </div>
        <button class="reminder-close" @click.stop="dismissReminder">×</button>
      </div>
    </section>

    <!-- Workout Reminder -->
    <section class="section">
      <div class="reminder-card">
        <div class="reminder-setting">
          <div class="reminder-info">
            <span class="reminder-setting-icon">🔔</span>
            <div>
              <span class="reminder-setting-label">Daily Reminder</span>
              <span class="reminder-setting-desc">Get notified to lift</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" :checked="reminder.reminderEnabled.value" @change="reminder.toggleReminder()">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="reminder.reminderEnabled.value" class="reminder-time-row">
          <span class="reminder-time-label">Remind at</span>
          <input
            type="time"
            :value="reminder.reminderTime.value"
            @input="reminder.setReminderTime(($event.target as HTMLInputElement).value)"
            class="reminder-time-input"
          />
        </div>
      </div>
    </section>

    <!-- Day Selector -->
    <section class="section">
      <div class="day-row">
        <button
          v-for="day in weekDays"
          :key="day.label"
          class="day-btn"
          :class="{
            active: selectedDayIndex === day.index,
            today: day.isToday && selectedDayIndex === null,
            'has-session': day.hasSession,
          }"
          @click="selectDay(day.index)"
        >
          {{ day.label }}
        </button>
      </div>
    </section>

    <!-- Weekly Goal Progress -->
    <section class="section">
      <div class="goal-card">
        <div class="goal-header">
          <div class="goal-title">
            <span class="goal-icon">🎯</span>
            <span>Weekly Goal</span>
          </div>
          <button class="btn-edit" @click="showTargetEdit = !showTargetEdit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
        <div v-if="showTargetEdit" class="goal-edit">
          <input
            v-model.number="tempTarget"
            type="number"
            min="5"
            max="200"
            class="goal-input"
          />
          <span class="goal-unit">sets/week</span>
          <button class="btn-save" @click="saveTarget">Save</button>
        </div>
        <div class="goal-progress">
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill"
              :class="{ 'goal-reached': store.weekProgressPercent >= 100 }"
              :style="{ width: store.weekProgressPercent + '%' }"
            ></div>
          </div>
          <div class="goal-stats">
            <span class="goal-current">{{ store.weekSets }}</span>
            <span class="goal-target">/ {{ store.weeklyTargetSets }} sets</span>
            <span v-if="store.weekProgressPercent >= 100" class="goal-badge">🎉 Goal Reached!</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Charts -->
    <section class="section">
      <div class="chart-header">
        <label class="section-label">ACTIVITY</label>
        <div class="chart-tabs">
          <button
            class="chart-tab"
            :class="{ active: chartView === 'week' }"
            @click="chartView = 'week'"
          >
            Week
          </button>
          <button
            class="chart-tab"
            :class="{ active: chartView === 'month' }"
            @click="chartView = 'month'"
          >
            Month
          </button>
        </div>
      </div>
      <div class="chart-card">
        <!-- Weekly Bar Chart -->
        <div v-if="chartView === 'week'" class="weekly-chart">
          <svg class="chart-svg" viewBox="0 0 300 120" preserveAspectRatio="none">
            <line x1="0" y1="30" x2="300" y2="30" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="60" x2="300" y2="60" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="90" x2="300" y2="90" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <rect
              v-for="(value, i) in store.dailyVolumeLast7Days"
              :key="i"
              :x="i * 43"
              :y="120 - (value / Math.max(...store.dailyVolumeLast7Days, 1) * 100)"
              width="35"
              :height="(value / Math.max(...store.dailyVolumeLast7Days, 1) * 100)"
              fill="var(--accent-primary)"
              rx="4"
              opacity="0.8"
            />
          </svg>
          <div class="chart-labels">
            <span v-for="(value, i) in store.dailyVolumeLast7Days" :key="i" class="chart-label">
              {{ formatWeight(value) }}kg
            </span>
          </div>
        </div>
        <!-- Monthly Sparkline -->
        <div v-else class="monthly-chart">
          <svg class="chart-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
            <line x1="0" y1="20" x2="300" y2="20" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="40" x2="300" y2="40" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="60" x2="300" y2="60" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <polyline
              :points="store.dailyVolumeLast30Days.map((v, i) => `${i * 10},${80 - (v / Math.max(...store.dailyVolumeLast30Days, 1) * 70)}`).join(' ')"
              fill="none"
              stroke="var(--accent-primary)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <template v-for="(vol, idx) in store.dailyVolumeLast30Days" :key="idx">
              <circle
                v-if="vol > 0"
                :cx="idx * 10"
                :cy="80 - (vol / Math.max(...store.dailyVolumeLast30Days, 1) * 70)"
                r="2"
                fill="var(--accent-primary)"
              />
            </template>
          </svg>
        </div>
      </div>
    </section>

    <!-- Stats Summary -->
    <section class="section stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ store.streak }}</span>
        <span class="stat-label">STREAK</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ filteredStats.sessions }}</span>
        <span class="stat-label">{{ selectedDayIndex !== null ? 'TODAY' : 'SESSIONS' }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ formatWeight(filteredStats.volume) }}<small>kg</small></span>
        <span class="stat-label">{{ selectedDayIndex !== null ? 'TODAY' : 'VOLUME' }}</span>
      </div>
    </section>

    <!-- Personal Records -->
    <section class="section">
      <label class="section-label">PERSONAL RECORDS</label>
      <div class="records-grid">
        <div class="record-card">
          <span class="record-icon">🏋️</span>
          <span class="record-value">{{ formatWeight(store.personalRecords.maxVolume) }}kg</span>
          <span class="record-label">Max Volume</span>
        </div>
        <div class="record-card">
          <span class="record-icon">⚡</span>
          <span class="record-value">{{ store.personalRecords.maxSets }}</span>
          <span class="record-label">Most Sets</span>
        </div>
        <div class="record-card">
          <span class="record-icon">🔥</span>
          <span class="record-value">{{ store.personalRecords.longestStreak }}</span>
          <span class="record-label">Longest Streak</span>
        </div>
      </div>
    </section>

    <!-- Achievements -->
    <section class="section">
      <label class="section-label">ACHIEVEMENTS</label>
      <div class="achievements-scroll">
        <div class="achievements-list">
          <div
            v-for="achievement in store.achievements"
            :key="achievement.id"
            class="achievement-badge"
            :class="{ unlocked: achievement.unlocked }"
            :title="achievement.description"
          >
            <span class="achievement-icon">{{ achievement.icon }}</span>
            <span class="achievement-name">{{ achievement.name }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 30-Day Progress Chart -->
    <section class="section">
      <div class="chart-card progress-chart">
        <label class="section-label">30-DAY PROGRESS</label>
        <div class="progress-chart-area">
          <svg class="progress-line-svg" viewBox="0 0 300 100" preserveAspectRatio="none">
            <line x1="0" y1="25" x2="300" y2="25" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="50" x2="300" y2="50" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="75" x2="300" y2="75" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <polyline
              :points="progressChartPoints"
              fill="none"
              stroke="var(--accent-primary)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polygon
              :points="progressChartAreaPoints"
              fill="var(--accent-primary)"
              fill-opacity="0.1"
            />
            <circle
              v-for="(point, i) in progressChartPointsArray"
              :key="i"
              :cx="point.x"
              :cy="point.y"
              r="3"
              fill="var(--accent-primary)"
            />
          </svg>
          <div class="progress-chart-labels">
            <span class="progress-label">{{ progressChartDays[0] }}</span>
            <span class="progress-label">{{ progressChartDays[14] }}</span>
            <span class="progress-label">{{ progressChartDays[progressChartDays.length - 1] }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Weekly Volume Chart -->
    <section class="section">
      <div class="chart-card">
        <label class="section-label">WEEKLY VOLUME</label>
        <div class="chart-area">
          <div class="chart-bars">
            <div
              v-for="(week, i) in weeklyVolumeData"
              :key="i"
              class="chart-bar-col"
            >
              <div class="bar-wrapper">
                <div
                  class="bar"
                  :class="{ 'bar-active': week.volume > 0 }"
                  :style="{ height: week.height + '%' }"
                  :title="`${formatWeight(week.volume)} kg`"
                ></div>
                <div v-if="week.volume > 0" class="bar-tooltip">{{ formatWeight(week.volume) }}kg</div>
              </div>
              <span class="bar-date">{{ week.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Export & Session History -->
    <section class="section">
      <div class="section-header">
        <label class="section-label">SESSION HISTORY</label>
        <div class="section-actions">
          <button v-if="store.history.length > 0" class="btn-share" @click="shareWorkout" title="Share summary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button v-if="store.history.length > 0" class="btn-export" @click="exportCSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>
      <div v-if="store.history.length === 0" class="empty-state">
        <div class="empty-icon">🏋️</div>
        <p class="empty-text">No lifting sessions yet.</p>
        <p class="empty-subtext">Start your first workout in the Plans tab!</p>
      </div>
      <div v-else class="session-list">
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="session-card"
          @click="toggleSessionDetail(session.id)"
        >
          <div class="session-header">
            <div class="session-info">
              <span class="session-name">{{ session.planName }}</span>
              <span class="session-meta">{{ session.date }} · {{ session.duration }} · {{ formatWeight(session.totalVolume) }}kg</span>
            </div>
            <div class="session-actions">
              <div class="session-badge" :class="session.status">
                {{ session.status === 'completed' ? 'DONE' : 'PARTIAL' }}
              </div>
              <button class="btn-delete" @click.stop="deleteSession(session.id)" title="Delete session">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
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
import type { LiftSession } from '~/stores/lift'
import { useLiftStore } from '~/stores/lift'

const store = useLiftStore()

// Reminder composable (reuse from cardio)
const reminder = useReminder()

// UI State
const expandedSessionId = ref<string | null>(null)
const selectedDayIndex = ref<number | null>(null)
const chartView = ref<'week' | 'month'>('week')
const showTargetEdit = ref(false)
const tempTarget = ref(store.weeklyTargetSets)

onMounted(() => {
  store.loadHistory()
  store.loadSettings()
  store.loadAchievements()
})

// Week Days for selector
const weekDays = computed(() => {
  const today = new Date()
  const currentDay = today.getDay()
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days: { label: string; index: number; isToday: boolean; hasSession: boolean }[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - currentDay + i)
    const dateStr = d.toDateString()
    const hasSession = store.history.some(s => {
      try { return new Date(s.date).toDateString() === dateStr } catch { return false }
    })
    days.push({
      label: dayLabels[i],
      index: i,
      isToday: i === currentDay,
      hasSession,
    })
  }
  return days
})

// Filtered sessions based on day selection
const filteredSessions = computed(() => {
  if (selectedDayIndex.value === null) return store.history

  const today = new Date()
  const currentDay = today.getDay()
  const targetDate = new Date(today)
  targetDate.setDate(targetDate.getDate() - currentDay + selectedDayIndex.value)
  const targetDateStr = targetDate.toDateString()

  return store.history.filter(s => {
    try { return new Date(s.date).toDateString() === targetDateStr } catch { return false }
  })
})

// Filtered stats
const filteredStats = computed(() => {
  const sessions = filteredSessions.value
  const volume = sessions.reduce((sum: number, s: LiftSession) => sum + s.totalVolume, 0)
  return { sessions: sessions.length, volume }
})

// Weekly Volume Data for chart
const weeklyVolumeData = computed(() => {
  const weeks: { label: string; volume: number; height: number }[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const weekSessions = store.history.filter(s => {
      const sDate = new Date(s.date)
      return sDate >= weekStart && sDate <= weekEnd
    })
    const volume = weekSessions.reduce((sum: number, s: LiftSession) => sum + s.totalVolume, 0)

    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    weeks.push({ label, volume, height: 0 })
  }

  const maxVolume = Math.max(...weeks.map(w => w.volume), 1)
  weeks.forEach(w => {
    w.height = Math.round((w.volume / maxVolume) * 100)
  })

  return weeks
})

// 30-Day Progress Chart
const progressChartDays = computed(() => {
  const days: string[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  return days
})

const progressChartPoints = computed(() => {
  const data = store.dailyVolumeLast30Days
  if (data.length === 0) return ''
  const maxVal = Math.max(...data, 1)
  return data.map((v: number, i: number) => `${i * 10},${100 - (v / maxVal * 90)}`).join(' ')
})

const progressChartAreaPoints = computed(() => {
  const data = store.dailyVolumeLast30Days
  if (data.length === 0) return ''
  const maxVal = Math.max(...data, 1)
  const topPoints = data.map((v: number, i: number) => `${i * 10},${100 - (v / maxVal * 90)}`).join(' ')
  const lastX = (data.length - 1) * 10
  return `${topPoints} ${lastX},100 0,100`
})

const progressChartPointsArray = computed(() => {
  const data = store.dailyVolumeLast30Days
  const maxVal = Math.max(...data, 1)
  return data.map((v: number, i: number) => ({
    x: i * 10,
    y: 100 - (v / maxVal * 90),
  })).filter((p: { x: number; y: number }) => p.y < 100)
})

// Actions
function formatWeight(weight: number): string {
  return weight.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function toggleSessionDetail(id: string) {
  expandedSessionId.value = expandedSessionId.value === id ? null : id
}

function selectDay(index: number) {
  selectedDayIndex.value = selectedDayIndex.value === index ? null : index
}

function dismissReminder() {
  store.dismissStreakReminder()
}

function saveTarget() {
  store.setWeeklyTarget(tempTarget.value)
  showTargetEdit.value = false
}

function deleteSession(id: string) {
  store.deleteSession(id)
}

function exportCSV() {
  const headers = ['Date', 'Time', 'Plan Name', 'Duration', 'Total Volume (kg)', 'Status', 'Exercises']
  const rows = store.history.map((s: LiftSession) => [
    new Date(s.date).toLocaleDateString(),
    s.time,
    s.planName,
    s.duration,
    s.totalVolume,
    s.status,
    s.exercises.map((ex: { name: string; sets: unknown[] }) => `${ex.name} (${ex.sets.length} sets)`).join('; '),
  ])

  const csv = [headers.join(','), ...rows.map((r: (string | number)[]) => r.map((cell: string | number) => `"${cell}"`).join(','))].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `fitz-lifting-history-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function shareWorkout() {
  const latest = store.history[0]
  const sessions = filteredSessions.value
  const sessionCount = sessions.length
  const setsCount = sessions.reduce((sum: number, s: LiftSession) =>
    sum + s.exercises.reduce((exSum: number, ex: { sets: unknown[] }) => exSum + ex.sets.length, 0), 0)
  const totalVol = sessions.reduce((sum: number, s: LiftSession) => sum + s.totalVolume, 0)

  const summaryText = `🏋️ Fit-Z Lifting Summary
📅 ${latest ? new Date(latest.date).toLocaleDateString() : new Date().toLocaleDateString()}

📊 Stats:
• Workouts: ${sessionCount}
• Sets: ${setsCount}
• Volume: ${formatWeight(totalVol)}kg
${store.streak > 0 ? `🔥 Streak: ${store.streak} days` : ''}

${latest ? `💪 Latest Workout:
• ${latest.planName} - ${latest.duration}
• Volume: ${formatWeight(latest.totalVolume)}kg
• ${latest.exercises.length} exercises completed
${latest.exercises.map((ex: { name: string; sets: { completed: boolean }[] }) => `  - ${ex.name}: ${ex.sets.filter((s: { completed: boolean }) => s.completed).length}/${ex.sets.length} sets`).join('\n')}` : ''}

Keep pushing! 💪🔥`

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Fit-Z Lifting Summary',
        text: summaryText,
      })
      return
    } catch {
      // Fall back to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(summaryText)
    alert('Summary copied to clipboard!')
  } catch {
    alert('Unable to share. Try manually copying your stats.')
  }
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

/* Section Actions */
.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Share Button */
.btn-share {
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

.btn-share:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
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

/* Delete Button */
.btn-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-delete:hover {
  background: #ffebee;
  color: #ff4444;
}

/* Session Actions */
.session-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* Streak Reminder Banner */
.reminder-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.reminder-icon { font-size: 24px; }

.reminder-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.reminder-text strong {
  font-size: 14px;
  font-weight: 600;
}

.reminder-text span {
  font-size: 12px;
  opacity: 0.9;
}

.reminder-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;
}

.reminder-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Reminder Card */
.reminder-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reminder-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reminder-setting-icon {
  font-size: 24px;
}

.reminder-setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.reminder-setting-desc {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.reminder-time-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.reminder-time-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.reminder-time-input {
  padding: 6px 12px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 50px;
  height: 28px;
  cursor: pointer;
}

.toggle-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--bg-primary);
  border-radius: 28px;
  border: 2px solid var(--border-color);
  transition: all 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
  background: white;
}

/* Day Selector */
.day-row {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}

.day-btn {
  flex: 1;
  padding: 12px 8px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.day-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.day-btn.today {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.day-btn.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.day-btn.has-session::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent-primary);
}

.day-btn.active.has-session::after {
  background: white;
}

/* Goal Card */
.goal-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.goal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.goal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.goal-icon { font-size: 18px; }

.btn-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-edit:hover {
  background: var(--bg-primary);
  color: var(--accent-primary);
}

.goal-edit {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
}

.goal-input {
  width: 80px;
  padding: 8px 12px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.goal-unit {
  font-size: 13px;
  color: var(--text-secondary);
  flex: 1;
}

.btn-save {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-save:hover {
  opacity: 0.9;
}

.goal-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-bar-bg {
  height: 10px;
  background: var(--bg-primary);
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: 5px;
  transition: width 0.3s ease;
}

.progress-bar-fill.goal-reached {
  background: linear-gradient(90deg, #34c759, #30d158);
}

.goal-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.goal-current {
  font-size: 18px;
  font-weight: 800;
  color: var(--accent-primary);
}

.goal-target {
  font-size: 13px;
  color: var(--text-secondary);
}

.goal-badge {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: #34c759;
}

/* Chart Header */
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chart-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-card);
  padding: 4px;
  border-radius: var(--radius-full);
}

.chart-tab {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chart-tab.active {
  background: var(--accent-primary);
  color: white;
}

/* Monthly Chart */
.monthly-chart {
  width: 100%;
}

/* Progress Chart */
.progress-chart {
  padding: 16px;
}

.progress-chart-area {
  margin-top: 12px;
}

.progress-line-svg {
  width: 100%;
  height: 100px;
}

.progress-chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.progress-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Chart Bars (Weekly Volume) */
.chart-area {
  margin-top: 12px;
}

.chart-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 120px;
  padding: 16px 8px 8px;
}

.chart-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bar-wrapper {
  position: relative;
  width: 32px;
  height: 90px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  background: var(--bg-primary);
  border-radius: 6px 6px 0 0;
  min-height: 4px;
  transition: all 0.2s ease;
}

.bar-active {
  background: var(--accent-primary);
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 4px;
  padding: 4px 8px;
  background: var(--text-primary);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: var(--radius-md);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.bar-wrapper:hover .bar-tooltip {
  opacity: 1;
}

.bar-date {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Achievements */
.achievements-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.achievements-scroll::-webkit-scrollbar {
  display: none;
}

.achievements-list {
  display: flex;
  gap: 12px;
  padding: 4px 0;
}

.achievement-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 12px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-color);
  min-width: 80px;
  opacity: 0.5;
  transition: all 0.2s ease;
}

.achievement-badge.unlocked {
  opacity: 1;
  border-color: var(--accent-primary);
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(66, 153, 225, 0.1) 100%);
}

.achievement-icon {
  font-size: 28px;
}

.achievement-name {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.achievement-badge.unlocked .achievement-name {
  color: var(--accent-primary);
}

/* Responsive */
@media (max-width: 400px) {
  .day-btn {
    padding: 10px 6px;
    font-size: 11px;
  }

  .records-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .record-card {
    padding: 12px 6px;
  }

  .record-value {
    font-size: 14px;
  }
}
</style>
