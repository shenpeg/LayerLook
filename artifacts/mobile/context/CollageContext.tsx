import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Asset } from "expo-asset";

import type { StyleId, FormatId } from "@/constants/styles";
import type { Collage } from "@/lib/collage";

const STORAGE_KEY = "outfit-collages-v1";
const SEEDED_KEY = "outfit-collages-seeded-v2";

/**
 * Ready-made stories shown the first time the app is opened (before the user
 * has saved anything of their own), so the gallery never starts empty. They use
 * bundled mood-board / collage images as their backgrounds, one per creative
 * direction.
 */
const SAMPLE_SOURCES: {
  mod: number;
  styleId: StyleId;
  formatId: FormatId;
}[] = [
  {
    mod: require("@/assets/images/styles/fashion-story.png") as number,
    styleId: "street",
    formatId: "story",
  },
  {
    mod: require("@/assets/images/styles/visual-diary.png") as number,
    styleId: "pinterest",
    formatId: "portrait",
  },
  {
    mod: require("@/assets/images/seeds/noir-grid.png") as number,
    styleId: "magazine",
    formatId: "story",
  },
  {
    mod: require("@/assets/images/seeds/collegiate.png") as number,
    styleId: "editorial",
    formatId: "story",
  },
  {
    mod: require("@/assets/images/seeds/autumn.png") as number,
    styleId: "scrapbook",
    formatId: "story",
  },
  {
    mod: require("@/assets/images/seeds/dessert.png") as number,
    styleId: "pinterest",
    formatId: "story",
  },
];

function buildSampleCollages(): Collage[] {
  const now = Date.now();
  return SAMPLE_SOURCES.map((sample, i) => {
    const resolved = Asset.fromModule(sample.mod);
    const uri = resolved?.uri ?? "";
    const ratio =
      resolved?.width && resolved?.height
        ? resolved.width / resolved.height
        : 0.71;
    return {
      id: `sample-${i + 1}`,
      backgroundUri: uri,
      backgroundAspectRatio: ratio,
      layers: [],
      styleId: sample.styleId,
      formatId: sample.formatId,
      thumbnailUri: uri,
      createdAt: now - i * 86_400_000,
      updatedAt: now - i * 86_400_000,
    };
  });
}

interface CollageContextValue {
  collages: Collage[];
  loaded: boolean;
  upsert: (collage: Collage) => void;
  remove: (id: string) => void;
  getById: (id: string) => Collage | undefined;
}

const CollageContext = createContext<CollageContextValue | null>(null);

export function CollageProvider({ children }: { children: React.ReactNode }) {
  const [collages, setCollages] = useState<Collage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [raw, seeded] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SEEDED_KEY),
        ]);

        let initial: Collage[] = [];
        if (raw) {
          const parsed = JSON.parse(raw) as Collage[];
          if (Array.isArray(parsed)) initial = parsed;
        }

        // Seed the sample stories once per seed-set version. The merge is
        // additive: only inject seeds whose id isn't already stored, so any
        // existing collage — including a sample story the user has since
        // edited (the editor autosaves under the same `sample-N` id) — is
        // preserved untouched.
        if (!seeded) {
          const existingIds = new Set(initial.map((c) => c.id));
          const missing = buildSampleCollages().filter(
            (s) => !existingIds.has(s.id),
          );
          if (missing.length > 0) {
            initial = [...missing, ...initial];
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial)).catch(
              () => {},
            );
          }
          AsyncStorage.setItem(SEEDED_KEY, "1").catch(() => {});
        }

        if (active) setCollages(initial);
      } catch {
        // ignore corrupt storage
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: Collage[]) => {
    setCollages(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const upsert = useCallback(
    (collage: Collage) => {
      setCollages((prev) => {
        const idx = prev.findIndex((c) => c.id === collage.id);
        const next =
          idx >= 0
            ? prev.map((c) => (c.id === collage.id ? collage : c))
            : [collage, ...prev];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const remove = useCallback(
    (id: string) => {
      setCollages((prev) => {
        const next = prev.filter((c) => c.id !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const getById = useCallback(
    (id: string) => collages.find((c) => c.id === id),
    [collages],
  );

  const value = useMemo(
    () => ({ collages, loaded, upsert, remove, getById }),
    [collages, loaded, upsert, remove, getById],
  );

  return (
    <CollageContext.Provider value={value}>{children}</CollageContext.Provider>
  );
}

export function useCollages(): CollageContextValue {
  const ctx = useContext(CollageContext);
  if (!ctx) throw new Error("useCollages must be used within CollageProvider");
  return ctx;
}
