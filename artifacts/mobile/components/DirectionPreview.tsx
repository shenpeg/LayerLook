import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { STYLES, type StyleId } from "@/constants/styles";
import { useColors } from "@/hooks/useColors";

const BOX_W = 132;
const BOX_H = 168;

/** Muted "garment" swatches scattered inside each preview to read as a collage. */
const SWATCHES = ["#9AA486", "#C7AD97", "#5E5A52"];

interface Props {
  styleId: StyleId;
}

/**
 * A small, non-interactive mini-collage that previews a single creative
 * direction. It reuses the real style config — frame, overlay gradient,
 * cut-out shadow and rotation jitter — so each card actually looks like the
 * style it represents.
 */
export function DirectionPreview({ styleId }: Props) {
  const colors = useColors();
  const style = STYLES[styleId];

  // Convert the radian jitter into degrees for the scattered swatches.
  const deg = (style.jitter * 180) / Math.PI;
  const frameInset = style.frame ? Math.max(3, Math.min(style.frame.width, 9)) : 0;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.box,
          { backgroundColor: "#E9E3D8", borderColor: colors.border },
        ]}
      >
        {/* Inner frame margin, matching the style's frame treatment. */}
        {style.frame ? (
          <View
            style={[
              styles.frame,
              { borderWidth: frameInset, borderColor: style.frame.color },
            ]}
          />
        ) : null}

        {/* Full-bleed overlay tint. */}
        {style.overlay ? (
          <LinearGradient
            colors={style.overlay.colors}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Scattered cut-out swatches. */}
        <View style={styles.stage} pointerEvents="none">
          <View
            style={[
              styles.swatch,
              {
                width: 52,
                height: 70,
                left: 16,
                top: 40,
                backgroundColor: SWATCHES[0],
                transform: [{ rotate: `${-deg}deg` }],
                shadowColor: style.shadow.color,
                shadowOpacity: style.shadow.opacity,
                shadowRadius: style.shadow.radius / 2,
                shadowOffset: { width: 0, height: style.shadow.offsetY / 2 },
              },
            ]}
          />
          <View
            style={[
              styles.swatch,
              {
                width: 46,
                height: 58,
                right: 18,
                top: 22,
                backgroundColor: SWATCHES[1],
                transform: [{ rotate: `${deg * 1.4}deg` }],
                shadowColor: style.shadow.color,
                shadowOpacity: style.shadow.opacity,
                shadowRadius: style.shadow.radius / 2,
                shadowOffset: { width: 0, height: style.shadow.offsetY / 2 },
              },
            ]}
          />
          <View
            style={[
              styles.swatch,
              {
                width: 40,
                height: 40,
                right: 30,
                bottom: 24,
                backgroundColor: SWATCHES[2],
                transform: [{ rotate: `${deg * 0.6}deg` }],
                shadowColor: style.shadow.color,
                shadowOpacity: style.shadow.opacity,
                shadowRadius: style.shadow.radius / 2,
                shadowOffset: { width: 0, height: style.shadow.offsetY / 2 },
              },
            ]}
          />
        </View>

        {/* Accent marker. */}
        <View
          style={[styles.accent, { backgroundColor: style.accent }]}
        />
      </View>

      <Text style={[styles.name, { color: colors.foreground }]}>
        {style.name}
      </Text>
      <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
        {style.tagline}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: BOX_W },
  box: {
    width: BOX_W,
    height: BOX_H,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  stage: { ...StyleSheet.absoluteFillObject },
  swatch: {
    position: "absolute",
    borderRadius: 6,
  },
  accent: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 18,
    height: 4,
    borderRadius: 2,
  },
  name: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 19,
    marginTop: 10,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
});
