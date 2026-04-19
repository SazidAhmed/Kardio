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
