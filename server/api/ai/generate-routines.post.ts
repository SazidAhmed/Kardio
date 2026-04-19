import type { AiPlannerRequest, AiPlannerResponse } from '~/types/ai'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function buildPrompt(profile: AiPlannerRequest['profile']) {
  return [
    'You are a fitness programming assistant.',
    'Analyze the provided body photos conservatively for general coaching observations only.',
    'Do not diagnose injuries, diseases, posture disorders, or body-fat percentage.',
    'Use the profile data and images to create one cardio plan and one lifting plan for this app.',
    'Return strict JSON only with these top-level keys: analysis, cardioPlan, liftPlan.',
    'The analysis object must include: summary, confidence, flags, focusAreas, disclaimer.',
    'The cardioPlan object must include: name, icon, description, warmupDuration, cooldownDuration, restBetweenSets, restBetweenExercises, exercises.',
    'Each cardio exercise must include: name, duration, sets, color.',
    'The liftPlan object must include: name, icon, description, restBetweenSets, exercises.',
    'Each lift exercise must include: name and sets, and each set must include reps and weight.',
    'Use realistic beginner or intermediate prescriptions based on the provided experience.',
    'If equipment is limited, prefer bodyweight or minimal-equipment exercises.',
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

function normalizeResponse(data: Partial<AiPlannerResponse>): AiPlannerResponse {
  const cardioExercises = (data.cardioPlan?.exercises ?? []).map((exercise, index) => ({
    name: exercise.name || `Cardio Exercise ${index + 1}`,
    duration: Math.max(10, Number(exercise.duration) || 30),
    sets: Math.max(1, Number(exercise.sets) || 1),
    color: exercise.color || ['#34c759', '#ff9500', '#5856d6', '#ff3b30'][index % 4],
  }))

  const liftExercises = (data.liftPlan?.exercises ?? []).map((exercise, exerciseIndex) => ({
    name: exercise.name || `Lift Exercise ${exerciseIndex + 1}`,
    sets: (exercise.sets ?? []).map((set) => ({
      reps: Math.max(1, Number(set.reps) || 8),
      weight: Math.max(0, Number(set.weight) || 0),
    })),
  })).filter((exercise) => exercise.sets.length > 0)

  return {
    analysis: {
      summary: data.analysis?.summary || 'General training guidance generated from the submitted profile and photos.',
      confidence: data.analysis?.confidence === 'high' || data.analysis?.confidence === 'low' ? data.analysis.confidence : 'medium',
      flags: Array.isArray(data.analysis?.flags) ? data.analysis!.flags.filter(Boolean) : [],
      focusAreas: Array.isArray(data.analysis?.focusAreas) ? data.analysis!.focusAreas.filter(Boolean) : [],
      disclaimer: data.analysis?.disclaimer || 'AI-generated fitness guidance only. Not medical advice.',
    },
    cardioPlan: {
      name: data.cardioPlan?.name || 'AI Cardio Plan',
      icon: data.cardioPlan?.icon || '🔥',
      description: data.cardioPlan?.description || 'A progressive cardio routine based on your submitted profile.',
      warmupDuration: Math.max(0, Number(data.cardioPlan?.warmupDuration) || 180),
      cooldownDuration: Math.max(0, Number(data.cardioPlan?.cooldownDuration) || 180),
      restBetweenSets: Math.max(0, Number(data.cardioPlan?.restBetweenSets) || 45),
      restBetweenExercises: Math.max(0, Number(data.cardioPlan?.restBetweenExercises) || 60),
      exercises: cardioExercises.length > 0 ? cardioExercises : [
        { name: 'Brisk Walk', duration: 180, sets: 3, color: '#34c759' },
        { name: 'Jog', duration: 60, sets: 3, color: '#ff9500' },
      ],
    },
    liftPlan: {
      name: data.liftPlan?.name || 'AI Lift Plan',
      icon: data.liftPlan?.icon || '💪',
      description: data.liftPlan?.description || 'A balanced strength routine based on your submitted profile.',
      restBetweenSets: Math.max(0, Number(data.liftPlan?.restBetweenSets) || 90),
      exercises: liftExercises.length > 0 ? liftExercises : [
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
  const body = await readBody<AiPlannerRequest>(event)

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing GEMINI_API_KEY in server environment.',
    })
  }

  if (!Array.isArray(body?.images) || body.images.length === 0) {
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

  for (const image of body.images) {
    if (!image?.data || !image?.mimeType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Each uploaded image must include mimeType and data.',
      })
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only JPEG, PNG, and WebP images are supported.',
      })
    }
  }

  if (!body.profile?.goal?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A training goal is required.',
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

  const parsed = JSON.parse(extractJson(text)) as Partial<AiPlannerResponse>
  return normalizeResponse(parsed)
})
