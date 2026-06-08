import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
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

import { AboutModal } from "@/components/AboutModal";
import { CollagePreview } from "@/components/CollagePreview";
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
  const [aboutOpen, setAboutOpen] = useState(false);

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
            <CollagePreview collage={item} />
            <Pressable
              onPress={() => confirmDelete(item)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.deleteBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="trash-2" size={15} color="#FFFFFF" />
            </Pressable>
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

  const listHeader = (
    <View style={{ paddingTop: insets.top + WEB_TOP + 22 }}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.kicker, { color: colors.primary }]}>
            LAYERLOOK · OUTFIT COLLAGE
          </Text>
          <Pressable
            onPress={() => setAboutOpen(true)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.infoBtn,
              { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="info" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
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
        <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>
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

      {loaded && collages.length > 0 ? (
        <View style={styles.historyHead}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>
            YOUR STORIES
          </Text>
          <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>
            Looks you have layered and saved.
          </Text>
        </View>
      ) : null}
    </View>
  );

  const emptyState = (
    <View style={styles.empty}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
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
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <FlatList
        data={loaded ? collages : []}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        numColumns={2}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={loaded ? emptyState : null}
        columnWrapperStyle={styles.column}
        contentContainerStyle={{
          paddingBottom: insets.bottom + WEB_BOTTOM + 120,
        }}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />

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

      <AboutModal visible={aboutOpen} onClose={() => setAboutOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  historyHead: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 6,
  },
  list: { flex: 1 },
  column: { gap: 18, paddingHorizontal: 20 },
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
    backgroundColor: "#000",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
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
