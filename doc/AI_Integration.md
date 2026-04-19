In my fitness ap I want to inetegrate AI. The idea is, I'll upload my body images taken in different angles. Then the AI will analyze my body condition, structure and shape. Then it will prepare a cardio routine, weight lifting routine.
How to do the Integration?

Your app is a Nuxt 3 SPA with client-side stores in **stores/workout.ts** and **stores/lift.ts**. The right integration is:

1. Add a backend layer in **server/api**.
2. Upload body photos to secure storage.
3. Send the image URLs plus user profile data to a vision-capable model.
4. Generate structured analysis JSON.
5. Turn that JSON into your existing **WorkoutPlan** and **LiftPlan** formats.
6. Show the result for user review before saving.

Do not let the model generate plans from photos alone. Photos are weak for health decisions. You should also collect:

* age
* sex
* height/weight
* fitness goal
* injuries/pain
* equipment available
* workout experience
* days per week

A good architecture for your app:

* **POST /api/uploads/sign**
  Purpose: get signed upload URLs
* **POST /api/ai/analyze-body**
  Input: image URLs + profile
  Output: structured body analysis
* **POST /api/ai/generate-routines**
  Input: analysis + goals + equipment + current history
  Output: **cardioPlan** + **liftPlan**
* **POST /api/ai/save-routines**
  Purpose: persist approved plans

Use two AI steps, not one:

* Step 1: image analysis
  Output only observations like posture, body proportions, muscle development patterns, mobility flags, asymmetry hints, confidence.
* Step 2: routine generation
  Use analysis + questionnaire + user history to build plans.

The output should be strict JSON, for example:

{
  "analysis": {
    "summary": "Beginner with moderate conditioning and limited posterior-chain development.",
    "confidence": "medium",
    "flags": ["possible rounded shoulders", "low cardio base"],
    "focusAreas": ["core", "glutes", "upper back", "zone 2 endurance"]
  },
  "cardioPlan": {
    "name": "AI Cardio Base",
    "icon": "🔥",
    "description": "Build aerobic base with gradual intervals.",
    "warmupDuration": 180,
    "cooldownDuration": 180,
    "restBetweenSets": 60,
    "restBetweenExercises": 90,
    "exercises": [
      { "id": "c1", "name": "Brisk Walk", "duration": 180, "sets": 3, "color": "#34c759" },
      { "id": "c2", "name": "Jog", "duration": 60, "sets": 3, "color": "#ff9500" }
    ]
  },
  "liftPlan": {
    "name": "AI Full Body A",
    "icon": "💪",
    "description": "3-day beginner strength plan",
    "restBetweenSets": 90,
    "exercises": [
      {
        "id": "l1",
        "name": "Goblet Squat",
        "sets": [
          { "reps": 10, "weight": 12, "completed": false },
          { "reps": 10, "weight": 12, "completed": false },
          { "reps": 10, "weight": 12, "completed": false }
        ]
      }
    ]
  }
}

In your codebase, that maps cleanly to:

* **store.createPlan(...)** in **useWorkoutStore**
* **store.createPlan(...)** in **useLiftStore**

Important product/safety constraints:

* Never claim diagnosis, body-fat %, or medical certainty from images.
* Add a disclaimer: “AI guidance only, not medical advice.”
* Require user confirmation before saving a plan.
* Let users delete images and analysis data.
* Keep AI API keys only on the server, never in the frontend.

Practical stack:

* Storage: Supabase Storage, Cloudinary, or S3
* DB: Supabase/Postgres
* AI: vision-capable model for image understanding + structured JSON output
* Nuxt: **server/api/*.post.ts** routes as the secure proxy

Recommended rollout:

1. Build questionnaire + image upload.
2. Add **analyze-body** endpoint returning structured JSON.
3. Add **generate-routines** endpoint that converts analysis into your plan schema.
4. Add a review screen with “Save cardio” and “Save lifting”.
5. Persist plans and history in a real backend instead of only **localStorage**

Implement the first version in this repo next:

* Nuxt server API routes
* upload flow
* AI request/response schema
* UI for body-photo submission
* mapping into your existing cardio/lift stores
