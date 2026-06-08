import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/** Shown while background removal runs across the picked outfit photos. */
export function Processing({
  progress,
}: {
  progress: { done: number; total: number };
}) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.bigTitle, { color: colors.foreground, marginTop: 20 }]}>
        Cutting out your outfits
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        {progress.total > 0
          ? `Removing backgrounds ${progress.done}/${progress.total}`
          : "Preparing your canvas"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  bigTitle: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 30,
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
});
