import { Feather } from "@expo/vector-icons";
import { removeBackground as removeBackgroundApi } from "@workspace/api-client-react";
import { batchProcess } from "@/lib/batch";
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
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { CollageCanvas } from "@/components/CollageCanvas";
import { CutoutBrush } from "@/components/CutoutBrush";
import { Toast } from "@/components/Toast";
import { ChooseBackground } from "@/components/editor/ChooseBackground";
import { EditorControls } from "@/components/editor/EditorControls";
import { EmptyState } from "@/components/editor/EmptyState";
import { LayerToolbar } from "@/components/editor/LayerToolbar";
import { Processing } from "@/components/editor/Processing";
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
  type PickedAsset,
} from "@/lib/collage";
import { loadSampleSet } from "@/lib/sampleSet";

type Phase = "empty" | "choose-bg" | "processing" | "edit";

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
  }, [pickPhotos, processCutouts]);

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
        <EmptyState
          onPickPhotos={startNew}
          onTrySamples={startWithSamples}
          samplesLoading={samplesLoading}
        />
      ) : null}

      {phase === "choose-bg" ? (
        <ChooseBackground
          picked={picked}
          bgChoice={bgChoice}
          onChoose={setBgChoice}
          onConfirm={() => {
            if (bgChoice !== null) processCutouts(picked, bgChoice);
          }}
        />
      ) : null}

      {phase === "processing" ? <Processing progress={progress} /> : null}

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
            <LayerToolbar
              onRecut={rerunRemoval}
              onCleanup={() => setBrushLayerId(selected.id)}
              onCopy={duplicateSelected}
              onForward={bringForward}
              onBack={sendBackward}
              onDelete={deleteSelected}
            />
          ) : null}

          <EditorControls
            styleId={styleId}
            formatId={formatId}
            showText={showText}
            onStyleChange={setStyleId}
            onFormatChange={setFormatId}
            onToggleText={() => setShowText((v) => !v)}
            onAddPhotos={addMorePhotos}
            onShare={() => handleExport("share")}
            onSave={() => handleExport("save")}
          />
        </>
      ) : null}

      {processError ? (
        <Toast
          message={processError}
          onDismiss={() => setProcessError(null)}
          bottom={insets.bottom + 200}
        />
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
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
