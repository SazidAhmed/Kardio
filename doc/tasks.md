CardioFlow - Task List

Phase 1: Project Setup
Initialize Nuxt 3 project in h:/Vue/Cardio
Install Tailwind CSS
Install and configure shadcn-vue
Install Pinia, lucide-vue-next
Configure fonts (Inter), global styles, color tokens

Phase 2: Core Layout
Create components/layout/Header.vue
Create components/layout/BottomNav.vue
Create root app.vue with layout shell

Phase 3: Timer View
Create workout preset cards (Beginner, Fat Burn, HIIT Beast, Custom)
Create stepper component for duration settings
Create timer dial (circular progress)
Create phase tags (WARMUP, RUN, WALK, COOLDOWN)
Wire up Start/Pause/Reset logic with Pinia

Phase 4: History View
Create weekly day selector (Mon–Sun row)
Create stats summary cards (Streak, Sessions, Total)
Create weekly minutes bar chart
Create workout session list items with PARTIAL tag

Phase 5: Polish & Verification
Ensure mobile-first responsive layout
Apply micro-animations and hover states
Start dev server and verify in browser

Phase 6: 

Audio & Feedback

Phase change beeps - Countdown 3-2-1 beeps before each phase transition
Voice announcements - "Start running", "Walk now", "Workout complete"
Vibration alerts - For mobile users when phases change
Goals & Motivation

Weekly minute targets - Set and track weekly workout minute goals (e.g., 150 min/week)
Personal records - Longest workout, most rounds completed badges
Streak reminders - Notification if you haven't worked out in 2 days
Workout Enhancements

Rest between rounds - Add optional rest period between each run/walk cycle
Favorite workouts - Star/save custom configurations for quick access
Workout notes - Add a text field to log how you felt after each session
Data & Export

Export to CSV - Download workout history for spreadsheet analysis
Share workout - Generate a shareable summary image (similar to fitness apps)
Progress chart - Line chart showing total minutes over last 30 days
Quick Wins

Dark mode - Toggle for dark theme
Landscape timer - Larger timer view when phone is rotated