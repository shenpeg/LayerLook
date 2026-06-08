import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * A transient notice that fades in, holds briefly, then fades out and calls
 * `onDismiss`. Tapping it dismisses immediately. Re-running the fade whenever
 * the message changes keeps repeated notices visible.
 */
export function Toast({
  message,
  onDismiss,
  bottom,
}: {
  message: string;
  onDismiss: () => void;
  bottom: number;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;

  // Keep the latest onDismiss without making it an effect dependency, so the
  // fade/timer only (re)starts when the message changes — not on every parent
  // re-render (the parent passes a fresh inline onDismiss each time).
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    opacity.setValue(0);
    const useNativeDriver = Platform.OS !== "web";
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver,
      }).start(({ finished }) => {
        if (finished) onDismissRef.current();
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, opacity]);

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: colors.foreground, bottom, opacity }]}
    >
      <Pressable onPress={onDismiss} style={styles.inner}>
        <Text style={styles.text}>{message}</Text>
        <Text style={styles.dismiss}>Tap to dismiss</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  inner: {
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  dismiss: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});
