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
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCollages } from "@/context/CollageContext";
import { STYLES } from "@/constants/styles";
import { useColors } from "@/hooks/useColors";
import type { Collage } from "@/lib/collage";

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
    ({ item }: { item: Collage }) => {
      const thumb = item.thumbnailUri ?? item.backgroundUri;
      return (
        <Pressable
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: "/editor", params: { id: item.id } })}
          onLongPress={() => confirmDelete(item)}
        >
          <Image source={{ uri: thumb }} style={styles.cardImage} contentFit="cover" />
          <View style={styles.cardBadgeWrap}>
            <Text style={[styles.cardBadge, { backgroundColor: colors.primary, color: colors.primaryForeground }]}>
              {STYLES[item.styleId].name}
            </Text>
          </View>
        </Pressable>
      );
    },
    [colors, router, confirmDelete],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + WEB_TOP + 14 }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.primary }]}>OUTFIT COLLAGE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Your Studio</Text>
          </View>
        </View>
      </View>

      {!loaded ? null : collages.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="scissors" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No collages yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Pick a few outfit photos and turn them into a layered fashion
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
            padding: 16,
            paddingBottom: insets.bottom + WEB_BOTTOM + 110,
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
            bottom: insets.bottom + WEB_BOTTOM + 24,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={22} color={colors.primaryForeground} />
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  kicker: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    marginTop: 2,
  },
  column: { gap: 14 },
  card: {
    flex: 1,
    aspectRatio: 0.74,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  cardImage: { flex: 1 },
  cardBadgeWrap: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  cardBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
