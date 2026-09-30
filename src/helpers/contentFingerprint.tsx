import type { SocialPlatform } from "./schema";

export type ContentUrlInfo = {
  ok: boolean;
  fingerprint: string;
  platform: SocialPlatform | null;
  handle: string | null;
  host: string;
};

const HOST_PLATFORM: Array<[RegExp, SocialPlatform]> = [
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)youtube\.com$/, "youtube"],
  [/^youtu\.be$/, "youtube"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/^fb\.watch$/, "facebook"],
  [/(^|\.)x\.com$/, "x"],
  [/(^|\.)twitter\.com$/, "x"],
];

export function normalizeHandle(handle: string | null | undefined): string {
  return (handle ?? "").trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Normalizes a content URL into a stable fingerprint used for duplicate / reupload
 * detection, and extracts the platform + account handle when the URL shape allows it.
 */
export function analyzeContentUrl(rawUrl: string): ContentUrlInfo {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, fingerprint: rawUrl.trim().toLowerCase(), platform: null, handle: null, host: "" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, fingerprint: rawUrl.trim().toLowerCase(), platform: null, handle: null, host: url.hostname };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "").replace(/^vm\./, "").replace(/^vt\./, "");
  let platform: SocialPlatform | null = null;
  for (const [re, p] of HOST_PLATFORM) {
    if (re.test(host)) {
      platform = p;
      break;
    }
  }

  let path = url.pathname.replace(/\/+$/, "").toLowerCase();
  let fingerprint = `${host}${path}`;
  let handle: string | null = null;
  const segments = path.split("/").filter(Boolean);

  if (platform === "youtube") {
    const v = url.searchParams.get("v");
    if (host === "youtu.be" && segments[0]) {
      fingerprint = `youtube.com/watch/${segments[0]}`;
    } else if (v) {
      fingerprint = `youtube.com/watch/${v.toLowerCase()}`;
    } else if (segments[0] === "shorts" && segments[1]) {
      fingerprint = `youtube.com/watch/${segments[1]}`;
    }
    const at = segments.find((s) => s.startsWith("@"));
    if (at) handle = normalizeHandle(at);
  } else if (platform === "tiktok") {
    const at = segments.find((s) => s.startsWith("@"));
    if (at) handle = normalizeHandle(at);
    const videoIdx = segments.indexOf("video");
    if (videoIdx >= 0 && segments[videoIdx + 1]) {
      fingerprint = `tiktok.com/video/${segments[videoIdx + 1]}`;
    }
  } else if (platform === "x") {
    const statusIdx = segments.indexOf("status");
    if (statusIdx >= 1) {
      handle = normalizeHandle(segments[statusIdx - 1]);
      if (segments[statusIdx + 1]) fingerprint = `x.com/status/${segments[statusIdx + 1]}`;
    }
  } else if (platform === "instagram") {
    const kindIdx = segments.findIndex((s) => s === "reel" || s === "p" || s === "reels");
    if (kindIdx >= 0 && segments[kindIdx + 1]) {
      fingerprint = `instagram.com/media/${segments[kindIdx + 1]}`;
      if (kindIdx >= 1) handle = normalizeHandle(segments[kindIdx - 1]);
    }
  } else if (platform === "facebook") {
    if (segments[0] === "reel" && segments[1]) {
      fingerprint = `facebook.com/reel/${segments[1]}`;
    } else if (segments.includes("videos")) {
      const idx = segments.indexOf("videos");
      if (idx >= 1) handle = normalizeHandle(segments[idx - 1]);
      const id = segments[idx + 1];
      if (id) fingerprint = `facebook.com/videos/${id}`;
    }
  }

  return { ok: true, fingerprint, platform, handle, host };
}

export function extractHashtags(text: string): string[] {
  const found = new Set<string>();
  const re = /#([\p{L}\p{N}_]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return Array.from(found);
}

export function normalizeHashtag(tag: string): string {
  return tag.trim().replace(/^#+/, "").toLowerCase();
}