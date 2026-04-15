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