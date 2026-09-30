/**
 * Files are stored on Vercel Blob; the value saved in the *_filename columns is the
 * blob URL itself, so it can be returned as-is.
 */
export async function privateFileUrl(
  filename: string | null | undefined,
  _expiresInSeconds = 3600
): Promise<string | null> {
  if (!filename) return null;
  return filename;
}
