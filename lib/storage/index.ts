import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type BucketConfig,
  BucketError,
  configFromEnv,
  extensionFor,
  put as putToGithub,
  type StoredImage,
  validateFile,
} from "@/lib/storage/github";

/**
 * انتخاب ذخیره‌ساز: گیت‌هاب، وگرنه دیسک محلی.
 *
 * The GitHub bucket is the intended home — public CDN, versioned, free — but a
 * token that has not been pasted into `.env` yet should not break the app. So
 * in development, uploads land in `public/uploads/` and the same interface is
 * served. Two paths, one interface; the bucket wins the moment it is configured.
 */

export type { StoredImage } from "@/lib/storage/github";

const LOCAL_ROOT = path.join(process.cwd(), "public", "uploads");

export const storageDriver = configFromEnv() ? "github" : "local";

/** مسیر عمومیِ یک تصویر ذخیره‌شده — همان چیزی که در دیتابیس ذخیره می‌شود. */
export function imageUrl(stored: StoredImage): string {
  return stored.url;
}

async function putToDisk(
  file: File,
  options: { subdir: string; maxBytes: number },
): Promise<StoredImage> {
  const invalid = validateFile(file, options.maxBytes);
  if (invalid) throw new BucketError(invalid, 400, true);

  const ext = extensionFor(file);
  if (!ext) throw new BucketError("قالب فایل پشتیبانی نمی‌شود.", 415, true);

  const name = `${crypto.randomUUID()}.${ext}`;
  const rel = `${options.subdir}/${name}`;
  const target = path.join(LOCAL_ROOT, rel);

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));

  return { path: rel, name, size: file.size, url: `/uploads/${rel}` };
}

/**
 * تصویر را ذخیره می‌کند و رکوردش را برمی‌گرداند.
 *
 * Returns a `path` and a `url`, never a buffer: the caller stores the path in
 * the database and renders the url. Falling back to disk on a GitHub failure
 * would be worse than failing — a receipt that silently went somewhere else is
 * a receipt nobody can find later.
 */
export async function storeImage(
  file: File,
  options: { subdir: string; maxBytes: number; config?: BucketConfig | null },
): Promise<StoredImage> {
  const config = options.config === undefined ? configFromEnv() : options.config;

  if (!config) return putToDisk(file, options);

  return putToGithub(config, file, options);
}

export { BucketError };