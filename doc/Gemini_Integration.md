You do not strictly need a library. You can call Gemini over plain **fetch** with the REST API.

But for your Nuxt app, the clean choice is the official Google SDK: **@google/genai**. Google currently recommends that SDK, and marks the older **@google/generativeai** package as legacy/not actively maintained. Sources: [Gemini API libraries](https://ai.google.dev/gemini-api/docs/libraries), [Gemini API reference](https://ai.google.dev/api).

For your app, use it only in Nuxt server routes, not in the browser. Your Gemini API key must stay on the server.

npm install @google/genai

Example server route in **server/api/ai/analyze-body.post.ts**:


import { GoogleGenAI } from '@google/genai'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  })

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        parts: [
          { text: 'Analyze these body photos for general fitness coaching observations only. Return strict JSON.' },
          ...body.images.map((image: { mimeType: string; data: string }) => ({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          })),
        ],
      },
    ],
  })

  return {
    text: response.text,
  }
})


If you want no SDK, REST is also fine:

await $fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
  method: 'POST',
  headers: {
    'x-goog-api-key': process.env.GEMINI_API_KEY!,
    'Content-Type': 'application/json',
  },
  body: {
    contents: [
      {
        parts: [{ text: 'Analyze these fitness photos.' }],
      },
    ],
  },
})


Recommendation:

* Use **@google/genai** if you want easier integration and cleaner code.
* Use raw REST if you want zero dependency and full control.
