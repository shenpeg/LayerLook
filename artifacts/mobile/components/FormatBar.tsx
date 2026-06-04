import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { FORMATS, FORMAT_ORDER, type FormatId } from "@/constants/styles";
import { useColors } from "@/hooks/useColors";

interface Props {
  value: FormatId;
  onChange: (id: FormatId) => void;
}

export function FormatBar({ value, onChange }: Props) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      {FORMAT_ORDER.map((id) => {
        const active = id === value;
        const fmt = FORMATS[id];
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
              styles.item,
              {
                backgroundColor: active ? colors.secondary : "transparent",
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name={fmt.icon}
              size={16}
              color={active ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.caption,
                { color: active ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {fmt.caption}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  caption: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
