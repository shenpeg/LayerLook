import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  Image as SvgImage,
  Mask,
  Path,
  Rect,
} from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { useColors } from "@/hooks/useColors";
import { getImageAspect } from "@/lib/collage";

type Mode = "erase" | "restore";

interface Stroke {
  mode: Mode;
  size: number;
  points: number[][];
}

interface Props {
  cutoutUri: string;
  /** Original (pre-removal) photo. Restore is only available when present. */
  originalUri?: string;
  onCancel: () => void;
  onSave: (uri: string) => void;
}

const WEB_TOP = Platform.OS === "web" ? 67 : 0;

const BRUSH_SIZES = [
  { key: "s", value: 16, dot: 8 },
  { key: "m", value: 34, dot: 13 },
  { key: "l", value: 60, dot: 19 },
] as const;

function strokePath(points: number[][]): string {
  if (points.length === 0) return "";
  const [x0, y0] = points[0];
  let d = `M ${x0} ${y0}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0]} ${points[i][1]}`;
  }
  // A single tap should still paint a dot.
  if (points.length === 1) d += ` L ${x0 + 0.01} ${y0 + 0.01}`;
  return d;
}

export function CutoutBrush({
  cutoutUri,
  originalUri,
  onCancel,
  onSave,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const canRestore = !!originalUri;

  const [mode, setMode] = useState<Mode>("erase");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);

  const captureBoxRef = useRef<View>(null);
  const sizeRef = useRef(BRUSH_SIZES[sizeIdx].value);
  const modeRef = useRef<Mode>(mode);

  useEffect(() => {
    sizeRef.current = BRUSH_SIZES[sizeIdx].value;
  }, [sizeIdx]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Fit the cut-out into the available drawing area, preserving aspect.
  useEffect(() => {
    let cancelled = false;
    if (area.w <= 0 || area.h <= 0) return;
    getImageAspect(cutoutUri).then((aspect) => {
      if (cancelled) return;
      let w = area.w;
      let h = w / aspect;
      if (h > area.h) {
        h = area.h;
        w = h * aspect;
      }
      setBox({ w, h });
    });
    return () => {
      cancelled = true;
    };
  }, [cutoutUri, area.w, area.h]);

  const beginStroke = useCallback((x: number, y: number) => {
    setCurrent({
      mode: modeRef.current,
      size: sizeRef.current,
      points: [[x, y]],
    });
  }, []);

  const extendStroke = useCallback((x: number, y: number) => {
    setCurrent((prev) =>
      prev ? { ...prev, points: [...prev.points, [x, y]] } : prev,
    );
  }, []);

  const endStroke = useCallback(() => {
    setCurrent((prev) => {
      if (prev) setStrokes((s) => [...s, prev]);
      return null;
    });
  }, []);

  const pan = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => {
      runOnJS(beginStroke)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(extendStroke)(e.x, e.y);
    })
    .onEnd(() => {
      runOnJS(endStroke)();
    })
    .onFinalize(() => {
      runOnJS(endStroke)();
    });

  const undo = useCallback(() => {
    setStrokes((s) => s.slice(0, -1));
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }, []);

  const reset = useCallback(() => {
    setStrokes([]);
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }, []);

  const handleSave = useCallback(async () => {
    if (box.w <= 0) return;
    setSaving(true);
    try {
      // Let the final stroke render before snapshotting.
      await new Promise((r) => setTimeout(r, 60));
      const uri = await captureRef(captureBoxRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onSave(uri);
    } catch {
      setSaving(false);
    }
  }, [box.w, onSave]);

  const allStrokes = current ? [...strokes, current] : strokes;
  const hasEdits = allStrokes.length > 0;

  const headerPad = insets.top + WEB_TOP + 8;

  return (
    <View style={[styles.root, { backgroundColor: "#0E0D0C" }]}>
      <View style={[styles.header, { paddingTop: headerPad }]}>
        <Pressable onPress={onCancel} style={styles.headerBtn} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Clean Up</Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          hitSlop={8}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            Save
          </Text>
        </Pressable>
      </View>

      <View
        style={styles.stage}
        onLayout={(e) =>
          setArea({
            w: e.nativeEvent.layout.width - 32,
            h: e.nativeEvent.layout.height - 32,
          })
        }
      >
        {box.w > 0 ? (
          <GestureDetector gesture={pan}>
            <View
              ref={captureBoxRef}
              collapsable={false}
              style={{ width: box.w, height: box.h }}
            >
              <Svg width={box.w} height={box.h}>
                <Defs>
                  {/* Cut-out is hidden where erase strokes painted. */}
                  <Mask
                    id="eraseMask"
                    maskUnits="userSpaceOnUse"
                    maskContentUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width={box.w}
                    height={box.h}
                  >
                    <Rect
                      x="0"
                      y="0"
                      width={box.w}
                      height={box.h}
                      fill="white"
                    />
                    {allStrokes
                      .filter((s) => s.mode === "erase")
                      .map((s, i) => (
                        <Path
                          key={`e${i}`}
                          d={strokePath(s.points)}
                          stroke="black"
                          strokeWidth={s.size}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      ))}
                  </Mask>

                  {/* Original shows only where restore strokes win (in order). */}
                  <Mask
                    id="restoreMask"
                    maskUnits="userSpaceOnUse"
                    maskContentUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width={box.w}
                    height={box.h}
                  >
                    <Rect
                      x="0"
                      y="0"
                      width={box.w}
                      height={box.h}
                      fill="black"
                    />
                    {allStrokes.map((s, i) => (
                      <Path
                        key={`r${i}`}
                        d={strokePath(s.points)}
                        stroke={s.mode === "restore" ? "white" : "black"}
                        strokeWidth={s.size}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ))}
                  </Mask>
                </Defs>

                {canRestore ? (
                  <SvgImage
                    href={{ uri: originalUri }}
                    x="0"
                    y="0"
                    width={box.w}
                    height={box.h}
                    preserveAspectRatio="xMidYMid slice"
                    mask="url(#restoreMask)"
                  />
                ) : null}
                <SvgImage
                  href={{ uri: cutoutUri }}
                  x="0"
                  y="0"
                  width={box.w}
                  height={box.h}
                  preserveAspectRatio="xMidYMid meet"
                  mask="url(#eraseMask)"
                />
              </Svg>
            </View>
          </GestureDetector>
        ) : (
          <ActivityIndicator color="#fff" />
        )}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.modeRow}>
          <ModeChip
            icon="trash-2"
            label="Erase"
            active={mode === "erase"}
            color={colors.primary}
            onPress={() => setMode("erase")}
          />
          <ModeChip
            icon="rotate-ccw"
            label="Restore"
            active={mode === "restore"}
            color={colors.primary}
            disabled={!canRestore}
            onPress={() => setMode("restore")}
          />
        </View>

        <View style={styles.toolRow}>
          <View style={styles.sizes}>
            {BRUSH_SIZES.map((b, i) => {
              const active = i === sizeIdx;
              return (
                <Pressable
                  key={b.key}
                  onPress={() => setSizeIdx(i)}
                  style={[
                    styles.sizeBtn,
                    {
                      borderColor: active ? colors.primary : "rgba(255,255,255,0.2)",
                      backgroundColor: active
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                    },
                  ]}
                >
                  <View
                    style={{
                      width: b.dot,
                      height: b.dot,
                      borderRadius: b.dot / 2,
                      backgroundColor: active ? colors.primary : "#fff",
                    }}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.historyBtns}>
            <Pressable
              onPress={undo}
              disabled={!hasEdits}
              style={[styles.iconBtn, { opacity: hasEdits ? 1 : 0.35 }]}
              hitSlop={6}
            >
              <Feather name="corner-up-left" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={reset}
              disabled={!hasEdits}
              style={[styles.iconBtn, { opacity: hasEdits ? 1 : 0.35 }]}
              hitSlop={6}
            >
              <Feather name="x-circle" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.hint}>
          {mode === "erase"
            ? "Brush over stray bits to remove them."
            : "Brush to paint missing parts back in."}
        </Text>
      </View>

      {saving ? (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

function ModeChip({
  icon,
  label,
  active,
  color,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  active: boolean;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.modeChip,
        {
          backgroundColor: active ? color : "rgba(255,255,255,0.08)",
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      <Feather name={icon} size={17} color={active ? "#0E0D0C" : "#fff"} />
      <Text style={[styles.modeChipText, { color: active ? "#0E0D0C" : "#fff" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerBtn: { minWidth: 64 },
  cancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "#fff",
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#fff",
  },
  saveBtn: {
    minWidth: 64,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontFamily: "Inter_700Bold", fontSize: 15 },

  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  controls: { paddingTop: 12, paddingHorizontal: 16 },
  modeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  modeChipText: { fontFamily: "Inter_700Bold", fontSize: 15 },

  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sizes: { flexDirection: "row", gap: 10 },
  sizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBtns: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 14,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
