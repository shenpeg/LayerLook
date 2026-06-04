import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Collage } from "@/lib/collage";

const STORAGE_KEY = "outfit-collages-v1";

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
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw) as Collage[];
          if (Array.isArray(parsed)) setCollages(parsed);
        }
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
