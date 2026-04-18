<template>
  <div class="history-view">
    <!-- Streak Reminder -->
    <section v-if="store.hasStreakReminder" class="section">
      <div class="reminder-banner" @click="dismissReminder">
        <span class="reminder-icon">🔥</span>
        <div class="reminder-text">
          <strong>Keep your streak alive!</strong>
          <span>You haven't worked out in {{ store.daysSinceLastWorkout }} days</span>
        </div>
        <button class="reminder-close" @click.stop="dismissReminder">×</button>
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
            min="30"
            max="600"
            class="goal-input"
          />
          <span class="goal-unit">min/week</span>
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
            <span class="goal-current">{{ store.weekMinutes }}m</span>
            <span class="goal-target">/ {{ store.weeklyTargetMinutes }}m</span>
            <span v-if="store.weekProgressPercent >= 100" class="goal-badge">🎉 Goal Reached!</span>
          </div>
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
        <span class="stat-value">{{ filteredStats.minutes }}<small>m</small></span>
        <span class="stat-label">{{ selectedDayIndex !== null ? 'TODAY' : 'TOTAL' }}</span>
      </div>
    </section>

    <!-- Personal Records -->
    <section class="section">
      <label class="section-label">PERSONAL RECORDS</label>
      <div class="records-grid">
        <div class="record-card">
          <span class="record-icon">🏆</span>
          <span class="record-value">{{ store.personalRecords.longestWorkoutMinutes }}m</span>
          <span class="record-label">Longest Workout</span>
        </div>
        <div class="record-card">
          <span class="record-icon">⚡</span>
          <span class="record-value">{{ store.personalRecords.mostRounds }}</span>
          <span class="record-label">Most Rounds</span>
        </div>
        <div class="record-card">
          <span class="record-icon">🔥</span>
          <span class="record-value">{{ store.personalRecords.longestStreak }}</span>
          <span class="record-label">Longest Streak</span>
        </div>
      </div>
    </section>

    <!-- 30-Day Progress Chart -->
    <section class="section">
      <div class="chart-card progress-chart">
        <label class="section-label">30-DAY PROGRESS</label>
        <div class="progress-chart-area">
          <svg class="progress-line-svg" viewBox="0 0 300 100" preserveAspectRatio="none">
            <!-- Grid lines -->
            <line x1="0" y1="25" x2="300" y2="25" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="50" x2="300" y2="50" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <line x1="0" y1="75" x2="300" y2="75" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="2" opacity="0.5"/>
            <!-- Progress line -->
            <polyline
              :points="progressChartPoints"
              fill="none"
              stroke="var(--accent-primary)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Area fill under line -->
            <polygon
              :points="progressChartAreaPoints"
              fill="var(--accent-primary)"
              fill-opacity="0.1"
            />
            <!-- Data points -->
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

    <!-- Weekly Minutes Chart -->
    <section class="section">
      <div class="chart-card">
        <label class="section-label">WEEKLY MINUTES</label>
        <div class="chart-area">
          <div class="chart-bars">
            <div
              v-for="(week, i) in weeklyData"
              :key="i"
              class="chart-bar-col"
            >
              <div class="bar-wrapper">
                <div
                  class="bar"
                  :class="{ 'bar-active': week.minutes > 0 }"
                  :style="{ height: week.height + '%' }"
                  :title="`${week.minutes} min`"
                ></div>
                <div v-if="week.minutes > 0" class="bar-tooltip">{{ week.minutes }}m</div>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>
      <div v-if="store.history.length === 0" class="empty-state">
        <div class="empty-icon">🏃</div>
        <p class="empty-text">No workouts yet.</p>
        <p class="empty-subtext">Start your first session in the Timer tab!</p>
      </div>
      <div v-else class="session-list">
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="session-card"
        >
          <div class="session-info">
            <span class="session-name">{{ session.name }}</span>
            <span class="session-meta">
              {{ formatDate(session.date) }} · {{ session.time }} · {{ session.rounds }} rounds · {{ session.duration }}
            </span>
            <span v-if="session.note" class="session-note">💬 {{ session.note }}</span>
          </div>
          <div class="session-actions">
            <span
              class="session-badge"
              :class="session.status === 'partial' ? 'badge-partial' : 'badge-complete'"
            >
              {{ session.status === 'partial' ? 'PARTIAL' : 'DONE' }}
            </span>
            <button class="btn-delete" @click="deleteSession(session.id)" title="Delete session">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWorkoutStore } from '~/stores/workout'

const store = useWorkoutStore()
const selectedDayIndex = ref<number | null>(null) // null = all days
const showTargetEdit = ref(false)
const tempTarget = ref(store.weeklyTargetMinutes)

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

onMounted(() => {
  store.loadHistory()
  store.loadSettings()
})

function dismissReminder() {
  store.dismissStreakReminder()
}

function saveTarget() {
  store.setWeeklyTarget(tempTarget.value)
  showTargetEdit.value = false
}

const weekDays = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...

  const sessionDates = new Set(
    store.history.map(s => new Date(s.date).toDateString())
  )

  return DAY_LABELS.map((label, i) => {
    const dayIndex = i === 6 ? 0 : i + 1 // Mon=1, Sun=0
    const diff = dayIndex - dayOfWeek
    const d = new Date(today)
    d.setDate(today.getDate() + diff)
    return {
      label,
      index: i,
      isToday: d.toDateString() === today.toDateString(),
      hasSession: sessionDates.has(d.toDateString()),
      date: d,
    }
  })
})

function selectDay(index: number) {
  selectedDayIndex.value = selectedDayIndex.value === index ? null : index
}

function isSameDay(d1: Date, d2: Date) {
  return d1.toDateString() === d2.toDateString()
}

const filteredSessions = computed(() => {
  if (selectedDayIndex.value === null) {
    return store.history
  }
  const selectedDay = weekDays.value[selectedDayIndex.value].date
  return store.history.filter(s => isSameDay(new Date(s.date), selectedDay))
})

const filteredStats = computed(() => {
  const sessions = filteredSessions.value
  const totalMin = Math.round(sessions.reduce((sum, s) => {
    const [m, sec] = s.duration.split(':').map(Number)
    return sum + m + sec / 60
  }, 0))
  return {
    sessions: sessions.length,
    minutes: totalMin,
  }
})

// Generate 7 weeks of data for chart
const weeklyData = computed(() => {
  const weeks: { label: string; minutes: number; height: number }[] = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const weekSessions = store.history.filter(s => {
      const d = new Date(s.date)
      return d >= weekStart && d < weekEnd
    })

    const minutes = Math.round(weekSessions.reduce((sum, s) => {
      const [m, sec] = s.duration.split(':').map(Number)
      return sum + m + sec / 60
    }, 0))

    const month = weekStart.toLocaleDateString('en-US', { month: 'numeric' })
    const day = weekStart.getDate()
    weeks.push({ label: `${month}/${day}`, minutes, height: 0 })
  }

  const maxMin = Math.max(...weeks.map(w => w.minutes), 1)
  return weeks.map(w => ({ ...w, height: Math.max((w.minutes / maxMin) * 100, w.minutes > 0 ? 8 : 0) }))
})

// Generate 30 days of data for progress chart
const progressChartData = computed(() => {
  const days: { date: Date; label: string; minutes: number }[] = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)

    const daySessions = store.history.filter(s => {
      const sDate = new Date(s.date)
      return sDate.toDateString() === d.toDateString()
    })

    const minutes = Math.round(daySessions.reduce((sum, s) => {
      const [m, sec] = s.duration.split(':').map(Number)
      return sum + m + sec / 60
    }, 0))

    const label = i === 0 ? 'Today' : i === 29 ? '30d ago' : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
    days.push({ date: d, label, minutes })
  }

  return days
})

const progressChartDays = computed(() => progressChartData.value.map(d => d.label))

const progressChartPointsArray = computed(() => {
  const data = progressChartData.value
  const maxMinutes = Math.max(...data.map(d => d.minutes), 1)
  const width = 300
  const height = 100
  const padding = 10

  return data.map((day, index) => ({
    x: (index / (data.length - 1)) * (width - padding * 2) + padding,
    y: height - padding - (day.minutes / maxMinutes) * (height - padding * 2),
  }))
})

const progressChartPoints = computed(() => {
  return progressChartPointsArray.value.map(p => `${p.x},${p.y}`).join(' ')
})

const progressChartAreaPoints = computed(() => {
  const points = progressChartPointsArray.value
  if (points.length === 0) return ''
  const height = 100
  const padding = 10
  const firstX = points[0].x
  const lastX = points[points.length - 1].x
  return `${firstX},${height} ${points.map(p => `${p.x},${p.y}`).join(' ')} ${lastX},${height}`
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

function deleteSession(id: string) {
  store.deleteSession(id)
}

function exportCSV() {
  const headers = ['Date', 'Time', 'Name', 'Rounds', 'Duration', 'Status', 'Note']
  const rows = store.history.map(s => [
    new Date(s.date).toLocaleDateString(),
    s.time,
    s.name,
    s.rounds,
    s.duration,
    s.status,
    s.note || ''
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `kardio-workouts-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function shareWorkout() {
  // Generate summary text
  const latest = store.history[0]
  const totalWorkouts = store.history.length
  const totalMinutes = store.totalMinutes
  const streak = store.streak

  // Find the plan to get exercise details
  const plan = store.plans.find(p => p.name === latest?.name)

  const summaryText = `🏃‍♂️ Kardio Workout Summary
📅 ${latest ? new Date(latest.date).toLocaleDateString() : new Date().toLocaleDateString()}

📊 Stats:
• Total Workouts: ${totalWorkouts}
• Total Minutes: ${totalMinutes}
• Current Streak: ${streak} days
• Weekly Progress: ${store.weekProgressPercent}%

${latest ? `💪 Latest Workout:
• ${latest.name} - ${latest.duration}
${plan?.exercises ? plan.exercises.map(e => `• ${e.name}: ${e.duration}s × ${e.sets} sets`).join('\n') : ''}
• ${latest.rounds} rounds completed` : ''}

Keep pushing! 💪🔥`

  // Try native share API first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Kardio Workout Summary',
        text: summaryText,
      })
      return
    } catch {
      // User cancelled or failed, fall back to clipboard
    }
  }

  // Fall back to clipboard
  try {
    await navigator.clipboard.writeText(summaryText)
    alert('Summary copied to clipboard!')
  } catch {
    alert('Unable to share. Try manually copying your stats.')
  }
}
</script>

<style scoped>
.history-view {
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

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

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

/* 30-Day Progress Chart */
.progress-chart {
  padding: 16px;
}

.progress-chart-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-line-svg {
  width: 100%;
  height: 100px;
  overflow: visible;
}

.progress-chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

/* Day Row */
.day-row {
  display: flex;
  gap: 6px;
  justify-content: space-between;
}

.day-btn {
  flex: 1;
  padding: 10px 4px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.day-btn:hover:not(.active) {
  background: var(--bg-primary);
}

.day-btn.has-session {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-glow);
}

.day-btn.active {
  background: var(--accent-primary);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(88, 86, 214, 0.35);
}

.day-btn.today {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
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
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-value small {
  font-size: 16px;
  font-weight: 700;
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* Chart */
.chart-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.chart-area {
  height: 100px;
  margin-top: 8px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 4px;
}

.chart-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 4px;
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  background: var(--border-color);
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.5s ease, background 0.2s ease;
  opacity: 0.8;
  position: relative;
}

.bar-active {
  background: var(--accent-primary);
  opacity: 1;
}

.bar-date {
  font-size: 9px;
  color: var(--text-tertiary);
  white-space: nowrap;
  font-weight: 500;
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--text-primary);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: 4px;
  margin-bottom: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
}

.bar-wrapper:hover .bar-tooltip {
  opacity: 1;
}

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.session-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.session-note {
  font-size: 11px;
  color: var(--accent-primary);
  font-style: italic;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.btn-delete {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.btn-delete:hover {
  background: #ffebee;
  color: var(--color-run);
}

.badge-partial {
  background: #fff3e0;
  color: var(--color-partial);
}

.badge-complete {
  background: #e8f5e9;
  color: var(--color-walk);
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

/* Streak Reminder Banner */
.reminder-banner {
  background: linear-gradient(135deg, #ff9500 0%, #ff6b35 100%);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.reminder-banner:hover {
  transform: translateY(-2px);
}

.reminder-icon {
  font-size: 24px;
}

.reminder-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
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
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.reminder-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Weekly Goal Card */
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

.goal-icon {
  font-size: 18px;
}

.btn-edit {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
}

.btn-edit:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.goal-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
}

.goal-input {
  width: 60px;
  padding: 6px 8px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  background: var(--bg-card);
  color: var(--text-primary);
}

.goal-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.goal-unit {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-save {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-save:hover {
  background: var(--accent-secondary);
}

.goal-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar-bg {
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-bar-fill.goal-reached {
  background: linear-gradient(90deg, #34c759 0%, #30d158 100%);
}

.goal-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.goal-current {
  font-weight: 700;
  color: var(--text-primary);
}

.goal-target {
  color: var(--text-secondary);
}

.goal-badge {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: #34c759;
}

/* Personal Records */
.records-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.record-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 14px 10px;
  text-align: center;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: transform 0.2s ease;
}

.record-card:hover {
  transform: translateY(-2px);
}

.record-icon {
  font-size: 22px;
  margin-bottom: 2px;
}

.record-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-primary);
}

.record-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
