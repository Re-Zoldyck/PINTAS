import { useCallback, useState } from "react";
import { postUploadsPresign, UploadKind } from "../endpoints/uploads/presign_POST.schema";

export type UploadedFile = { filename: string; url: string; name: string };

/** Uploads a file through the API to Vercel Blob. Returns the URL to store in the DB. */
export function useFileUpload(kind: UploadKind) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      setError(null);
      setIsUploading(true);
      try {
        const res = await postUploadsPresign({ kind, file });
        return { filename: res.filename, url: res.url, name: file.name };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unggahan gagal";
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [kind]
  );

  return { upload, isUploading, error, clearError: () => setError(null) };
}
