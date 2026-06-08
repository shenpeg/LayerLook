import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormatBar } from "@/components/FormatBar";
import { StyleBar } from "@/components/StyleBar";
import { useColors } from "@/hooks/useColors";
import type { FormatId, StyleId } from "@/constants/styles";

/** Bottom control deck: style + format pickers and the primary action row. */
export function EditorControls({
  styleId,
  formatId,
  showText,
  onStyleChange,
  onFormatChange,
  onToggleText,
  onAddPhotos,
  onShare,
  onSave,
}: {
  styleId: StyleId;
  formatId: FormatId;
  showText: boolean;
  onStyleChange: (id: StyleId) => void;
  onFormatChange: (id: FormatId) => void;
  onToggleText: () => void;
  onAddPhotos: () => void;
  onShare: () => void;
  onSave: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
      <StyleBar value={styleId} onChange={onStyleChange} />
      <View style={{ height: 12 }} />
      <FormatBar value={formatId} onChange={onFormatChange} />
      <View style={styles.actionRow}>
        <Pressable
          onPress={onToggleText}
          style={[
            styles.actionBtn,
            { backgroundColor: showText ? colors.primary : colors.secondary },
          ]}
        >
          <Feather
            name="type"
            size={18}
            color={showText ? colors.primaryForeground : colors.foreground}
          />
          <Text
            style={[
              styles.actionText,
              { color: showText ? colors.primaryForeground : colors.foreground },
            ]}
          >
            Text
          </Text>
        </Pressable>
        <Pressable
          onPress={onAddPhotos}
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="plus" size={18} color={colors.foreground} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>Add</Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="share-2" size={18} color={colors.foreground} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>Share</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="download" size={18} color={colors.primaryForeground} />
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingTop: 14 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  saveBtn: { flex: 1.3 },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
