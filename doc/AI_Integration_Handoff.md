# AI Integration Handoff

## Status

Phase 1 Gemini-based AI planner is implemented and building successfully.

The feature currently:
- opens from both cardio plans and lifting plans screens
- accepts up to 3 body photos
- collects profile data
- resizes/compresses images client-side before upload
- sends photos + profile + recent workout history to a Nuxt server API route
- calls Gemini server-side using `GEMINI_API_KEY`
- returns normalized JSON for:
  - `analysis`
  - `cardioPlan`
  - `liftPlan`
- lets the user save cardio and lift plans into the existing Pinia stores

## Main Files

- [nuxt.config.ts](/h:/Vue/Cardio/nuxt.config.ts)
- [types/ai.ts](/h:/Vue/Cardio/types/ai.ts)
- [server/api/ai/generate-routines.post.ts](/h:/Vue/Cardio/server/api/ai/generate-routines.post.ts)
- [components/ai/AiPlannerSheet.vue](/h:/Vue/Cardio/components/ai/AiPlannerSheet.vue)
- [components/views/CardioPlansView.vue](/h:/Vue/Cardio/components/views/CardioPlansView.vue)
- [components/views/LiftPlansView.vue](/h:/Vue/Cardio/components/views/LiftPlansView.vue)

## Config Notes

### Environment

Expected env var:

```env
GEMINI_API_KEY=your_key_here
```

### Nuxt config

Current relevant config:
- `runtimeConfig.geminiApiKey` added
- `experimental.appManifest = false`

`appManifest` was disabled because dev server was throwing:

`Failed to resolve import "#app-manifest"`

This is separate from the app's normal PWA manifest in `public/manifest.json`.

## Current Flow

### Frontend

`AiPlannerSheet.vue`:
- uploads 1-3 images
- compresses them to jpeg using canvas
- gathers profile fields:
  - age
  - sex
  - heightCm
  - weightKg
  - goal
  - experience
  - equipment
  - injuries
  - daysPerWeek
- includes recent workout context from:
  - `workoutStore.history`
  - `liftStore.history`
- posts to `/api/ai/generate-routines`
- previews analysis and generated plans
- saves to existing stores with:
  - `workoutStore.createPlan(...)`
  - `liftStore.createPlan(...)`

### Backend

`server/api/ai/generate-routines.post.ts`:
- reads `GEMINI_API_KEY` from runtime config
- validates request shape
- limits images to 3
- supports jpeg/png/webp inputs
- builds a prompt for Gemini
- sends images as inline base64 data
- requests JSON output
- extracts and normalizes the response
- returns safe fallback-normalized plan objects

## Existing Limitations

- no DB persistence for AI requests/results
- no auth
- no cloud image storage
- no saved AI history
- no dedicated AI tab yet
- no hard guarantee Gemini returns ideal exercise programming
- no live E2E verification included in repo docs

## Recommended Next Steps

### Highest value

1. Add stronger server-side response validation with a stricter schema check.
2. Improve prompt quality and safety wording for more reliable plans.
3. Add better loading/error/retry UI in `AiPlannerSheet.vue`.
4. Add a dedicated `AI` entry/tab instead of only opening from plan screens.

### After that

1. Persist generated plans/analysis to backend storage.
2. Add image upload to external storage instead of base64-only requests.
3. Add user review/edit flow before saving.
4. Add analytics/logging for failed generations.

## Build / Recovery Notes

Build was passing after implementation:

```bash
npm run build
```

If dev server shows stale manifest/cache issues again:

```powershell
if (Test-Path '.nuxt') { Remove-Item .nuxt -Recurse -Force }
if (Test-Path '.output') { Remove-Item .output -Recurse -Force }
if (Test-Path 'node_modules\.vite') { Remove-Item 'node_modules\.vite' -Recurse -Force }
npm run dev
```

## Summary

This repo now has a working Phase 1 AI planner for generating cardio and lifting drafts from body photos using Gemini through a secure Nuxt server route.
