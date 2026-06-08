import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export type StyleId =
  | "editorial"
  | "scrapbook"
  | "magazine"
  | "pinterest"
  | "street";

export type FormatId = "story" | "portrait" | "square";

export interface StyleConfig {
  id: StyleId;
  name: string;
  /** Short one-line descriptor shown under the style on the home screen. */
  tagline: string;
  /** Optional full-bleed gradient overlay drawn over the background photo. */
  overlay: { colors: [string, string]; locations?: [number, number] } | null;
  /** Inner frame (margin) drawn on top of the canvas edges. */
  frame: { width: number; color: string } | null;
  /** Drop shadow applied to each cut-out. */
  shadow: { color: string; radius: number; opacity: number; offsetY: number };
  /** Max base rotation jitter (radians) applied when scattering cut-outs. */
  jitter: number;
  accent: string;
  decoration: StyleId;
}

export const STYLE_ORDER: StyleId[] = [
  "editorial",
  "scrapbook",
  "magazine",
  "pinterest",
  "street",
];

export const STYLES: Record<StyleId, StyleConfig> = {
  editorial: {
    id: "editorial",
    name: "Editorial",
    tagline: "Clean margins, quiet ink.",
    overlay: { colors: ["rgba(255,255,255,0.10)", "rgba(20,18,16,0.18)"] },
    frame: { width: 14, color: "#F8F3EC" },
    shadow: { color: "#000000", radius: 14, opacity: 0.22, offsetY: 8 },
    jitter: 0.05,
    accent: "#1E1B18",
  decoration: "editorial",
  },
  scrapbook: {
    id: "scrapbook",
    name: "Scrapbook",
    tagline: "Tilted, taped, hand-made.",
    overlay: { colors: ["rgba(247,236,214,0.18)", "rgba(120,90,50,0.22)"] },
    frame: { width: 10, color: "#FBF4E6" },
    shadow: { color: "#3a2a14", radius: 10, opacity: 0.3, offsetY: 6 },
    jitter: 0.22,
    accent: "#C9512E",
    decoration: "scrapbook",
  },
  magazine: {
    id: "magazine",
    name: "Modernist",
    tagline: "Bold, graphic, gallery-white.",
    overlay: { colors: ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.4)"] },
    frame: null,
    shadow: { color: "#000000", radius: 16, opacity: 0.4, offsetY: 10 },
    jitter: 0.04,
    accent: "#E8362F",
    decoration: "magazine",
  },
  pinterest: {
    id: "pinterest",
    name: "Visual Diary",
    tagline: "Soft, pinned, personal.",
    overlay: { colors: ["rgba(255,248,244,0.22)", "rgba(210,180,170,0.18)"] },
    frame: null,
    shadow: { color: "#7a6a60", radius: 18, opacity: 0.22, offsetY: 8 },
    jitter: 0.1,
    accent: "#B05C4A",
    decoration: "pinterest",
  },
  street: {
    id: "street",
    name: "Fashion Story",
    tagline: "High-contrast street edit.",
    overlay: { colors: ["rgba(0,0,0,0.18)", "rgba(0,0,0,0.5)"] },
    frame: { width: 4, color: "#111111" },
    shadow: { color: "#000000", radius: 12, opacity: 0.45, offsetY: 8 },
    jitter: 0.16,
    accent: "#F2E641",
    decoration: "street",
  },
};

export interface FormatConfig {
  id: FormatId;
  name: string;
  caption: string;
  /** width / height */
  ratio: number;
  icon: ComponentProps<typeof Feather>["name"];
}

export const FORMAT_ORDER: FormatId[] = ["story", "portrait", "square"];

export const FORMATS: Record<FormatId, FormatConfig> = {
  story: {
    id: "story",
    name: "Story",
    caption: "9:16",
    ratio: 9 / 16,
    icon: "smartphone",
  },
  portrait: {
    id: "portrait",
    name: "Post",
    caption: "4:5",
    ratio: 4 / 5,
    icon: "image",
  },
  square: {
    id: "square",
    name: "Square",
    caption: "1:1",
    ratio: 1,
    icon: "square",
  },
};
