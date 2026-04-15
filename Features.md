Audio & Feedback is now fully implemented:

Features:

Phase change beeps - Countdown 3-2-1 beeps (ascending pitch) for last 3 seconds of each phase
Voice announcements - "Warm up", "Start running", "Walk now", "Cool down", "Workout complete! Great job!"
Vibration alerts - Short vibration patterns on mobile for phase changes and countdown
Mute toggle button - Speaker icon in top-right of timer section to enable/disable all audio
How it works:

Beeps: Web Audio API generates tones (no external files needed)
Voice: Web Speech API for text-to-speech
Vibration: Navigator.vibrate API (mobile only)
All respect the mute state - when muted, only visuals work (no sound/vibration)


implemented:

Weekly Minute Targets:

Progress bar showing current week minutes vs target (default 150 min)
Edit button (pencil icon) to customize target
Green progress bar when goal is reached with celebration message
Personal Records Badges:

🏆 Longest Workout - tracks max workout duration
⚡ Most Rounds - tracks max rounds completed in a session
🔥 Longest Streak - tracks all-time best consecutive days
Streak Reminders:

Orange banner appears when no workout for 2+ days
Shows "Keep your streak alive!" message with day count
Click banner or X button to dismiss
Auto-updates last workout date on each completed session
Data Persistence:

All settings and records saved to localStorage
Automatically loads on app startup

implemented:

Rest Between Rounds:

New REST config card in timer settings (optional, default 0s)
Purple colored rest phase (#af52de)
When enabled, rest period is inserted between walk and next round's run
Audio announcement says "Rest" during phase change
Favorite Workouts:

Star button on each preset card to toggle favorite
Favorited presets get orange border and light orange background
Star turns orange when favorited
Favorites are saved to localStorage
Workout Notes:

Textarea appears when idle (before workout) or finished (after workout)
Idle: "Notes for next workout"
Finished: "How did it go?"
Notes are saved on blur and attached to completed sessions
Notes display in history session cards with 💬 icon
Export to CSV:

"Export CSV" button in session history header
Downloads all workouts with columns: Date, Time, Name, Rounds, Duration, Status, Note
Filename includes date: cardioflow-workouts-YYYY-MM-DD.csv
Data Persistence:

All favorites, notes, rest settings persist in localStorage

...

New Workout Flow
Example: 3 exercises (Plank, Squats, Push-ups) with 3 sets each:

Warmup (30s)
Plank Set 1 (60s) → Rest (30s) → Plank Set 2 (60s) → Rest (30s) → Plank Set 3 (60s)
Rest between exercises (60s)
Squats Set 1 (45s) → Rest (30s) → Squats Set 2 (45s) → Rest (30s) → Squats Set 3 (45s)
Rest between exercises (60s)
Push-ups Set 1 (30s) → Rest (30s) → Push-ups Set 2 (30s) → Rest (30s) → Push-ups Set 3 (30s)
Cooldown (30s)
What's Changed
Timer View
Shows "SETS PER EXERCISE" instead of "ROUNDS"
Displays "Set X/Y" during workout
Shows exercise count in summary
Plans View
New default exercise: Plank (1 min) with 3 sets
Two rest settings:
Rest Between Sets - rest between sets of the same exercise
Rest Between Exercises - rest when switching to next exercise
Duration calculation updated for set-based timing

.....

Timer View:

Removed global "Rounds" card
Each exercise card now shows:
Duration (with stepper)
Sets (with stepper)
Displays "Set X/Y" during workout (Y is from current exercise)
Shows "Rest Between Sets" card instead of "Rest Between Rounds"
Plans View:

Removed global "Rounds" setting
Each exercise in editor has:
Name input
Duration (seconds)
Sets input
Plan list shows "X sets total" (sum of all exercise sets)
Duration calculations use per-exercise sets
Example Flow
Plank (3 sets): Plank → Rest → Plank → Rest → Plank Rest between exercises Squats (2 sets): Squats → Rest → Squats
Rest between exercises Push-ups (3 sets): Push-ups → Rest → Push-ups → Rest → Push-ups Cooldown