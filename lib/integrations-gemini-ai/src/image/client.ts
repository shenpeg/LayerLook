import { GoogleGenAI, Modality } from "@google/genai";

import { chromaKeyToTransparent } from "./chroma-key";

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
  "Remove the original background from this photo and isolate the main subject — the person together with their full outfit, clothing, shoes and accessories — as a single clean cut-out. Place the isolated subject on a completely solid, flat, uniform pure-magenta background (hex #FF00FF, RGB 255,0,255) that fills the entire canvas edge to edge. Use this exact magenta and nothing else behind the subject — no gradients, no shadows, no other colors, no checkerboard, no white. Keep the subject's edges crisp, natural and detailed, including hair and fabric outlines. Do not recolor the subject. Return the image.";

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

  // The model returns the subject on a solid magenta background (it cannot
  // reliably emit true alpha). Key that magenta out to a genuinely transparent
  // PNG so cut-outs composite cleanly instead of showing a flat fill.
  const keyed = await chromaKeyToTransparent(
    Buffer.from(imagePart.inlineData.data, "base64"),
  );

  return {
    b64_json: keyed.toString("base64"),
    mimeType: "image/png",
  };
}
