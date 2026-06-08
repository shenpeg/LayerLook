import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Platform, StyleSheet } from "react-native";

const LOGO = require("@/assets/images/logo.png");

const HOLD_MS = 1000;
const FADE_MS = 350;
// react-native-web has no native animation module; JS-driven avoids a warning.
const USE_NATIVE_DRIVER = Platform.OS !== "web";

/**
 * A brief branded loading screen shown once when the app opens. Fades the
 * LayerLook logo in, holds for ~1s, then fades the whole overlay out and
 * calls `onFinish` so the gallery underneath is revealed.
 */
export function SplashOverlay({ onFinish }: { onFinish: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => onFinish());
    }, HOLD_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}
      >
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const SIZE = Math.min(Dimensions.get("window").width * 0.62, 280);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  logo: {
    width: SIZE,
    height: SIZE,
  },
});
