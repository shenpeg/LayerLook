import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { PickedAsset } from "@/lib/collage";

/** Lets the user pick which photo fills the canvas; the rest become cut-outs. */
export function ChooseBackground({
  picked,
  bgChoice,
  onChoose,
  onConfirm,
}: {
  picked: PickedAsset[];
  bgChoice: number | null;
  onChoose: (index: number) => void;
  onConfirm: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.chooseWrap}>
      <Text style={[styles.bigTitle, { color: colors.foreground, textAlign: "left" }]}>
        Pick a background
      </Text>
      <Text
        style={[
          styles.sub,
          { color: colors.mutedForeground, textAlign: "left", marginBottom: 18 },
        ]}
      >
        Tap one photo to fill the canvas. The rest become cut-out layers.
      </Text>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {picked.map((a, i) => {
          const isChosen = bgChoice === i;
          return (
            <Pressable
              key={a.uri + i}
              style={[
                styles.gridItem,
                {
                  borderColor: isChosen ? colors.primary : colors.border,
                  borderWidth: isChosen ? 3 : 1,
                },
              ]}
              onPress={() => onChoose(i)}
            >
              <Image source={{ uri: a.uri }} style={styles.gridImg} contentFit="cover" />
              {isChosen ? (
                <>
                  <View style={[styles.pickHint, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={14} color={colors.primaryForeground} />
                    <Text style={[styles.pickHintText, { color: colors.primaryForeground }]}>
                      Background
                    </Text>
                  </View>
                  <View style={[styles.chosenBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={16} color={colors.primaryForeground} />
                  </View>
                </>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        disabled={bgChoice === null}
        style={[
          styles.confirmBtn,
          {
            backgroundColor: bgChoice === null ? colors.secondary : colors.primary,
            opacity: bgChoice === null ? 0.6 : 1,
          },
        ]}
        onPress={onConfirm}
      >
        <Text
          style={[
            styles.confirmBtnText,
            {
              color:
                bgChoice === null ? colors.mutedForeground : colors.primaryForeground,
            },
          ]}
        >
          {bgChoice === null ? "Select a background" : "Continue"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chooseWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 30,
  },
  gridItem: {
    width: "47%",
    aspectRatio: 0.8,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
  },
  gridImg: { flex: 1 },
  pickHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  pickHintText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  chosenBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtn: {
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
