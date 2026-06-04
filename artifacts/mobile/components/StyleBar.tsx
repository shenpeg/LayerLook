import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { STYLES, STYLE_ORDER, type StyleId } from "@/constants/styles";
import { useColors } from "@/hooks/useColors";

interface Props {
  value: StyleId;
  onChange: (id: StyleId) => void;
}

export function StyleBar({ value, onChange }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {STYLE_ORDER.map((id) => {
        const active = id === value;
        return (
          <Pressable
            key={id}
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.selectionAsync();
              }
              onChange(id);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {STYLES[id].name.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.4,
  },
});
