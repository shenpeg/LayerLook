import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DirectionPreview } from "@/components/DirectionPreview";
import { useCollages } from "@/context/CollageContext";
import { STYLES, type StyleId } from "@/constants/styles";
import { useColors } from "@/hooks/useColors";
import type { Collage } from "@/lib/collage";

const CREATIVE_DIRECTIONS: StyleId[] = [
  "editorial",
  "magazine",
  "pinterest",
  "scrapbook",
  "street",
];

const WEB_TOP = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM = Platform.OS === "web" ? 34 : 0;

export default function GalleryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { collages, loaded, remove } = useCollages();

  const confirmDelete = useCallback(
    (item: Collage) => {
      Alert.alert("Delete collage?", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => remove(item.id),
        },
      ]);
    },
    [remove],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Collage; index: number }) => {
      const thumb = item.thumbnailUri ?? item.backgroundUri;
      // Gentle asymmetry: nudge alternating columns to feel hand-placed.
      const offset = index % 2 === 0 ? 0 : 18;
      return (
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginTop: offset,
            },
          ]}
          onPress={() => router.push({ pathname: "/editor", params: { id: item.id } })}
          onLongPress={() => confirmDelete(item)}
        >
          <View style={styles.cardImageWrap}>
            <Image source={{ uri: thumb }} style={styles.cardImage} contentFit="cover" />
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
              {STYLES[item.styleId].name.toUpperCase()}
            </Text>
            <View style={[styles.cardDot, { backgroundColor: colors.accent }]} />
          </View>
        </Pressable>
      );
    },
    [colors, router, confirmDelete],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + WEB_TOP + 22 }}>
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: colors.primary }]}>
            LAYERLOOK · OUTFIT COLLAGE
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            The Studio
          </Text>
          <Text style={[styles.lede, { color: colors.mutedForeground }]}>
            An archive of your layered looks, turned into pages of a fashion
            story.
          </Text>
        </View>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />

        <View style={styles.directionsHead}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>
            CREATIVE DIRECTIONS
          </Text>
          <Text
            style={[styles.sectionNote, { color: colors.mutedForeground }]}
          >
            Five ways to style your story.
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.directionsRow}
        >
          {CREATIVE_DIRECTIONS.map((id) => (
            <DirectionPreview key={id} styleId={id} />
          ))}
        </ScrollView>
      </View>

      {!loaded ? null : collages.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="scissors" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nothing collected yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Gather a few outfit photos and arrange them into a layered fashion
            collage.
          </Text>
        </View>
      ) : (
        <FlatList
          data={collages}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: insets.bottom + WEB_BOTTOM + 120,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        onPress={() => router.push("/editor")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + WEB_BOTTOM + 26,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={20} color={colors.primaryForeground} />
        <Text style={[styles.fabText, { color: colors.primaryForeground }]}>
          New Collage
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  kicker: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2.6,
  },
  title: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 44,
    lineHeight: 48,
    marginTop: 6,
  },
  lede: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 300,
  },
  rule: {
    height: 1,
    marginHorizontal: 24,
  },
  directionsHead: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 14,
  },
  sectionKicker: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2.6,
  },
  sectionNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 5,
  },
  directionsRow: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 6,
  },
  column: { gap: 18 },
  card: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    padding: 8,
    marginBottom: 22,
  },
  cardImageWrap: {
    aspectRatio: 0.78,
    borderRadius: 22,
    overflow: "hidden",
  },
  cardImage: { flex: 1 },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 6,
  },
  cardLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.6,
  },
  cardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 44,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    borderWidth: 1,
  },
  emptyTitle: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 999,
    shadowColor: "#2E2E2B",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
