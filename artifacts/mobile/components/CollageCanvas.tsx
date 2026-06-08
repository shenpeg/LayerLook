import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DraggableLayer } from "@/components/DraggableLayer";
import { STYLES, type StyleConfig, type StyleId } from "@/constants/styles";
import type { Layer } from "@/lib/collage";

interface Props {
  backgroundUri: string;
  layers: Layer[];
  styleId: StyleId;
  width: number;
  height: number;
  editable: boolean;
  showText: boolean;
  selectedId: string | null;
  /**
   * Render layers as plain, non-interactive images (no gestures / reanimated).
   * Use for lightweight previews like gallery cards.
   */
  staticRender?: boolean;
  innerRef?: React.Ref<View>;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, update: Partial<Layer>) => void;
}

function StaticLayer({
  layer,
  canvasWidth,
  canvasHeight,
  style,
}: {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  style: StyleConfig;
}) {
  const baseWidth = layer.widthFrac * canvasWidth;
  const baseHeight = baseWidth / layer.aspectRatio;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.staticLayer,
        {
          width: baseWidth,
          height: baseHeight,
          marginLeft: -baseWidth / 2,
          marginTop: -baseHeight / 2,
          shadowColor: style.shadow.color,
          shadowRadius: style.shadow.radius,
          shadowOpacity: style.shadow.opacity,
          shadowOffset: { width: 0, height: style.shadow.offsetY },
          transform: [
            { translateX: layer.xFrac * canvasWidth },
            { translateY: layer.yFrac * canvasHeight },
            { scale: layer.scale },
            { rotateZ: `${layer.rotation}rad` },
          ],
        },
      ]}
    >
      <Image source={{ uri: layer.uri }} style={styles.img} contentFit="contain" />
    </View>
  );
}

function Decoration({ style, config }: { style: StyleId; config: StyleConfig }) {
  const date = new Date()
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();

  if (style === "editorial") {
    return (
      <View pointerEvents="none" style={styles.decoFill}>
        <View style={styles.editorialTop}>
          <Text style={styles.editorialKicker}>EDITORIAL</Text>
          <View style={styles.editorialRule} />
        </View>
        <Text style={styles.editorialDate}>{date}</Text>
      </View>
    );
  }
  if (style === "magazine") {
    return (
      <View pointerEvents="none" style={styles.decoFill}>
        <Text style={styles.magMast}>LOOKBOOK</Text>
        <View style={[styles.magRule, { backgroundColor: config.accent }]} />
        <View style={styles.magIssueWrap}>
          <Text style={[styles.magIssue, { backgroundColor: config.accent }]}>
            ISSUE 01
          </Text>
        </View>
      </View>
    );
  }
  if (style === "scrapbook") {
    return (
      <View pointerEvents="none" style={styles.decoFill}>
        <View style={[styles.tape, styles.tapeTL]} />
        <View style={[styles.tape, styles.tapeBR]} />
        <Text style={styles.scrapLabel}>moodboard</Text>
      </View>
    );
  }
  if (style === "pinterest") {
    return (
      <View pointerEvents="none" style={styles.decoFill}>
        <View style={styles.pinPill}>
          <View style={[styles.pinDot, { backgroundColor: config.accent }]} />
          <Text style={styles.pinText}>saved</Text>
        </View>
      </View>
    );
  }
  // street
  return (
    <View pointerEvents="none" style={styles.decoFill}>
      <Text style={[styles.streetTag, { color: config.accent }]}>
        STREET{"\n"}STYLE
      </Text>
      <Text style={styles.streetYear}>/ 2026</Text>
    </View>
  );
}

export function CollageCanvas({
  backgroundUri,
  layers,
  styleId,
  width,
  height,
  editable,
  showText,
  selectedId,
  staticRender,
  innerRef,
  onSelect,
  onChange,
}: Props) {
  const config = STYLES[styleId];
  const ordered = [...layers].sort((a, b) => a.z - b.z);

  return (
    <View
      ref={innerRef}
      collapsable={false}
      style={[styles.canvas, { width, height }]}
    >
      <Image
        source={{ uri: backgroundUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {config.overlay ? (
        <LinearGradient
          colors={config.overlay.colors}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {editable ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onSelect?.(null)}
        />
      ) : null}

      {ordered.map((layer) =>
        staticRender ? (
          <StaticLayer
            key={`${layer.id}-${width.toFixed(0)}-${height.toFixed(0)}-${styleId}`}
            layer={layer}
            canvasWidth={width}
            canvasHeight={height}
            style={config}
          />
        ) : (
          <DraggableLayer
            key={`${layer.id}-${width.toFixed(0)}-${height.toFixed(0)}-${styleId}`}
            layer={layer}
            canvasWidth={width}
            canvasHeight={height}
            selected={selectedId === layer.id}
            editable={editable}
            style={config}
            selectColor={config.accent === "#F2E641" ? "#FFFFFF" : config.accent}
            onSelect={(id) => onSelect?.(id)}
            onChange={(id, u) => onChange?.(id, u)}
          />
        ),
      )}

      {showText ? <Decoration style={styleId} config={config} /> : null}

      {config.frame ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderWidth: config.frame.width, borderColor: config.frame.color },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: "hidden",
    backgroundColor: "#000",
  },
  decoFill: { ...StyleSheet.absoluteFillObject },
  staticLayer: {
    position: "absolute",
    left: "50%",
    top: "50%",
  },
  img: {
    width: "100%",
    height: "100%",
  },

  editorialTop: {
    position: "absolute",
    top: 28,
    left: 26,
    right: 26,
  },
  editorialKicker: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 4,
    color: "#FFFFFF",
  },
  editorialRule: {
    marginTop: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  editorialDate: {
    position: "absolute",
    bottom: 26,
    right: 26,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    color: "#FFFFFF",
  },

  magMast: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    letterSpacing: 2,
    color: "#FFFFFF",
  },
  magRule: {
    position: "absolute",
    top: 62,
    left: 18,
    width: 54,
    height: 4,
  },
  magIssueWrap: {
    position: "absolute",
    bottom: 22,
    right: 18,
  },
  magIssue: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    color: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },

  tape: {
    position: "absolute",
    width: 78,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  tapeTL: { top: 18, left: -16, transform: [{ rotate: "-32deg" }] },
  tapeBR: { bottom: 24, right: -16, transform: [{ rotate: "-28deg" }] },
  scrapLabel: {
    position: "absolute",
    bottom: 22,
    left: 22,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
    fontSize: 18,
    color: "#FFFFFF",
  },

  pinPill: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pinDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  pinText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#3A332C",
    letterSpacing: 0.5,
  },

  streetTag: {
    position: "absolute",
    bottom: 20,
    left: 18,
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: 1,
  },
  streetYear: {
    position: "absolute",
    top: 20,
    right: 18,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 2,
    color: "#FFFFFF",
  },
});
