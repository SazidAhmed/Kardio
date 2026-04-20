# AI Integration Handoff

## Status

Gemini integration is now beyond the original Phase 1 snapshot.

Current state:
- Gemini-based AI planner is implemented and building successfully.
- request parsing and response normalization were hardened server-side
- prompt safety and output-shape instructions were tightened
- `AiPlannerSheet.vue` now has loading, clearer errors, and retry behavior
- the app now has a dedicated `AI` tab and hub view instead of only exposing the planner from plan screens
- AI generations are now persisted locally in a dedicated AI history store
- generated cardio and lift plans can still be saved into the existing Pinia stores

## What Was Done This Session

### Backend hardening

`server/api/ai/generate-routines.post.ts` now:
- parses the request defensively instead of trusting `readBody<T>()`
- validates profile/image/context payloads from `unknown`
- clamps numeric inputs to sane ranges
- limits and sanitizes recent cardio/lift history before sending to Gemini
- validates Gemini output more defensively before normalizing it
- returns a cleaner `502` if Gemini returns malformed JSON

### Prompt improvements

The Gemini prompt was updated to:
- avoid medical inference from photos
- explicitly lower confidence when uncertain
- respect injuries/limitations more conservatively
- prefer practical routine sizes
- keep summaries short and array fields concise
- keep output closer to the expected app shape

### Frontend planner UX

`components/ai/AiPlannerSheet.vue` now:
- shows an in-progress status card while generating
- disables the form during submission
- has better upload failure handling
- extracts server `statusMessage` values more cleanly
- supports retrying failed generations without forcing the user to re-enter everything

### Dedicated AI entry point

The app now has a dedicated AI hub:
- new `AI` tab persisted in `stores/mode.ts`
- new nav item in `components/layout/BottomNav.vue`
- new shared AI landing view in `components/views/AiHubView.vue`
- `app.vue` routes both cardio and lifting modes to that AI view when `activeTab === 'ai'`

The old duplicated AI launchers were removed from:
- `components/views/CardioPlansView.vue`
- `components/views/LiftPlansView.vue`

### AI generation history

A new local AI history layer was added:
- new store: `stores/ai.ts`
- successful generations are recorded automatically
- each record stores:
  - profile snapshot
  - normalized AI result
  - generation timestamp
  - whether cardio and/or lift plans were saved
- saving cardio or lift plans updates the corresponding history record
- the AI tab now shows recent generations, confidence, focus areas, and saved status
- users can remove individual history items or clear all AI history

## Main Files

- [nuxt.config.ts](h:/Vue/Cardio/nuxt.config.ts)
- [types/ai.ts](h:/Vue/Cardio/types/ai.ts)
- [server/api/ai/generate-routines.post.ts](h:/Vue/Cardio/server/api/ai/generate-routines.post.ts)
- [components/ai/AiPlannerSheet.vue](h:/Vue/Cardio/components/ai/AiPlannerSheet.vue)
- [components/views/AiHubView.vue](h:/Vue/Cardio/components/views/AiHubView.vue)
- [stores/ai.ts](h:/Vue/Cardio/stores/ai.ts)
- [components/layout/BottomNav.vue](h:/Vue/Cardio/components/layout/BottomNav.vue)
- [stores/mode.ts](h:/Vue/Cardio/stores/mode.ts)
- [app.vue](h:/Vue/Cardio/app.vue)

## Config Notes

### Environment

Expected env var:

```env
GEMINI_API_KEY=your_key_here
```

### Nuxt config

Current relevant config:
- `runtimeConfig.geminiApiKey` is set from `process.env.GEMINI_API_KEY`
- `experimental.appManifest = false`

`appManifest` was disabled earlier because dev server was throwing:

`Failed to resolve import "#app-manifest"`

This is separate from the normal PWA manifest in `public/manifest.json`.

## Current Flow

### AI Hub

`components/views/AiHubView.vue`:
- is the main entry point for AI generation
- shows counts for saved cardio plans, lift routines, and recent sessions
- displays recent cardio and lifting history as visible context
- shows persisted AI generation history
- shows whether each generated cardio/lift plan was actually saved
- allows clearing individual AI history records or all AI history
- opens `AiPlannerSheet.vue`

### Planner sheet

`components/ai/AiPlannerSheet.vue`:
- uploads 1-3 images
- resizes/compresses images locally to JPEG with canvas
- collects profile fields:
  - age
  - sex
  - heightCm
  - weightKg
  - goal
  - experience
  - equipment
  - injuries
  - daysPerWeek
- attaches recent workout context from:
  - `workoutStore.history`
  - `liftStore.history`
- posts to `/api/ai/generate-routines`
- shows loading state while Gemini is running
- shows a clearer error card on failure
- allows retrying failed requests
- previews:
  - `analysis`
  - `cardioPlan`
  - `liftPlan`
- records successful generations into `useAiStore()`
- saves output with:
  - `workoutStore.createPlan(...)`
  - `liftStore.createPlan(...)`
- updates AI history when cardio or lift plans are saved

### Backend route

`server/api/ai/generate-routines.post.ts`:
- reads `GEMINI_API_KEY` from runtime config
- validates and sanitizes request payloads
- limits images to 3
- supports jpeg/png/webp inputs
- builds a stricter safety-oriented Gemini prompt
- sends images as inline base64 data
- requests JSON output
- extracts JSON defensively
- normalizes Gemini output into safe fallback app objects

## Known Limitations

- no DB persistence for AI requests or results
- no auth/user ownership around generated plans
- no cloud image storage; requests still use base64 inline payloads
- no user review/edit workflow before saving generated plans into stores
- no analytics/logging for prompt failures or malformed generations
- no live E2E verification of the AI flow in repo docs
- server-side validation is hand-rolled, not yet backed by a formal schema library like `zod`
- current AI history is local-only and device-specific

## Recommended Next Steps

### Highest value next

1. Persist AI generations and summaries to backend storage.
2. Add an edit/review flow before saving generated plans directly into cardio/lift stores.
3. Add structured logging around Gemini failures, malformed output, and request timings.
4. Consider replacing hand-rolled validation with a formal schema layer if the AI payload grows.

### After that

1. Move image handling off inline base64 and into external/object storage.
2. Replace local-only AI history with backend-backed synced history if the app gains auth/storage.
3. Add prompt/version metadata so future prompt changes are traceable.
4. Add live E2E coverage for upload -> generate -> save flows.

## Build / Recovery Notes

Current build check:

```bash
npm run build
```

Build is passing after the latest changes.

Known build output:
- there are still existing Vite warnings about `stores/workout.ts` and `stores/lift.ts` being both dynamically and statically imported
- those warnings are unrelated to the Gemini feature work done here

If dev server shows stale manifest/cache issues again:

```powershell
if (Test-Path '.nuxt') { Remove-Item .nuxt -Recurse -Force }
if (Test-Path '.output') { Remove-Item .output -Recurse -Force }
if (Test-Path 'node_modules\.vite') { Remove-Item 'node_modules\.vite' -Recurse -Force }
npm run dev
```

## Notes For Next Session

Start from the AI hub and persistence questions, not from initial integration.

The original handoff next steps are mostly done:
- stronger server-side validation: done
- better prompt safety wording: done
- better loading/error/retry UI: done
- dedicated AI tab/entry: done
- AI history in the AI tab: done locally

The next meaningful milestone is turning this from a local-only AI generator into a more durable feature with backend persistence, review/edit flow, and observability.
