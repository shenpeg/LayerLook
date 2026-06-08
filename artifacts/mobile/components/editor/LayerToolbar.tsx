import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/** Per-layer actions shown when a cut-out is selected. */
export function LayerToolbar({
  onRecut,
  onCleanup,
  onCopy,
  onForward,
  onBack,
  onDelete,
}: {
  onRecut: () => void;
  onCleanup: () => void;
  onCopy: () => void;
  onForward: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.layerBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.layerBarContent}
      >
        <LayerAction icon="refresh-ccw" label="Re-cut" color={colors.foreground} onPress={onRecut} />
        <LayerAction icon="edit-2" label="Clean up" color={colors.foreground} onPress={onCleanup} />
        <LayerAction icon="copy" label="Copy" color={colors.foreground} onPress={onCopy} />
        <LayerAction icon="arrow-up" label="Forward" color={colors.foreground} onPress={onForward} />
        <LayerAction icon="arrow-down" label="Back" color={colors.foreground} onPress={onBack} />
        <LayerAction icon="trash-2" label="Delete" color={colors.destructive} onPress={onDelete} />
      </ScrollView>
    </View>
  );
}

function LayerAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.layerAction} onPress={onPress} hitSlop={6}>
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.layerActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layerBar: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 10,
  },
  layerBarContent: {
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 8,
  },
  layerAction: { alignItems: "center", gap: 4, minWidth: 56 },
  layerActionText: { fontFamily: "Inter_500Medium", fontSize: 11 },
});
