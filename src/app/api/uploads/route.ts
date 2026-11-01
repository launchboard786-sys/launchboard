import { NextResponse } from "next/server";
import { requireUser, requireVerified } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { route } from "@/lib/http";
import { MAX_UPLOAD_BYTES, processImage } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

/** Upload one logo or screenshot. multipart/form-data: file, kind = "logo" | "screenshot". */
export const POST = route(async (req) => {
  const user = await requireUser();
  requireVerified(user);
  rateLimit(`upload:${user.id}`, 40, 60 * 60_000, Date.now(), "You've uploaded a lot of images in the last hour. Please try again a bit later.");

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw badRequest("Images can be at most 8 MB.", "TOO_LARGE");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Send the image as a file upload.");
  }
  const kind = form.get("kind");
  const file = form.get("file");
  if (kind !== "logo" && kind !== "screenshot") throw badRequest("Unknown image type.");
  if (!(file instanceof Blob)) throw badRequest("Choose an image to upload.");
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest("Images can be at most 8 MB.", "TOO_LARGE");

  const { data, width, height } = await processImage(Buffer.from(await file.arrayBuffer()), kind);
  const url = await saveImage(kind === "logo" ? "logos" : "screenshots", user.id, data);
  return NextResponse.json({ url, width, height }, { status: 201 });
});
