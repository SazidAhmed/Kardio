# Cardio/Lifting Mode Separation Plan

Create a clean separation between Cardio and Weight Lifting modes with distinct navigation, views, and data stores for each mode.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      AppHeader                              │
│   [Kardio Logo]    [Cardio 🔥] [Lifting 💪]    [Dark Mode]  │
│                    Mode Switcher Buttons                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Main Content                           │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  CARDIO MODE:                                         │   │
│  │  - TimerView (workout timer with intervals)         │   │
│  │  - CardioPlansView (cardio workout plans)             │   │
│  │  - CardioHistoryView (cardio session history/stats)   │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  LIFTING MODE:                                        │   │
│  │  - LiftPlansView (lifting routines)                   │   │
│  │  - LiftHistoryView (lifting session history/stats)    │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BottomNav                              │
│   CARDIO: [Timer] [Plans] [History]                         │
│   LIFTING: [Plans] [History]                                │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Create Mode Store (stores/mode.ts)
- Manage `currentMode: 'cardio' | 'lifting'`
- Persist to localStorage
- Provide mode switching actions
- Track active tab per mode (cardioTab, liftingTab)

### 2. Update AppHeader (components/layout/AppHeader.vue)
- Replace separate Cardio/Lifting buttons with unified mode switcher
- Show active mode with visual highlight
- Remove dark mode button from header (can be moved elsewhere or kept)

### 3. Update BottomNav (components/layout/BottomNav.vue)
- Accept `currentMode` as prop
- Show different tabs based on mode:
  - Cardio: Timer, Plans, History
  - Lifting: Plans, History (no Timer)
- Map tab clicks to the correct mode-specific tab state

### 4. Create Mode-Specific History Views
- Rename current `HistoryView.vue` → `CardioHistoryView.vue`
- Create new `LiftHistoryView.vue` based on lifting data from `lift.ts` store
- Lift history should show: volume, sets, exercise breakdowns (different stats than cardio)

### 5. Rename/Rename Views for Clarity
- `PlansView.vue` → `CardioPlansView.vue` (for Cardio mode)
- Keep `LiftView.vue` → rename to `LiftPlansView.vue` for consistency

### 6. Update app.vue Structure
- Use mode store to determine which view set to render
- Structure:
  ```
  if (mode === 'cardio'):
    - CardioTimerView (if tab === 'timer')
    - CardioPlansView (if tab === 'plans')
    - CardioHistoryView (if tab === 'history')
  if (mode === 'lifting'):
    - LiftPlansView (if tab === 'plans')
    - LiftHistoryView (if tab === 'history')
  ```

### 7. Data Store Separation
- `workout.ts` → rename/keep as cardio store
- `lift.ts` → already exists, ensure it has all history data needed
- Each store maintains its own localStorage keys

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `stores/mode.ts` | Create | New store for mode management |
| `app.vue` | Modify | Use mode store, conditionally render views |
| `components/layout/AppHeader.vue` | Modify | Mode switcher UI |
| `components/layout/BottomNav.vue` | Modify | Dynamic tabs based on mode |
| `components/views/HistoryView.vue` | Rename → `CardioHistoryView.vue` | Cardio-specific history |
| `components/views/LiftHistoryView.vue` | Create | Lifting-specific history |
| `components/views/PlansView.vue` | Rename → `CardioPlansView.vue` | Cardio plans |
| `components/views/LiftView.vue` | Rename → `LiftPlansView.vue` | Lifting plans |

## Data Flow

1. **Mode Switching:**
   - User clicks mode button in header
   - `modeStore.setMode('cardio' | 'lifting')` updates state + localStorage
   - `app.vue` re-renders with mode-specific views
   - `BottomNav` updates to show mode-appropriate tabs

2. **Tab Navigation:**
   - Each mode has its own tab state (cardioTab, liftingTab)
   - Switching modes restores the last active tab for that mode
   - Tab changes only affect the current mode's tab state

3. **Data Isolation:**
   - Cardio data stays in `workout.ts` store (localStorage: `cardioflow-*`)
   - Lifting data stays in `lift.ts` store (localStorage: `lift-*`)
   - No cross-contamination between modes

## Visual Design

- **Mode Switcher in Header:**
  - Two pill-shaped buttons side by side
  - Active mode: filled background with primary color
  - Inactive mode: outline/ghost style
  - Icons: 🔥 for Cardio, 💪 for Lifting

- **Bottom Navigation:**
  - Cardio: 3 tabs (Timer, Plans, History)
  - Lifting: 2 tabs (Plans, History) - centered or evenly spaced

## LocalStorage Keys

| Key | Purpose |
|-----|---------|
| `kardio-mode` | 'cardio' or 'lifting' |
| `kardio-cardio-tab` | Last active tab in cardio mode |
| `kardio-lifting-tab` | Last active tab in lifting mode |
| `cardioflow-history` | Cardio workout history (existing) |
| `lift-history` | Lifting workout history (existing) |

## Acceptance Criteria

- [ ] User can switch between Cardio and Lifting modes via header
- [ ] Selected mode persists across app restarts
- [ ] Cardio mode shows: Timer, Plans, History tabs
- [ ] Lifting mode shows: Plans, History tabs (no Timer)
- [ ] Each mode's history view shows only its own workout data
- [ ] Plans in each mode are completely separate
- [ ] Visual indication clearly shows which mode is active
- [ ] Switching modes remembers the last tab used in that mode
