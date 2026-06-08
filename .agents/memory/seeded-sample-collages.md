---
name: Seeded sample collages
description: How the mobile gallery's starter "saved stories" are seeded and why the reseed merge must be additive.
---

The mobile app (artifacts/mobile) shows ready-made "saved stories" in the gallery on first launch. These are defined in `context/CollageContext.tsx` as `SAMPLE_SOURCES` (a bundled image + styleId + formatId per entry); `buildSampleCollages()` turns each into a `Collage` with id `sample-N`, `layers: []`, and background/thumbnail set to the bundled image uri.

A story's displayed title comes from its style name (`constants/styles.ts`): magazine = "Modernist", street = "Fashion Story", pinterest = "Visual Diary", editorial = "Editorial", scrapbook = "Scrapbook". So to add a "Modernist" seed you give it `styleId: "magazine"`.

Seeding runs once per seed-set version, gated by the `SEEDED_KEY` AsyncStorage marker. To make a changed `SAMPLE_SOURCES` reach existing installs, bump `SEEDED_KEY` (e.g. v1 -> v2).

**Rule:** the reseed merge must be additive — only inject seeds whose `id` is not already stored, and never blanket-remove existing `sample-*` entries.

**Why:** the editor autosaves an edited story under the same `sample-N` id. The old merge rebuilt all samples and dropped existing `sample-*` rows, which would silently delete a seeded story the user had since edited. Additive-by-id preserves all existing collages (a previously-deleted seed may reappear once on a version bump, but that is not data loss).
