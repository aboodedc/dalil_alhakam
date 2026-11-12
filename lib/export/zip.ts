"use client";

/**
 * ZIP helper for the batch image export.
 *
 * PNG data is already deflated, so the archive is stored without
 * re-compressing it (level 0) — that keeps the work fast and the size the
 * same as the sum of the images.
 */

import { zip } from "fflate";

export interface ZipEntry {
  /** File name inside the archive. */
  name: string;
  data: Uint8Array;
}

export function createZip(entries: ZipEntry[]): Promise<Uint8Array> {
  if (entries.length === 0) return Promise.resolve(new Uint8Array());

  const payload: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const entry of entries) {
    payload[entry.name] = [entry.data, { level: 0 }];
  }

  return new Promise((resolve, reject) => {
    zip(payload, { level: 0 }, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
}
