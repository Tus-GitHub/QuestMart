import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth.mjs";
import {
  ApiError,
  assertSameOrigin,
  errorResponse,
  jsonResponse,
} from "@/lib/http.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";
import { query } from "@/lib/db.mjs";

export const runtime = "nodejs";
export async function POST(request) {
  let blob;
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await rateLimit(request, "photo-upload", 20, user._id);
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID)
      throw new ApiError(
        503,
        "Photo uploads are being configured. Please try again later.",
      );
    if (
      !/^multipart\/form-data;/i.test(request.headers.get("content-type") || "")
    )
      throw new ApiError(415, "Choose a JPEG, PNG or WebP image.");
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Choose an image to upload.");
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 3500000) {
          await reader.cancel();
          throw new ApiError(413, "Keep each photo under 3 MB.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const form = await new Response(Buffer.concat(chunks, size), {
      headers: { "Content-Type": request.headers.get("content-type") },
    }).formData();
    const file = form.get("photo");
    if (
      !file ||
      typeof file.arrayBuffer !== "function" ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 3000000
    )
      throw new ApiError(400, "Choose a JPEG, PNG or WebP under 3 MB.");
    let image;
    try {
      image = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 25000000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new ApiError(
        400,
        "That image could not be read. Choose a different photo.",
      );
    }
    const environment = process.env.VERCEL_ENV || "development";
    blob = await put(
      `${environment}/listings/${user._id}/${randomUUID()}.webp`,
      image,
      { access: "public", contentType: "image/webp", addRandomSuffix: false },
    );
    await query(
      "INSERT INTO uploads(owner_id,url,size_bytes) VALUES($1,$2,$3)",
      [user._id, blob.url, image.length],
    );
    return jsonResponse({ success: true, url: blob.url }, 201);
  } catch (error) {
    if (blob) await del(blob.url).catch(() => {});
    return errorResponse(error);
  }
}
