import superjson from "superjson";

export type UploadKind = "proof" | "dispute" | "watermark";

export type InputType = { kind: UploadKind; file: File };

export type OutputType = {
  url: string;
  filename: string;
  visibility: "public" | "private";
};

/** Multipart upload through the API to Vercel Blob (max 4 MB per file on Vercel functions). */
export const postUploadsPresign = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const form = new FormData();
  form.append("kind", body.kind);
  form.append("file", body.file, body.file.name);
  const result = await fetch(`/_api/uploads/presign`, { method: "POST", body: form, ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
