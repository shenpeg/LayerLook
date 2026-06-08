import { Platform } from "react-native";
import { Asset } from "expo-asset";

import { uriToBase64 } from "@/lib/collage";

/**
 * A ready-made set of outfit photos so a user can try building a collage
 * without picking their own images. An editorial backdrop plus a few clothing
 * items shot on clean backgrounds (so the cut-out / background removal works
 * well). Shape matches the editor's picked-asset format.
 */
export interface SampleAsset {
  uri: string;
  base64: string;
  mime: string;
  aspect: number;
}

const SAMPLE_MODULES: number[] = [
  require("@/assets/images/samples/backdrop.png") as number,
  require("@/assets/images/samples/sweater.png") as number,
  require("@/assets/images/samples/trousers.png") as number,
  require("@/assets/images/samples/loafers.png") as number,
  require("@/assets/images/samples/bag.png") as number,
];

/** Read a (web) image URL into a base64 string via fetch + FileReader. */
async function fetchBase64Web(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function toAsset(mod: number): Promise<SampleAsset> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const base64 =
    Platform.OS === "web" ? await fetchBase64Web(uri) : await uriToBase64(uri);
  const aspect = asset.width && asset.height ? asset.width / asset.height : 1;
  return { uri, base64, mime: "image/png", aspect };
}

/** Resolve all bundled sample photos into ready-to-use picked assets. */
export function loadSampleSet(): Promise<SampleAsset[]> {
  return Promise.all(SAMPLE_MODULES.map(toAsset));
}
