import sharp, { type Metadata } from "sharp";
import { badRequest } from "./errors";

export type ImageKind = "logo" | "screenshot";

/** What we accept from people. SVG is deliberately excluded: it can carry scripts. */
const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "gif"]);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Validates an uploaded image by decoding it (not by trusting its name or type),
 * fixes phone rotation, strips metadata such as GPS location, resizes, and
 * re-encodes it as WebP. Returns the processed bytes and their size.
 */
export async function processImage(input: Buffer, kind: ImageKind) {
  if (input.length === 0) throw badRequest("That file is empty.", "BAD_IMAGE");
  if (input.length > MAX_UPLOAD_BYTES) throw badRequest("Images can be at most 8 MB.", "TOO_LARGE");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw badRequest("That file isn't an image we can read. Use PNG, JPG or WebP.", "BAD_IMAGE");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw badRequest("Use a PNG, JPG or WebP image.", "BAD_IMAGE");
  const w = meta.autoOrient?.width ?? meta.width ?? 0;
  const h = meta.autoOrient?.height ?? meta.height ?? 0;

  const base = sharp(input, { limitInputPixels: 40_000_000, animated: false }).rotate();
  try {
    if (kind === "logo") {
      if (w < 64 || h < 64) throw badRequest("Logos should be at least 64×64 pixels.", "TOO_SMALL");
      const { data, info } = await base
        .resize(256, 256, { fit: "cover", position: "attention" })
        .webp({ quality: 88 })
        .toBuffer({ resolveWithObject: true });
      return { data, width: info.width, height: info.height };
    }
    if (w < 320 || h < 200) throw badRequest("Screenshots should be at least 320×200 pixels.", "TOO_SMALL");
    const { data, info } = await base
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch (e) {
    if (e instanceof Error && e.name === "AppError") throw e;
    throw badRequest("That image looks damaged. Try exporting it again as PNG or JPG.", "BAD_IMAGE");
  }
}
