import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { STYLES, type StyleId } from "@/constants/styles";
import { useColors } from "@/hooks/useColors";

const BOX_W = 150;
const BOX_H = 196;

/** The mood-board photo that represents each creative direction. */
const STYLE_IMAGES: Record<StyleId, ImageSource> = {
  editorial: require("@/assets/images/styles/editorial.png"),
  magazine: require("@/assets/images/styles/modernist.png"),
  pinterest: require("@/assets/images/styles/visual-diary.png"),
  scrapbook: require("@/assets/images/styles/scrapbook.png"),
  street: require("@/assets/images/styles/fashion-story.png"),
};

interface Props {
  styleId: StyleId;
}

/**
 * A small, non-interactive card that previews a single creative direction with
 * its real mood-board image, wrapped in the style's own frame and overlay
 * treatment so each card looks like the direction it represents.
 */
export function DirectionPreview({ styleId }: Props) {
  const colors = useColors();
  const style = STYLES[styleId];
  const frameInset = style.frame
    ? Math.max(3, Math.min(style.frame.width, 9))
    : 0;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: style.shadow.color,
            shadowOpacity: style.shadow.opacity * 0.6,
            shadowRadius: style.shadow.radius,
            shadowOffset: { width: 0, height: style.shadow.offsetY / 2 },
          },
        ]}
      >
        <Image
          source={STYLE_IMAGES[styleId]}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />

        {/* Full-bleed overlay tint, matching the style. */}
        {style.overlay ? (
          <LinearGradient
            colors={style.overlay.colors}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Inner frame margin, matching the style's frame treatment. */}
        {style.frame ? (
          <View
            style={[
              styles.frame,
              { borderWidth: frameInset, borderColor: style.frame.color },
            ]}
          />
        ) : null}

        {/* Accent marker. */}
        <View style={[styles.accent, { backgroundColor: style.accent }]} />
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
