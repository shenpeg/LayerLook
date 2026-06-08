import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CollageCanvas } from "@/components/CollageCanvas";
import { FORMATS } from "@/constants/styles";
import type { Collage } from "@/lib/collage";

/**
 * Renders a live, non-editable composition of a saved collage (background +
 * cut-out layers + style) so gallery previews always reflect what was actually
 * created — rather than relying on a captured thumbnail that can be missing.
 * The collage is rendered at its true format ratio and "covers" the card box.
 */
export function CollagePreview({ collage }: { collage: Collage }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const ratio = FORMATS[collage.formatId].ratio; // w / h

  let canvas = { w: 0, h: 0 };
  if (box.w > 0 && box.h > 0) {
    const boxRatio = box.w / box.h;
    if (ratio < boxRatio) {
      canvas = { w: box.w, h: box.w / ratio };
    } else {
      canvas = { h: box.h, w: box.h * ratio };
    }
  }

  return (
    <View
      style={styles.wrap}
      onLayout={(e) =>
        setBox({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
    >
      {canvas.w > 0 && collage.backgroundUri ? (
        <CollageCanvas
          backgroundUri={collage.backgroundUri}
          layers={collage.layers}
          styleId={collage.styleId}
          width={canvas.w}
          height={canvas.h}
          editable={false}
          staticRender
          showText={collage.showText ?? false}
          selectedId={null}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
