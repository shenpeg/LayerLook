import { Feather } from "@expo/vector-icons";
import { removeBackground as removeBackgroundApi } from "@workspace/api-client-react";
import { batchProcess } from "@/lib/batch";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { CollageCanvas } from "@/components/CollageCanvas";
import { CutoutBrush } from "@/components/CutoutBrush";
import { FormatBar } from "@/components/FormatBar";
import { StyleBar } from "@/components/StyleBar";
import { FORMATS, STYLES, type FormatId, type StyleId } from "@/constants/styles";
import { useCollages } from "@/context/CollageContext";
import { useColors } from "@/hooks/useColors";
import {
  genId,
  getImageAspect,
  mimeFromUri,
  persistUri,
  saveBase64,
  scatterTransform,
  uriToBase64,
  type Collage,
  type Layer,
} from "@/lib/collage";
import { loadSampleSet } from "@/lib/sampleSet";

type Phase = "empty" | "choose-bg" | "processing" | "edit";

interface PickedAsset {
  uri: string;
  base64: string;
  mime: string;
  aspect: number;
}

const WEB_TOP = Platform.OS === "web" ? 67 : 0;

export default function EditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { upsert, getById } = useCollages();
  const params = useLocalSearchParams<{ id?: string }>();

  const idRef = useRef<string>(params.id ?? genId());
  const createdAtRef = useRef<number>(Date.now());

  const [phase, setPhase] = useState<Phase>("empty");
  const [picked, setPicked] = useState<PickedAsset[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [processError, setProcessError] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!processError) return;
    toastOpacity.setValue(0);
    const useNativeDriver = Platform.OS !== "web";
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver,
      }).start(({ finished }) => {
        if (finished) setProcessError(null);
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [processError, toastOpacity]);

  const [backgroundUri, setBackgroundUri] = useState("");
  const [backgroundAspect, setBackgroundAspect] = useState(1);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [styleId, setStyleId] = useState<StyleId>("editorial");
  const [formatId, setFormatId] = useState<FormatId>("story");
  const [showText, setShowText] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [bgChoice, setBgChoice] = useState<number | null>(null);

  const [area, setArea] = useState({ w: 0, h: 0 });
  const canvasRef = useRef<View>(null);

  // Load an existing collage for editing.
  useEffect(() => {
    if (!params.id) return;
    const existing = getById(params.id);
    if (existing) {
      createdAtRef.current = existing.createdAt;
      setBackgroundUri(existing.backgroundUri);
      setBackgroundAspect(existing.backgroundAspectRatio);
      setLayers(existing.layers);
      setStyleId(existing.styleId);
      setFormatId(existing.formatId);
      setShowText(existing.showText ?? false);
      setPhase("edit");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const displaySize = useMemo(() => {
    if (area.w <= 0 || area.h <= 0) return { w: 0, h: 0 };
    const ratio = FORMATS[formatId].ratio; // w / h
    let w = area.w;
    let h = w / ratio;
    if (h > area.h) {
      h = area.h;
      w = h * ratio;
    }
    return { w, h };
  }, [area, formatId]);

  const buildCollage = useCallback(
    (thumbnailUri?: string): Collage => ({
      id: idRef.current,
      backgroundUri,
      backgroundAspectRatio: backgroundAspect,
      layers,
      styleId,
      formatId,
      showText,
      thumbnailUri,
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
    }),
    [backgroundUri, backgroundAspect, layers, styleId, formatId, showText],
  );

  // Auto-save edits (without re-capturing a thumbnail).
  useEffect(() => {
    if (phase !== "edit" || !backgroundUri) return;
    const existing = getById(idRef.current);
    upsert(buildCollage(existing?.thumbnailUri));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, styleId, formatId, showText, phase, backgroundUri]);

  const pickPhotos = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to build a collage.",
      );
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      base64: true,
      quality: 0.9,
    });
    if (result.canceled) return null;
    const assets: PickedAsset[] = result.assets
      .filter((a) => a.base64)
      .map((a) => ({
        uri: a.uri,
        base64: a.base64 as string,
        mime: a.mimeType ?? mimeFromUri(a.uri),
        aspect: a.width && a.height ? a.width / a.height : 1,
      }));
    return assets;
  }, []);

  const startNew = useCallback(async () => {
    const assets = await pickPhotos();
    if (!assets || assets.length === 0) return;
    setPicked(assets);
    if (assets.length === 1) {
      // Single photo: use it as background only.
      await processCutouts(assets, 0);
    } else {
      setBgChoice(null);
      setPhase("choose-bg");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickPhotos]);

  const startWithSamples = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const assets = await loadSampleSet();
      if (assets.length === 0) return;
      setPicked(assets);
      setBgChoice(null);
      setPhase("choose-bg");
    } catch {
      Alert.alert(
        "Couldn't load samples",
        "Something went wrong loading the sample set. Please try again.",
      );
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  const cutoutFromAsset = useCallback(
    async (asset: PickedAsset, index: number): Promise<Layer | null> => {
      try {
        const res = await removeBackgroundApi({
          image: asset.base64,
          mimeType: asset.mime,
        });
        const uri = await saveBase64(res.image, `cutout_${genId()}.png`);
        // Keep the original photo so the user can re-cut or restore later.
        const originalUri = await persistUri(
          asset.uri,
          `orig_${genId()}.${asset.mime === "image/png" ? "png" : "jpg"}`,
        );
        const aspect = await getImageAspect(uri);
        const jitter = STYLES[styleId].jitter;
        const scatter = scatterTransform(index, 6, jitter);
        return {
          id: genId(),
          uri,
          originalUri,
          aspectRatio: aspect,
          ...scatter,
          scale: 1,
          z: index + 1,
        };
      } catch {
        return null;
      }
    },
    [styleId],
  );

  const processCutouts = useCallback(
    async (assets: PickedAsset[], bgIndex: number) => {
      setPhase("processing");
      setProcessError(null);
      const bg = assets[bgIndex];
      const others = assets.filter((_, i) => i !== bgIndex);
      setProgress({ done: 0, total: others.length });

      // On web, the picker's blob: URL doesn't survive a reload, leaving saved
      // stories with a dead background (a black card). Persist the background
      // as an inline data URI on web so it always reloads.
      const bgUri =
        Platform.OS === "web"
          ? `data:${bg.mime};base64,${bg.base64}`
          : await persistUri(bg.uri, `bg_${genId()}.jpg`);
      setBackgroundUri(bgUri);
      setBackgroundAspect(bg.aspect);

      const results = await batchProcess(
        others,
        (asset, index) => cutoutFromAsset(asset, index),
        {
          concurrency: 3,
          onProgress: (completed) =>
            setProgress({ done: completed, total: others.length }),
        },
      );

      const newLayers = results.filter((l): l is Layer => l !== null);
      const failures = results.length - newLayers.length;

      setLayers(newLayers);
      if (failures > 0) {
        setProcessError(
          failures > 1
            ? `${failures} photos couldn't be cut out and were skipped.`
            : `1 photo couldn't be cut out and was skipped.`,
        );
      }
      setPhase("edit");
    },
    [cutoutFromAsset],
  );

  const addMorePhotos = useCallback(async () => {
    const assets = await pickPhotos();
    if (!assets || assets.length === 0) return;
    setBusy(true);
    const startZ = layers.reduce((m, l) => Math.max(m, l.z), 0) + 1;
    const added: Layer[] = [];
    for (let i = 0; i < assets.length; i++) {
      const layer = await cutoutFromAsset(assets[i], i);
      if (layer) added.push({ ...layer, z: startZ + i });
    }
    setLayers((prev) => [...prev, ...added]);
    setBusy(false);
  }, [pickPhotos, cutoutFromAsset, layers]);

  // ---- layer manipulation ----
  const updateLayer = useCallback((id: string, update: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...update } : l)),
    );
  }, []);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const [brushLayerId, setBrushLayerId] = useState<string | null>(null);
  const brushLayer = layers.find((l) => l.id === brushLayerId) ?? null;

  // Re-run background removal on the selected cut-out alone.
  const rerunRemoval = useCallback(async () => {
    if (!selected) return;
    const src = selected.originalUri ?? selected.uri;
    setBusy(true);
    try {
      const base64 = await uriToBase64(src);
      const res = await removeBackgroundApi({
        image: base64,
        mimeType: mimeFromUri(src, "image/png"),
      });
      const uri = await saveBase64(res.image, `cutout_${genId()}.png`);
      const aspect = await getImageAspect(uri);
      updateLayer(selected.id, { uri, aspectRatio: aspect });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert(
        "Couldn't redo",
        "Background removal failed for this photo. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [selected, updateLayer]);

  // Persist the brushed-up cut-out and swap it into the layer.
  const handleBrushSave = useCallback(
    async (tmpUri: string) => {
      const id = brushLayerId;
      setBrushLayerId(null);
      if (!id) return;
      setBusy(true);
      try {
        const uri = await persistUri(tmpUri, `cutout_${genId()}.png`);
        const aspect = await getImageAspect(uri);
        updateLayer(id, { uri, aspectRatio: aspect });
      } catch {
        Alert.alert("Couldn't save", "Editing the cut-out failed. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [brushLayerId, updateLayer],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const maxZ = layers.reduce((m, l) => Math.max(m, l.z), 0);
    const copy: Layer = {
      ...selected,
      id: genId(),
      xFrac: selected.xFrac + 0.06,
      yFrac: selected.yFrac + 0.06,
      z: maxZ + 1,
    };
    setLayers((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }, [selected, layers]);

  const bringForward = useCallback(() => {
    if (!selected) return;
    const maxZ = layers.reduce((m, l) => Math.max(m, l.z), 0);
    updateLayer(selected.id, { z: maxZ + 1 });
  }, [selected, layers, updateLayer]);

  const sendBackward = useCallback(() => {
    if (!selected) return;
    const minZ = layers.reduce((m, l) => Math.min(m, l.z), 0);
    updateLayer(selected.id, { z: minZ - 1 });
  }, [selected, layers, updateLayer]);

  const captureCanvas = useCallback(async () => {
    return captureRef(canvasRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
  }, []);

  const handleExport = useCallback(
    async (mode: "save" | "share") => {
      if (!backgroundUri || displaySize.w <= 0) return;
      setSelectedId(null);
      setBusy(true);
      try {
        // allow deselect to render before capture
        await new Promise((r) => setTimeout(r, 80));
        const uri = await captureCanvas();

        // Persist a thumbnail for the gallery.
        const thumb = await persistUri(uri, `thumb_${idRef.current}.png`);
        upsert(buildCollage(thumb));

        if (mode === "save") {
          if (Platform.OS === "web") {
            Alert.alert("Saved", "Export captured.");
          } else {
            const perm = await MediaLibrary.requestPermissionsAsync();
            if (!perm.granted) {
              Alert.alert(
                "Permission needed",
                "Allow photo library access to save.",
              );
              return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Saved", "Your collage was saved to Photos.");
          }
        } else {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { mimeType: "image/png" });
          } else {
            Alert.alert("Sharing unavailable", "Try saving instead.");
          }
        }
      } catch {
        Alert.alert("Export failed", "Something went wrong. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [backgroundUri, displaySize.w, captureCanvas, buildCollage, upsert],
  );

  const handleDone = useCallback(async () => {
    if (!backgroundUri) {
      router.back();
      return;
    }
    setSelectedId(null);
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const uri = await captureCanvas();
      const thumb = await persistUri(uri, `thumb_${idRef.current}.png`);
      upsert(buildCollage(thumb));
    } catch {
      upsert(buildCollage(getById(idRef.current)?.thumbnailUri));
    } finally {
      setBusy(false);
      router.back();
    }
  }, [backgroundUri, captureCanvas, buildCollage, upsert, getById, router]);

  // ---- render ----
  const headerPad = insets.top + WEB_TOP + 8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: headerPad }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {phase === "edit" ? "Edit Collage" : "New Collage"}
        </Text>
        {phase === "edit" ? (
          <Pressable
            onPress={handleDone}
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            hitSlop={8}
          >
            <Text style={[styles.doneText, { color: colors.primaryForeground }]}>
              Done
            </Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {phase === "empty" ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="image" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.bigTitle, { color: colors.foreground }]}>
            Choose your photos
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Pick a background shot plus a few outfit photos to cut out and
            layer.
          </Text>
          <Pressable
            onPress={startNew}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="upload" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              Pick Photos
            </Text>
          </Pressable>
          <Pressable
            onPress={startWithSamples}
            disabled={samplesLoading}
            style={[
              styles.secondaryBtn,
              { borderColor: colors.border, opacity: samplesLoading ? 0.6 : 1 },
            ]}
          >
            {samplesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="layers" size={18} color={colors.foreground} />
            )}
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
              {samplesLoading ? "Loading sample set…" : "Try a sample set"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {phase === "choose-bg" ? (
        <View style={styles.chooseWrap}>
          <Text style={[styles.bigTitle, { color: colors.foreground, textAlign: "left" }]}>
            Pick a background
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground, textAlign: "left", marginBottom: 18 }]}>
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
                  onPress={() => setBgChoice(i)}
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
            onPress={() => {
              if (bgChoice !== null) processCutouts(picked, bgChoice);
            }}
          >
            <Text
              style={[
                styles.confirmBtnText,
                {
                  color:
                    bgChoice === null
                      ? colors.mutedForeground
                      : colors.primaryForeground,
                },
              ]}
            >
              {bgChoice === null ? "Select a background" : "Continue"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {phase === "processing" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.bigTitle, { color: colors.foreground, marginTop: 20 }]}>
            Cutting out your outfits
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {progress.total > 0
              ? `Removing backgrounds ${progress.done}/${progress.total}`
              : "Preparing your canvas"}
          </Text>
        </View>
      ) : null}

      {phase === "edit" ? (
        <>
          <View
            style={styles.stage}
            onLayout={(e) =>
              setArea({
                w: e.nativeEvent.layout.width - 24,
                h: e.nativeEvent.layout.height - 24,
              })
            }
          >
            {displaySize.w > 0 && backgroundUri ? (
              <CollageCanvas
                innerRef={canvasRef}
                backgroundUri={backgroundUri}
                layers={layers}
                styleId={styleId}
                width={displaySize.w}
                height={displaySize.h}
                editable
                showText={showText}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={updateLayer}
              />
            ) : null}
          </View>

          {selected ? (
            <View style={[styles.layerBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.layerBarContent}
              >
                <LayerAction icon="refresh-ccw" label="Re-cut" color={colors.foreground} onPress={rerunRemoval} />
                <LayerAction icon="edit-2" label="Clean up" color={colors.foreground} onPress={() => setBrushLayerId(selected.id)} />
                <LayerAction icon="copy" label="Copy" color={colors.foreground} onPress={duplicateSelected} />
                <LayerAction icon="arrow-up" label="Forward" color={colors.foreground} onPress={bringForward} />
                <LayerAction icon="arrow-down" label="Back" color={colors.foreground} onPress={sendBackward} />
                <LayerAction icon="trash-2" label="Delete" color={colors.destructive} onPress={deleteSelected} />
              </ScrollView>
            </View>
          ) : null}

          <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
            <StyleBar value={styleId} onChange={setStyleId} />
            <View style={{ height: 12 }} />
            <FormatBar value={formatId} onChange={setFormatId} />
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setShowText((v) => !v)}
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
                onPress={addMorePhotos}
                style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              >
                <Feather name="plus" size={18} color={colors.foreground} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Add</Text>
              </Pressable>
              <Pressable
                onPress={() => handleExport("share")}
                style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              >
                <Feather name="share-2" size={18} color={colors.foreground} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Share</Text>
              </Pressable>
              <Pressable
                onPress={() => handleExport("save")}
                style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="download" size={18} color={colors.primaryForeground} />
                <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {processError ? (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.foreground, bottom: insets.bottom + 200, opacity: toastOpacity },
          ]}
        >
          <Pressable onPress={() => setProcessError(null)} style={styles.toastInner}>
            <Text style={styles.toastText}>{processError}</Text>
            <Text style={styles.toastDismiss}>Tap to dismiss</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {brushLayer ? (
        <CutoutBrush
          cutoutUri={brushLayer.uri}
          originalUri={brushLayer.originalUri}
          onCancel={() => setBrushLayerId(null)}
          onSave={handleBrushSave}
        />
      ) : null}

      {busy ? (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 24,
  },
  doneBtn: {
    height: 42,
    paddingHorizontal: 22,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.3,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
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
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 999,
    marginTop: 28,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
  },
  secondaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.3,
  },

  chooseWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
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

  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
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

  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  toastInner: {
    alignItems: "center",
  },
  toastText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  toastDismiss: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
