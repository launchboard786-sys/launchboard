import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { storage } from "@/lib/config";

/** Development/tests only: serves images saved to UPLOADS_LOCAL_DIR. Production uses Supabase Storage. */
export async function GET(_req: Request, { params }: { params: Promise<{ folder: string; owner: string; file: string }> }) {
  const { folder, owner, file } = await params;
  const rel = `${folder}/${owner}/${file}`;
  if (!storage.localDir || !/^[a-z]+\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.webp$/.test(rel)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(storage.localDir, rel));
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
