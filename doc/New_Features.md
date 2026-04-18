Current Features
Timer with phases (warmup → exercise → rest → cooldown), circular dial, pause/resume/stop
Plans — create/edit/delete custom plans with exercises, sets, durations, rest periods, favorites
History — session log, stats, personal records, streak, weekly progress, share/export CSV
Dark mode, audio feedback, mute toggle
Potential New Features
High Impact

🔔 Notifications / Reminders — Daily workout reminders at a set time using Web Notifications API
📊 Charts & Graphs — Visual weekly/monthly activity charts (bar chart for minutes per day, line chart for streaks)
🎵 Custom Audio Cues — Let users pick different sounds for phase transitions (beep, voice, tone)
⏱️ Countdown Voice — "3, 2, 1" spoken countdown before each phase starts (Web Speech API)
📱 PWA Install — Make it installable with offline support, service worker, and app manifest
Medium Impact

🏆 Achievements / Badges — Unlock badges (first workout, 7-day streak, 100 total minutes, etc.)
📋 Workout Notes — Add notes per session (already partially in the model via nextWorkoutNote)
🔄 Duplicate Plan — Clone an existing plan as a starting point for a new one
📱 Screen Wake Lock — Keep screen on during workout using Wake Lock API
⏲️ Halfway Alert — Sound/vibration cue at the midpoint of each exercise phase
Nice-to-Have

🎨 Custom Accent Colors — Let users pick their accent color beyond the default purple
📥/📤 Import/Export Plans — Share plan configs via JSON or QR code
🌐 Multi-language — i18n support for broader reach
🎯 Weekly Goals — Customizable weekly target (partially exists as weeklyTargetMinutes)
💪 Exercise Library — Browse a built-in library of exercises with descriptions and form tips