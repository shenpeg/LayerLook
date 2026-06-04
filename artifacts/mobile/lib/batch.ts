export interface BatchOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Run an async processor over items with bounded concurrency, preserving input
 * order in the results. Self-contained so the mobile bundle never imports the
 * server-side integration library (which pulls @google/genai and relies on
 * Metro package-exports subpath resolution that breaks on cold starts).
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {},
): Promise<R[]> {
  const { concurrency = 3, onProgress } = options;
  const results = new Array<R>(items.length);
  let next = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await processor(items[index], index);
      completed++;
      onProgress?.(completed, items.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
