import { Image, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import type { StyleId, FormatId } from "@/constants/styles";

export interface Layer {
  id: string;
  uri: string;
  /**
   * Persisted copy of the original (pre-removal) photo. Used to re-run
   * background removal on this single layer and to "restore" erased areas
   * with the brush. Optional for collages created before this existed.
   */
  originalUri?: string;
  /** width / height of the cut-out image */
  aspectRatio: number;
  /** center offset as a fraction of the canvas width/height (0 = centered) */
  xFrac: number;
  yFrac: number;
  /** base width as a fraction of canvas width before user scaling */
  widthFrac: number;
  /** user pinch scale multiplier */
  scale: number;
  /** rotation in radians */
  rotation: number;
  z: number;
}

export interface Collage {
  id: string;
  backgroundUri: string;
  backgroundAspectRatio: number;
  layers: Layer[];
  styleId: StyleId;
  formatId: FormatId;
  /** whether the style's text captions/labels are shown. Off by default. */
  showText?: boolean;
  thumbnailUri?: string;
  createdAt: number;
  updatedAt: number;
}

export function genId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 11);
}

/** Copy an external/cache uri into the persistent document directory. */
export async function persistUri(uri: string, name: string): Promise<string> {
  const dest = `${FileSystem.documentDirectory}${name}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/**
 * Write a base64-encoded image to the persistent document directory.
 * On web (where the document directory / file writes aren't available) this
 * falls back to an inline data URI so the image is still usable.
 */
export async function saveBase64(base64: string, name: string): Promise<string> {
  const dataUri = `data:image/png;base64,${base64}`;
  if (Platform.OS === "web" || !FileSystem.documentDirectory) return dataUri;
  try {
    const dest = `${FileSystem.documentDirectory}${name}`;
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return dest;
  } catch {
    return dataUri;
  }
}

/** Read a file uri back into a base64 string (for re-sending to the API). */
export function uriToBase64(uri: string): Promise<string> {
  // Already an inline data URI (e.g. cut-outs saved on web): strip the prefix.
  if (uri.startsWith("data:")) {
    const comma = uri.indexOf(",");
    return Promise.resolve(comma >= 0 ? uri.slice(comma + 1) : uri);
  }
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** Read the aspect ratio (w/h) of an image at a uri. Falls back to 1. */
export function getImageAspect(uri: string): Promise<number> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve(h > 0 ? w / h : 1),
      () => resolve(1),
    );
  });
}

/** Initial scatter transform for a freshly added cut-out. */
export function scatterTransform(
  index: number,
  total: number,
  jitter: number,
): Pick<Layer, "xFrac" | "yFrac" | "rotation" | "widthFrac"> {
  const angle = total > 1 ? (index / total) * Math.PI * 2 : 0;
  const radius = total > 1 ? 0.16 : 0;
  return {
    xFrac: Math.cos(angle) * radius,
    yFrac: Math.sin(angle) * radius,
    rotation: (Math.random() - 0.5) * 2 * jitter,
    widthFrac: 0.52,
  };
}

export function mimeFromUri(uri: string, fallback = "image/jpeg"): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return fallback;
}
