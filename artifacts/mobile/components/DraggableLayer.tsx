import { Image } from "expo-image";
import React from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { StyleConfig } from "@/constants/styles";
import type { Layer } from "@/lib/collage";

interface Props {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
  editable: boolean;
  style: StyleConfig;
  selectColor: string;
  onSelect: (id: string) => void;
  onChange: (id: string, update: Partial<Layer>) => void;
}

export function DraggableLayer({
  layer,
  canvasWidth,
  canvasHeight,
  selected,
  editable,
  style,
  selectColor,
  onSelect,
  onChange,
}: Props) {
  const tx = useSharedValue(layer.xFrac * canvasWidth);
  const ty = useSharedValue(layer.yFrac * canvasHeight);
  const scale = useSharedValue(layer.scale);
  const rot = useSharedValue(layer.rotation);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRot = useSharedValue(0);

  const commit = (update: Partial<Layer>) => onChange(layer.id, update);
  const select = () => onSelect(layer.id);

  const pan = Gesture.Pan()
    .enabled(editable)
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
      runOnJS(select)();
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(commit)({
        xFrac: tx.value / canvasWidth,
        yFrac: ty.value / canvasHeight,
      });
    });

  const pinch = Gesture.Pinch()
    .enabled(editable)
    .onStart(() => {
      startScale.value = scale.value;
      runOnJS(select)();
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.2, Math.min(6, startScale.value * e.scale));
    })
    .onEnd(() => {
      runOnJS(commit)({ scale: scale.value });
    });

  const rotate = Gesture.Rotation()
    .enabled(editable)
    .onStart(() => {
      startRot.value = rot.value;
    })
    .onUpdate((e) => {
      rot.value = startRot.value + e.rotation;
    })
    .onEnd(() => {
      runOnJS(commit)({ rotation: rot.value });
    });

  const tap = Gesture.Tap()
    .enabled(editable)
    .onEnd(() => {
      runOnJS(select)();
    });

  const composed = Gesture.Simultaneous(pan, pinch, rotate, tap);

  const baseWidth = layer.widthFrac * canvasWidth;
  const baseHeight = baseWidth / layer.aspectRatio;

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotateZ: `${rot.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.layer,
          {
            width: baseWidth,
            height: baseHeight,
            marginLeft: -baseWidth / 2,
            marginTop: -baseHeight / 2,
            shadowColor: style.shadow.color,
            shadowRadius: style.shadow.radius,
            shadowOpacity: style.shadow.opacity,
            shadowOffset: { width: 0, height: style.shadow.offsetY },
          },
          animStyle,
        ]}
      >
        <Image
          source={{ uri: layer.uri }}
          style={styles.img}
          contentFit="contain"
        />
        {selected && editable ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.selection, { borderColor: selectColor }]}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    left: "50%",
    top: "50%",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  selection: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 6,
  },
});
