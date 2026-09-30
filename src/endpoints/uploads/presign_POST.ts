import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { OutputType, UploadKind } from "./presign_POST.schema";
import { ApiError, handleApiError, jsonResponse, requireUser } from "../../helpers/apiUtils";

const MAX_BYTES = 4 * 1024 * 1024; // batas body Vercel Serverless Function ≈ 4,5 MB
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const KINDS: UploadKind[] = ["proof", "dispute", "watermark"];

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError("Penyimpanan file belum dikonfigurasi (BLOB_READ_WRITE_TOKEN)", 500);
    }
    const form = await request.formData().catch(() => {
      throw new ApiError("Body harus multipart/form-data", 400);
    });
    const kind = String(form.get("kind") ?? "") as UploadKind;
    const file = form.get("file");
    if (!KINDS.includes(kind)) throw new ApiError("Jenis unggahan tidak valid", 400);
    if (!(file instanceof File)) throw new ApiError("File tidak ditemukan", 400);
    if (file.size <= 0) throw new ApiError("File kosong", 400);
    if (file.size > MAX_BYTES) throw new ApiError("Ukuran file maksimal 4 MB", 400);
    const ext = EXT[file.type];
    if (!ext) throw new ApiError("Format file harus PNG, JPG, atau WebP", 400);

    let visibility: "public" | "private";
    if (kind === "watermark") {
      if (user.role !== "owner" && user.role !== "admin") {
        throw new ApiError("Hanya Owner yang dapat mengunggah logo watermark", 403);
      }
      if (file.type !== "image/png") throw new ApiError("Logo watermark harus berupa file PNG", 400);
      visibility = "public";
    } else {
      if (user.role !== "creator") throw new ApiError("Hanya Creator yang dapat mengunggah bukti", 403);
      visibility = "private";
    }

    // Vercel Blob hanya mendukung akses publik; URL dibuat acak (tidak bisa ditebak) dan
    // hanya dibagikan ke Admin & pemilik lewat API, sehingga tetap tidak terdaftar di UI publik.
    const pathname = `${kind}/${user.id}/${nanoid(14)}.${ext}`;
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });

    return jsonResponse({ url: blob.url, filename: blob.url, visibility } satisfies OutputType);
  } catch (error) {
    return handleApiError(error);
  }
}
