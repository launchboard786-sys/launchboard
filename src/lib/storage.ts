import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, storage } from "./config";
import { AppError } from "./errors";

/** Where uploaded files can be viewed. Used to accept only our own image URLs in listings. */
export function publicBase() {
  if (storage.supabaseUrl && storage.supabaseKey) return `${storage.supabaseUrl}/storage/v1/object/public/${storage.bucket}/`;
  if (storage.localDir) return `${config.appUrl}/files/`;
  return null;
}

export function isOurUpload(url: string) {
  const base = publicBase();
  return !!base && url.startsWith(base) && /^[a-z]+\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.webp$/.test(url.slice(base.length));
}

/** Saves processed WebP bytes and returns the public URL. */
export async function saveImage(folder: "logos" | "screenshots", ownerId: string, data: Buffer) {
  const key = `${folder}/${ownerId}/${randomUUID()}.webp`;

  if (storage.supabaseUrl && storage.supabaseKey) {
    // New Supabase secret keys (sb_secret_...) go in "apikey"; legacy service_role JWTs also as a Bearer token.
    const headers: Record<string, string> = { apikey: storage.supabaseKey, "Content-Type": "image/webp", "Cache-Control": "max-age=31536000", "x-upsert": "false" };
    if (storage.supabaseKey.startsWith("eyJ")) headers.Authorization = `Bearer ${storage.supabaseKey}`;
    const res = await fetch(`${storage.supabaseUrl}/storage/v1/object/${storage.bucket}/${key}`, {
      method: "POST",
      headers,
      body: new Uint8Array(data),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("[storage] Supabase upload failed", res.status, (await res.text()).slice(0, 300));
      throw new AppError(502, "UPLOAD_FAILED", "We couldn't save that image. Please try again.");
    }
    return `${publicBase()}${key}`;
  }

  if (storage.localDir) {
    const file = path.join(storage.localDir, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return `${publicBase()}${key}`;
  }

  throw new AppError(503, "UPLOADS_DISABLED", "Image uploads aren't switched on yet.");
}
