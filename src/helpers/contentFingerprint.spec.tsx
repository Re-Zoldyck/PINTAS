import { analyzeContentUrl, extractHashtags, normalizeHandle } from "./contentFingerprint";

describe("analyzeContentUrl", () => {
  it("detects the platform and handle from a TikTok URL and normalizes the fingerprint", () => {
    const a = analyzeContentUrl("https://www.tiktok.com/@Dimas.Creates/video/7301234567890123456?is_from_webapp=1");
    const b = analyzeContentUrl("https://vm.tiktok.com/@dimas.creates/video/7301234567890123456/");
    expect(a.ok).toBe(true);
    expect(a.platform).toBe("tiktok");
    expect(a.handle).toBe("dimas.creates");
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it("treats youtu.be, watch?v= and shorts as the same video", () => {
    const a = analyzeContentUrl("https://youtu.be/AbC123xyz");
    const b = analyzeContentUrl("https://www.youtube.com/watch?v=AbC123xyz&t=10s");
    const c = analyzeContentUrl("https://youtube.com/shorts/AbC123xyz");
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(b.fingerprint).toBe(c.fingerprint);
    expect(a.platform).toBe("youtube");
  });

  it("extracts the handle from X status URLs and rejects invalid URLs", () => {
    const x = analyzeContentUrl("https://x.com/sarahvlogs/status/1234567890");
    expect(x.platform).toBe("x");
    expect(x.handle).toBe("sarahvlogs");
    expect(analyzeContentUrl("bukan url").ok).toBe(false);
    expect(analyzeContentUrl("ftp://example.com/a").ok).toBe(false);
  });
});

describe("hashtag and handle helpers", () => {
  it("extracts unique lowercase hashtags from a caption", () => {
    expect(extractHashtags("Pagi! #KopiNusantara #rasapagi #kopinusantara")).toEqual(["kopinusantara", "rasapagi"]);
  });

  it("normalizes handles", () => {
    expect(normalizeHandle("  @@Dimas.Creates ")).toBe("dimas.creates");
    expect(normalizeHandle(null)).toBe("");
  });
});