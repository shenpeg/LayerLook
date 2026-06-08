import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/** The initial editor screen: prompt to pick photos or try the sample set. */
export function EmptyState({
  onPickPhotos,
  onTrySamples,
  samplesLoading,
}: {
  onPickPhotos: () => void;
  onTrySamples: () => void;
  samplesLoading: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="image" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.bigTitle, { color: colors.foreground }]}>
        Choose your photos
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Pick a background shot plus a few outfit photos to cut out and layer.
      </Text>
      <Pressable
        onPress={onPickPhotos}
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
      >
        <Feather name="upload" size={18} color={colors.primaryForeground} />
        <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
          Pick Photos
        </Text>
      </Pressable>
      <Pressable
        onPress={onTrySamples}
        disabled={samplesLoading}
        style={[
          styles.secondaryBtn,
          { borderColor: colors.border, opacity: samplesLoading ? 0.6 : 1 },
        ]}
      >
        {samplesLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="layers" size={18} color={colors.foreground} />
        )}
        <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
          {samplesLoading ? "Loading sample set…" : "Try a sample set"}
        </Text>
      </Pressable>
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
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
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
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 999,
    marginTop: 28,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
  },
  secondaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
