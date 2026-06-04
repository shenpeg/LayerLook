import { GoogleGenAI, Modality } from "@google/genai";

let _ai: GoogleGenAI | null = null;

/**
 * Lazily construct the Gemini client. Validation happens on first use rather
 * than at module import, so a missing integration only fails the routes that
 * actually need Gemini instead of crashing the entire server at startup.
 */
function getAi(): GoogleGenAI {
  if (_ai) return _ai;

  if (!process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_GEMINI_BASE_URL must be set. Did you forget to provision the Gemini AI integration?",
    );
  }

  if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_GEMINI_API_KEY must be set. Did you forget to provision the Gemini AI integration?",
    );
  }

  _ai = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });
  return _ai;
}

export async function generateImage(
  prompt: string
): Promise<{ b64_json: string; mimeType: string }> {
  const response = await getAi().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in response");
  }

  return {
    b64_json: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

const REMOVE_BACKGROUND_PROMPT =
  "Remove the background from this photo completely. Isolate the main subject — the person together with their full outfit, clothing, shoes and accessories — as a single clean cut-out. The area outside the subject must be fully transparent (alpha 0). Keep the subject's edges crisp, natural and detailed, including hair and fabric outlines. Do not add any shadow, color fill, frame, or new background. Return a PNG image with a transparent background.";

export async function removeBackground(
  imageBase64: string,
  mimeType: string,
): Promise<{ b64_json: string; mimeType: string }> {
  const response = await getAi().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: REMOVE_BACKGROUND_PROMPT },
        ],
      },
    ],
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) =>
      part.inlineData,
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in background removal response");
  }

  return {
    b64_json: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}
