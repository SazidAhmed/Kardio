import type { AiPlannerRequest, AiPlannerResponse } from '~/types/ai'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = asNumber(value)
  if (parsed === null) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function asStringArray(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, maxItems)
}

function buildPrompt(profile: AiPlannerRequest['profile']) {
  return [
    'You are a fitness programming assistant.',
    'Analyze the provided body photos conservatively for general coaching observations only.',
    'Do not diagnose injuries, diseases, posture disorders, or body-fat percentage.',
    'Do not infer medical conditions, pain causes, asymmetries, or injury severity from images.',
    'When uncertain, state uncertainty and lower confidence instead of guessing.',
    'Use the profile data and images to create one cardio plan and one lifting plan for this app.',
    'Return strict JSON only with these top-level keys: analysis, cardioPlan, liftPlan.',
    'The analysis object must include: summary, confidence, flags, focusAreas, disclaimer.',
    'The cardioPlan object must include: name, icon, description, warmupDuration, cooldownDuration, restBetweenSets, restBetweenExercises, exercises.',
    'Each cardio exercise must include: name, duration, sets, color.',
    'The liftPlan object must include: name, icon, description, restBetweenSets, exercises.',
    'Each lift exercise must include: name and sets, and each set must include reps and weight.',
    'Use realistic beginner or intermediate prescriptions based on the provided experience.',
    'If equipment is limited, prefer bodyweight or minimal-equipment exercises.',
    'If injuries or limitations are mentioned, avoid movements likely to aggravate them and suggest conservative alternatives.',
    'Prefer 4 to 6 cardio exercises and 4 to 6 lifting exercises.',
    'Use whole-number seconds, reps, sets, and weights.',
    'Keep the summary to 1 or 2 short sentences.',
    'Put only short bullet-like strings in flags and focusAreas.',
    'Use simple emoji icons only.',
    'Add a short disclaimer that this is general guidance and not medical advice.',
    '',
    'Use the recent workout context to avoid recommending a routine that ignores the user\'s current level or training consistency.',
    `Profile: ${JSON.stringify(profile)}`,
  ].join('\n')
}

function buildContextPrompt(context?: AiPlannerRequest['context']) {
  if (!context) {
    return 'Recent context: none.'
  }

  return `Recent context: ${JSON.stringify(context)}`
}

function extractJson(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  throw createError({
    statusCode: 502,
    statusMessage: 'Gemini did not return valid JSON.',
  })
}

function parseRequest(body: unknown): AiPlannerRequest {
  if (!isRecord(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body must be a JSON object.',
    })
  }

  if (!isRecord(body.profile)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Profile data is required.',
    })
  }

  if (!Array.isArray(body.images) || body.images.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one photo is required.',
    })
  }

  if (body.images.length > 3) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A maximum of 3 photos is allowed.',
    })
  }

  const images = body.images.map((image, index) => {
    if (!isRecord(image)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Image ${index + 1} is invalid.`,
      })
    }

    const mimeType = asString(image.mimeType)
    const data = asString(image.data)

    if (!mimeType || !data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Each uploaded image must include mimeType and data.',
      })
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(mimeType as typeof SUPPORTED_IMAGE_TYPES[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only JPEG, PNG, and WebP images are supported.',
      })
    }

    return { mimeType, data }
  })

  const profile: AiPlannerRequest['profile'] = {
    age: clampNumber(body.profile.age, 25, 12, 100),
    sex: asString(body.profile.sex, 'prefer_not_to_say') || 'prefer_not_to_say',
    heightCm: clampNumber(body.profile.heightCm, 170, 100, 250),
    weightKg: clampNumber(body.profile.weightKg, 70, 30, 300),
    goal: asString(body.profile.goal),
    experience: asString(body.profile.experience, 'beginner') || 'beginner',
    equipment: asString(body.profile.equipment),
    injuries: asString(body.profile.injuries),
    daysPerWeek: clampNumber(body.profile.daysPerWeek, 3, 1, 7),
  }

  if (!profile.goal) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A training goal is required.',
    })
  }

  if (!profile.equipment) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Available equipment is required.',
    })
  }

  if (!profile.injuries) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Injuries or limitations are required.',
    })
  }

  const context = isRecord(body.context)
    ? {
        cardioHistory: Array.isArray(body.context.cardioHistory)
          ? body.context.cardioHistory
              .filter(isRecord)
              .slice(0, 10)
              .map((entry) => ({
                name: asString(entry.name, 'Workout'),
                duration: asString(entry.duration, '0m'),
                status: asString(entry.status, 'unknown'),
                date: asString(entry.date, ''),
              }))
          : [],
        liftHistory: Array.isArray(body.context.liftHistory)
          ? body.context.liftHistory
              .filter(isRecord)
              .slice(0, 10)
              .map((entry) => ({
                planName: asString(entry.planName, 'Routine'),
                totalVolume: clampNumber(entry.totalVolume, 0, 0, 100000),
                duration: asString(entry.duration, '0m'),
                status: asString(entry.status, 'unknown'),
                date: asString(entry.date, ''),
              }))
          : [],
      }
    : undefined

  return {
    profile,
    images,
    context,
  }
}

function normalizeResponse(data: Partial<AiPlannerResponse>): AiPlannerResponse {
  const safeData = isRecord(data) ? data : {}
  const analysis = isRecord(safeData.analysis) ? safeData.analysis : {}
  const cardioPlan = isRecord(safeData.cardioPlan) ? safeData.cardioPlan : {}
  const liftPlan = isRecord(safeData.liftPlan) ? safeData.liftPlan : {}

  const cardioExercises = Array.isArray(cardioPlan.exercises)
    ? cardioPlan.exercises
        .filter(isRecord)
        .slice(0, 12)
        .map((exercise, index) => ({
          name: asString(exercise.name, `Cardio Exercise ${index + 1}`),
          duration: clampNumber(exercise.duration, 30, 10, 3600),
          sets: clampNumber(exercise.sets, 1, 1, 20),
          color: asString(exercise.color, ['#34c759', '#ff9500', '#5856d6', '#ff3b30'][index % 4]),
        }))
    : []

  const liftExercises = Array.isArray(liftPlan.exercises)
    ? liftPlan.exercises
        .filter(isRecord)
        .slice(0, 12)
        .map((exercise, exerciseIndex) => ({
          name: asString(exercise.name, `Lift Exercise ${exerciseIndex + 1}`),
          sets: Array.isArray(exercise.sets)
            ? exercise.sets
                .filter(isRecord)
                .slice(0, 8)
                .map((set) => ({
                  reps: clampNumber(set.reps, 8, 1, 100),
                  weight: clampNumber(set.weight, 0, 0, 1000),
                }))
            : [],
        }))
        .filter((exercise) => exercise.sets.length > 0)
    : []

  return {
    analysis: {
      summary: asString(analysis.summary, 'General training guidance generated from the submitted profile and photos.'),
      confidence: analysis.confidence === 'high' || analysis.confidence === 'low' ? analysis.confidence : 'medium',
      flags: asStringArray(analysis.flags),
      focusAreas: asStringArray(analysis.focusAreas),
      disclaimer: asString(analysis.disclaimer, 'AI-generated fitness guidance only. Not medical advice.'),
    },
    cardioPlan: {
      name: asString(cardioPlan.name, 'AI Cardio Plan'),
      icon: asString(cardioPlan.icon, '🔥'),
      description: asString(cardioPlan.description, 'A progressive cardio routine based on your submitted profile.'),
      warmupDuration: clampNumber(cardioPlan.warmupDuration, 180, 0, 1800),
      cooldownDuration: clampNumber(cardioPlan.cooldownDuration, 180, 0, 1800),
      restBetweenSets: clampNumber(cardioPlan.restBetweenSets, 45, 0, 600),
      restBetweenExercises: clampNumber(cardioPlan.restBetweenExercises, 60, 0, 600),
      exercises: cardioExercises.length > 0
        ? cardioExercises
        : [
            { name: 'Brisk Walk', duration: 180, sets: 3, color: '#34c759' },
            { name: 'Jog', duration: 60, sets: 3, color: '#ff9500' },
          ],
    },
    liftPlan: {
      name: asString(liftPlan.name, 'AI Lift Plan'),
      icon: asString(liftPlan.icon, '💪'),
      description: asString(liftPlan.description, 'A balanced strength routine based on your submitted profile.'),
      restBetweenSets: clampNumber(liftPlan.restBetweenSets, 90, 0, 900),
      exercises: liftExercises.length > 0
        ? liftExercises
        : [
            {
              name: 'Goblet Squat',
              sets: [
                { reps: 10, weight: 10 },
                { reps: 10, weight: 10 },
                { reps: 10, weight: 10 },
              ],
            },
          ],
    },
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = parseRequest(await readBody<unknown>(event))

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing GEMINI_API_KEY in server environment.',
    })
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildPrompt(body.profile) },
          { text: buildContextPrompt(body.context) },
          ...body.images.map((image) => ({
            inline_data: {
              mime_type: image.mimeType,
              data: image.data,
            },
          })),
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  }

  const response = await $fetch<{
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }>(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': config.geminiApiKey,
      'Content-Type': 'application/json',
    },
    body: payload,
  }).catch((error: unknown) => {
    throw createError({
      statusCode: 502,
      statusMessage: error instanceof Error ? error.message : 'Gemini request failed.',
    })
  })

  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim()

  if (!text) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Gemini returned an empty response.',
    })
  }

  let parsed: Partial<AiPlannerResponse>
  try {
    parsed = JSON.parse(extractJson(text)) as Partial<AiPlannerResponse>
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Gemini returned malformed JSON.',
    })
  }

  return normalizeResponse(parsed)
})
