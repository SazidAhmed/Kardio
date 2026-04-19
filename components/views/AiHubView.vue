<template>
  <div class="ai-view">
    <section class="hero-card">
      <div class="hero-copy">
        <span class="hero-badge">Gemini Planner</span>
        <h2>Generate cardio and lifting drafts from your body photos</h2>
        <p>
          Upload up to 3 images, describe your goal and equipment, and save the generated plans into the existing cardio and lifting libraries.
        </p>
      </div>
      <button class="hero-action" @click="openPlanner">
        Open AI Planner
      </button>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-label">Cardio plans</span>
        <strong class="summary-value">{{ workoutStore.plans.length }}</strong>
        <p class="summary-text">Saved workout plans currently available to launch from Timer.</p>
      </article>
      <article class="summary-card">
        <span class="summary-label">Lift routines</span>
        <strong class="summary-value">{{ liftStore.plans.length }}</strong>
        <p class="summary-text">Saved strength routines ready to edit, start, or replace with AI drafts.</p>
      </article>
      <article class="summary-card">
        <span class="summary-label">Recent sessions</span>
        <strong class="summary-value">{{ recentSessionCount }}</strong>
        <p class="summary-text">Recent cardio and lifting history used as context for more grounded AI suggestions.</p>
      </article>
    </section>

    <section class="detail-card">
      <div class="detail-header">
        <div>
          <p class="section-eyebrow">How It Works</p>
          <h3>What the planner uses</h3>
        </div>
        <button class="secondary-btn" @click="openPlanner">Generate Now</button>
      </div>

      <div class="detail-list">
        <div class="detail-item">
          <span class="detail-number">01</span>
          <div>
            <h4>Body photos</h4>
            <p>Front, side, and back photos are resized locally before they are sent.</p>
          </div>
        </div>
        <div class="detail-item">
          <span class="detail-number">02</span>
          <div>
            <h4>Profile inputs</h4>
            <p>Goal, training experience, available equipment, and limitations are used to keep the output practical.</p>
          </div>
        </div>
        <div class="detail-item">
          <span class="detail-number">03</span>
          <div>
            <h4>Workout history</h4>
            <p>Recent cardio and lifting sessions are attached so the model does not ignore your current level.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="detail-card">
      <div class="detail-header">
        <div>
          <p class="section-eyebrow">Recent Context</p>
          <h3>Latest sessions the AI can learn from</h3>
        </div>
      </div>

      <div class="history-columns">
        <div class="history-card">
          <h4>Cardio</h4>
          <div v-if="recentCardio.length" class="history-list">
            <div v-for="session in recentCardio" :key="`${session.date}-${session.name}`" class="history-item">
              <span>{{ session.name }}</span>
              <small>{{ session.duration }} · {{ session.status }}</small>
            </div>
          </div>
          <p v-else class="empty-copy">No recent cardio sessions yet.</p>
        </div>

        <div class="history-card">
          <h4>Lifting</h4>
          <div v-if="recentLift.length" class="history-list">
            <div v-for="session in recentLift" :key="`${session.date}-${session.planName}`" class="history-item">
              <span>{{ session.planName }}</span>
              <small>{{ session.duration }} · {{ session.totalVolume }}kg</small>
            </div>
          </div>
          <p v-else class="empty-copy">No recent lifting sessions yet.</p>
        </div>
      </div>
    </section>

    <section class="detail-card">
      <div class="detail-header">
        <div>
          <p class="section-eyebrow">AI History</p>
          <h3>Recent generations</h3>
        </div>
        <button v-if="aiStore.history.length" class="secondary-btn" @click="aiStore.clearHistory()">Clear History</button>
      </div>

      <div v-if="aiStore.history.length" class="generation-list">
        <article v-for="item in aiStore.history.slice(0, 8)" :key="item.id" class="generation-card">
          <div class="generation-head">
            <div>
              <h4>{{ item.result.analysis.summary }}</h4>
              <p class="generation-meta">
                {{ formatDate(item.createdAt) }} · Goal: {{ item.profile.goal }}
              </p>
            </div>
            <span class="confidence-pill">{{ item.result.analysis.confidence }}</span>
          </div>

          <div class="generation-plan-row">
            <span>{{ item.result.cardioPlan.name }}</span>
            <small :class="{ saved: item.savedTargets.cardio }">
              {{ item.savedTargets.cardio ? 'Cardio saved' : 'Cardio not saved' }}
            </small>
          </div>
          <div class="generation-plan-row">
            <span>{{ item.result.liftPlan.name }}</span>
            <small :class="{ saved: item.savedTargets.lift }">
              {{ item.savedTargets.lift ? 'Lift saved' : 'Lift not saved' }}
            </small>
          </div>

          <div class="generation-tags">
            <span v-for="focus in item.result.analysis.focusAreas.slice(0, 3)" :key="focus" class="generation-tag">
              {{ focus }}
            </span>
          </div>

          <button class="history-delete" @click="aiStore.deleteHistoryItem(item.id)">Remove</button>
        </article>
      </div>

      <p v-else class="empty-copy">No AI generations saved yet. Run the planner once and the result history will appear here.</p>
    </section>

    <AiPlannerSheet :open="showAiPlanner" @close="showAiPlanner = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWorkoutStore } from '~/stores/workout'
import { useLiftStore } from '~/stores/lift'
import { useAiStore } from '~/stores/ai'

const workoutStore = useWorkoutStore()
const liftStore = useLiftStore()
const aiStore = useAiStore()

const showAiPlanner = ref(false)

const recentCardio = computed(() => workoutStore.history.slice(0, 4))
const recentLift = computed(() => liftStore.history.slice(0, 4))
const recentSessionCount = computed(() => recentCardio.value.length + recentLift.value.length)

function openPlanner() {
  showAiPlanner.value = true
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.ai-view {
  width: 100%;
  padding: 0 16px 100px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card,
.summary-card,
.detail-card,
.history-card,
.generation-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 22px;
}

.hero-card {
  padding: 22px;
  background:
    radial-gradient(circle at top left, rgba(88, 86, 214, 0.22), transparent 44%),
    radial-gradient(circle at bottom right, rgba(52, 199, 89, 0.14), transparent 36%),
    var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-badge,
.section-eyebrow {
  display: inline-block;
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent-primary);
}

.hero-copy h2,
.detail-header h3,
.history-card h4 {
  margin: 0;
  color: var(--text-primary);
}

.hero-copy h2 {
  font-size: 26px;
  line-height: 1.1;
}

.hero-copy p,
.summary-text,
.detail-item p,
.empty-copy {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 13px;
}

.hero-action,
.secondary-btn {
  align-self: flex-start;
  padding: 12px 16px;
  border-radius: 999px;
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.secondary-btn {
  background: transparent;
  border: 1.5px solid var(--accent-primary);
  color: var(--accent-primary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 16px;
}

.summary-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.summary-value {
  display: block;
  margin-top: 10px;
  font-size: 28px;
  line-height: 1;
  color: var(--text-primary);
}

.detail-card {
  padding: 18px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border-color);
}

.detail-item:first-child {
  border-top: none;
  padding-top: 0;
}

.detail-item h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
}

.detail-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--accent-glow);
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.history-card {
  padding: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--bg-primary);
}

.history-item span {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.history-item small {
  color: var(--text-secondary);
  font-size: 12px;
}

.generation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.generation-card {
  padding: 16px;
}

.generation-head,
.generation-plan-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.generation-head h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
}

.generation-meta {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.confidence-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--accent-glow);
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.generation-plan-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.generation-plan-row span {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.generation-plan-row small {
  color: #ff9500;
  font-size: 12px;
  font-weight: 600;
}

.generation-plan-row small.saved {
  color: #34c759;
}

.generation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.generation-tag {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.history-delete {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 420px) {
  .summary-grid,
  .history-columns {
    grid-template-columns: 1fr;
  }

  .detail-header,
  .generation-head,
  .generation-plan-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-copy h2 {
    font-size: 22px;
  }

  .hero-action,
  .secondary-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
