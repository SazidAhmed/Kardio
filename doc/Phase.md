Phase 1 Gemini integration is in place.

Task 1:

I added a secure server route at **generate-routines.post.ts** that reads **GEMINI_API_KEY** from server runtime config in **nuxt.config.ts**, sends the uploaded body photos plus profile data to Gemini, and normalizes the response into strict app-friendly JSON defined in **ai.ts**.

On the frontend, I added a reusable planner sheet at **AiPlannerSheet.vue**. It lets the user upload up to 3 photos, enter the default fitness fields, preview the returned analysis/cardio/lift plans, and save each plan directly into your existing Pinia stores. I wired entry points into both **CardioPlansView.vue** and **LiftPlansView.vue**.

Verification: **npm run build** passed. I did not make a live Gemini API call from here, so you should restart the dev server after adding **.env** and test one real generation in the app. If you want, I can do the next pass for better prompts, error states, and persisted plan history/storage.



Task 2:

I extended the integration in two useful areas.

The server route now validates the payload more strictly and accepts recent workout context, so Gemini can tailor the routines against the user’s recent cardio and lifting history instead of treating every request as a cold start. That change is in **ai.ts** and **generate-routines.post.ts**.

The planner UI in **AiPlannerSheet.vue** now resizes photos locally before upload, includes recent training history in the request, and adds a **Save Both Plans** action so the generated cardio and lift plans can be saved together in one step. This keeps the payload smaller, reduces failed requests, and improves plan quality.

Verification: **npm run build** passed again. The remaining warnings are the same existing chunking warnings around dynamic vs static imports of your Pinia stores; they are not blocking this feature.



Task 3:

I picked up the Gemini work and implemented the first high-value follow-up from the handoff: stricter server-side validation in **generate-routines.post.ts**.

The route now parses the request defensively instead of trusting **readBody`<T>`()**, validates and clamps profile values, validates image objects and MIME types, sanitizes recent workout context, and normalizes Gemini output only after checking object/array shapes. It also now throws a cleaner **502** when Gemini returns malformed JSON instead of letting **JSON.parse** fail unwrapped.

**npm run build** passes. The only build output worth noting was the existing Vite chunking warnings around **stores/workout.ts** and **stores/lift.ts**; they’re unrelated to this Gemini change.


Task 4:


I continued the Gemini integration in two places.

In **server/api/ai/generate-routines.post.ts (line 47)**, the prompt is now more explicit about safety and reliability: it tells Gemini not to infer medical conditions from images, to lower confidence when uncertain, to avoid aggravating reported limitations, and to keep output tighter and more structured. The route still uses the stricter request/response validation added earlier, and malformed JSON is still handled cleanly at **generate-routines.post.ts (line 381)**.

In **components/ai/AiPlannerSheet.vue (line 21)**, I added a real in-progress state, disabled the form while a request is running, improved upload failure handling, and added retry paths that reuse the existing inputs instead of forcing a re-upload. Error extraction is also better now, so server **statusMessage** responses surface correctly in the sheet at **AiPlannerSheet.vue (line 276)** and **AiPlannerSheet.vue (line 393)**.

**npm run build** passes. The only remaining output was the same existing Vite warnings about mixed static/dynamic imports for **stores/workout.ts** and **stores/lift.ts**.


Task 5:


I added a dedicated **AI** tab and hub view instead of keeping the planner only inside the plans screens.

The new entry point is wired through the persisted tab state in **stores/mode.ts (line 4)**, rendered from **app.vue (line 32)**, and exposed in the bottom nav via **components/layout/BottomNav.vue (line 39)**. The hub itself is **components/views/AiHubView.vue (line 1)**: it gives the Gemini planner its own page, shows quick summary/context info from cardio and lifting history, and opens the existing **AiPlannerSheet**.

I also removed the duplicated AI launcher/banner from the cardio and lifting plans screens so there’s one primary place to enter the feature. **npm run build** passes. The only remaining output is the same existing Vite warning about mixed static/dynamic imports for **stores/workout.ts** and **stores/lift.ts**.


Task 6:


I continued the AI work by adding persisted local AI generation history.

I created a dedicated Pinia store in **stores/ai.ts** that saves the latest AI generations to localStorage. Each history item stores the generation timestamp, the submitted profile snapshot, the normalized AI result, and whether the generated cardio and lift plans were actually saved into the workout stores.

I wired **components/ai/AiPlannerSheet.vue** so every successful generation is automatically recorded, and when the user saves the cardio or lift plan, that history entry is updated to reflect the saved status. I also updated **app.vue** to load AI history on startup.

In **components/views/AiHubView.vue**, the AI tab now shows a recent generations section with the analysis summary, confidence, goal, saved status for both plans, focus-area chips, and controls to remove individual records or clear the whole AI history.

I also updated **AI_Integration_Handoff.md** so the next session starts from this new baseline instead of the earlier local-only planner state.

Verification: **npm run build** passed. The remaining warnings are still the existing Vite warnings about mixed static/dynamic imports for **stores/workout.ts** and **stores/lift.ts**.
