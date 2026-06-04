import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { removeBackground } from "@workspace/integrations-gemini-ai";
import {
  RemoveBackgroundBody,
  RemoveBackgroundResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Lightweight in-memory, per-IP rate limiter. The app has no login (local-only
// client), so this is the proportionate guard against abuse of the paid Gemini
// background-removal endpoint. Sliding window of WINDOW_MS allowing MAX_HITS.
const WINDOW_MS = 60_000;
const MAX_HITS = 20;
const hits = new Map<string, number[]>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}

// Periodically drop stale entries so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of hits) {
    const recent = times.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}, WINDOW_MS).unref();

router.post("/collage/remove-background", rateLimit, async (req, res) => {
  const parsed = RemoveBackgroundBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const result = await removeBackground(
      parsed.data.image,
      parsed.data.mimeType,
    );
    const data = RemoveBackgroundResponse.parse({
      image: result.b64_json,
      mimeType: result.mimeType,
    });
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Background removal failed");
    res.status(502).json({ error: "Background removal failed" });
  }
});

export default router;
