import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const WEB_TOP = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM = Platform.OS === "web" ? 34 : 0;

function TechBlock({
  name,
  tag,
  intro,
  items,
}: {
  name: string;
  tag?: string;
  intro: string;
  items: string[];
}) {
  const colors = useColors();
  return (
    <View style={styles.techBlock}>
      <View style={styles.techHead}>
        <Text style={[styles.techName, { color: colors.foreground }]}>
          {name}
        </Text>
        {tag ? (
          <Text style={[styles.techTag, { color: colors.primary }]}>{tag}</Text>
        ) : null}
      </View>
      <Text style={[styles.techIntro, { color: colors.mutedForeground }]}>
        {intro}
      </Text>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.bulletText, { color: colors.secondaryForeground }]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function AboutModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top + WEB_TOP + 28 }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginBottom: insets.bottom + WEB_BOTTOM + 28,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Text style={[styles.kicker, { color: colors.primary }]}>
              ABOUT
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              LayerLook
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Turn outfit photos and fashion references into polished,
              social-ready visual stories.
            </Text>

            <View style={[styles.rule, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionKicker, { color: colors.primary }]}>
              TEAM
            </Text>
            <Text style={[styles.bodyStrong, { color: colors.foreground }]}>
              Built by Team Laputa
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Peggy Shen &amp; Bernice Sun
            </Text>

            <View style={[styles.rule, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionKicker, { color: colors.primary }]}>
              TECHNOLOGY
            </Text>
            <TechBlock
              name="Replit"
              intro="Used for:"
              items={[
                "Application development",
                "Rapid prototyping",
                "Deployment",
                "Full-stack workflow",
              ]}
            />
            <TechBlock
              name="Google Gemini"
              intro="Used for:"
              items={[
                "Background removal",
                "Image editing assistance",
                "Visual processing",
                "Fashion asset extraction",
              ]}
            />
            <TechBlock
              name="Alibaba Cloud"
              tag="PLANNED"
              intro="Future integration for:"
              items={[
                "Fashion image understanding",
                "Garment recognition",
                "Accessory detection",
                "Subject segmentation",
                "Color palette extraction",
              ]}
            />
            <TechBlock
              name="Magnific"
              tag="PLANNED"
              intro="Future integration for:"
              items={[
                "Image enhancement",
                "Upscaling",
                "Fabric and texture detail improvement",
                "Editorial-quality output refinement",
              ]}
            />

            <View style={[styles.rule, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionKicker, { color: colors.primary }]}>
              WHY WE BUILT THIS
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Many fashion creators manually assemble outfit collages and
              Instagram Stories by cutting out images, removing backgrounds,
              arranging layouts, and experimenting with compositions.
            </Text>
            <Text
              style={[
                styles.body,
                { color: colors.mutedForeground, marginTop: 12 },
              ]}
            >
              LayerLook helps automate that process so creators can spend less
              time editing and more time creating.
            </Text>

            <View style={[styles.rule, { backgroundColor: colors.border }]} />

            <Text style={[styles.footer, { color: colors.mutedForeground }]}>
              Built during the UPSCALE Hackathon 2026.
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(46,46,43,0.32)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  sheet: {
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: "100%",
    overflow: "hidden",
    shadowColor: "#2E2E2B",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 30,
  },
  kicker: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2.6,
  },
  title: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 40,
    lineHeight: 44,
    marginTop: 4,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  rule: {
    height: 1,
    marginVertical: 22,
  },
  sectionKicker: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2.6,
    marginBottom: 12,
  },
  bodyStrong: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  techBlock: {
    marginBottom: 18,
  },
  techHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  techName: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 22,
  },
  techTag: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.6,
    marginTop: 4,
  },
  techIntro: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 11,
  },
  bulletText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: "center",
  },
});
