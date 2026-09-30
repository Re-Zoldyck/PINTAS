import { Kysely, Transaction } from "kysely";
import { DB, AiResult, SocialPlatform } from "./schema";
import { AiCheck } from "./pintasTypes";
import {
  analyzeContentUrl,
  extractHashtags,
  normalizeHandle,
  normalizeHashtag,
} from "./contentFingerprint";
import { platformLabel, submissionCode } from "./pintasLabels";
import { ApiError } from "./apiUtils";

type Db = Kysely<DB> | Transaction<DB>;

export type AiVerificationOutcome = {
  result: AiResult;
  checks: AiCheck[];
  summary: string;
};

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
const SUSPICIOUS_VIEWS = 5_000_000;

/**
 * Rule-based "AI Verification" engine. Every campaign requirement is checked
 * deterministically against the submission data, the creator profile and the
 * submission history. Produces PASS / FAIL / NEED REVIEW with a per-check
 * explanation. The Admin always makes the final decision.
 */
export async function runAiVerification(
  dbx: Db,
  submissionId: number
): Promise<AiVerificationOutcome> {
  const s = await dbx
    .selectFrom("submissions")
    .selectAll()
    .where("id", "=", submissionId)
    .executeTakeFirst();
  if (!s) throw new ApiError("Submission tidak ditemukan", 404);

  const c = await dbx
    .selectFrom("campaigns")
    .selectAll()
    .where("id", "=", s.campaignId)
    .executeTakeFirst();
  if (!c) throw new ApiError("Campaign tidak ditemukan", 404);

  const accounts = await dbx
    .selectFrom("creatorSocialAccounts")
    .select(["platform", "handle"])
    .where("userId", "=", s.creatorId)
    .execute();
  const registered = new Map<SocialPlatform, string>();
  for (const a of accounts) registered.set(a.platform, normalizeHandle(a.handle));

  const duplicates = await dbx
    .selectFrom("submissions")
    .select(["id", "campaignId", "creatorId", "sequenceNo", "viewsClaimed", "status", "createdAt"])
    .where("contentFingerprint", "=", s.contentFingerprint)
    .where("id", "<>", s.id)
    .where("status", "<>", "draft")
    .orderBy("createdAt", "asc")
    .execute();

  const checks: AiCheck[] = [];
  const urlInfo = analyzeContentUrl(s.contentUrl);
  const handle = normalizeHandle(s.accountHandle);

  // 1. Platform
  if (!urlInfo.ok) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "fail", detail: "URL konten tidak valid (harus diawali http:// atau https://)." });
  } else if (c.requiredPlatform !== "any" && s.platform !== c.requiredPlatform) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "fail", detail: `Campaign mewajibkan ${platformLabel[c.requiredPlatform]}, submission memakai ${platformLabel[s.platform]}.` });
  } else if (urlInfo.platform && urlInfo.platform !== s.platform) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "fail", detail: `Domain URL (${urlInfo.host}) adalah ${platformLabel[urlInfo.platform]}, tidak sesuai platform yang dipilih (${platformLabel[s.platform]}).` });
  } else if (!urlInfo.platform) {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "review", detail: `Domain ${urlInfo.host || "URL"} tidak dikenali sebagai platform yang didukung. Admin perlu memeriksa tautan secara manual.` });
  } else {
    checks.push({ key: "platform", label: "Platform & URL konten", status: "pass", detail: `URL berasal dari ${platformLabel[urlInfo.platform]} dan sesuai ketentuan campaign.` });
  }

  // 2. Account
  const registeredHandle = registered.get(s.platform);
  if (!handle) {
    checks.push({ key: "account", label: "Akun creator", status: "fail", detail: "Akun/handle pada submission kosong." });
  } else if (!registeredHandle) {
    checks.push({ key: "account", label: "Akun creator", status: "review", detail: `Akun @${handle} belum terdaftar di profil creator untuk ${platformLabel[s.platform]}. Admin perlu memastikan kepemilikan akun.` });
  } else if (registeredHandle !== handle) {
    checks.push({ key: "account", label: "Akun creator", status: "fail", detail: `Akun pada submission (@${handle}) berbeda dengan akun terdaftar di profil (@${registeredHandle}).` });
  } else if (urlInfo.handle && urlInfo.handle !== handle) {
    checks.push({ key: "account", label: "Akun creator", status: "fail", detail: `Handle pada URL (@${urlInfo.handle}) berbeda dengan akun submission (@${handle}).` });
  } else {
    checks.push({ key: "account", label: "Akun creator", status: "pass", detail: `Akun @${handle} cocok dengan akun ${platformLabel[s.platform]} yang terdaftar di profil.` });
  }

  // 3. Watermark
  if (!c.watermarkRequired) {
    checks.push({ key: "watermark", label: "Watermark logo", status: "skip", detail: "Campaign tidak mewajibkan watermark." });
  } else if (!s.watermarkApplied) {
    checks.push({ key: "watermark", label: "Watermark logo", status: "fail", detail: "Campaign mewajibkan watermark logo, tetapi creator menyatakan konten tanpa watermark." });
  } else if (!s.proofScreenshotFilename) {
    checks.push({ key: "watermark", label: "Watermark logo", status: "review", detail: "Watermark dinyatakan ada, tetapi tidak ada screenshot bukti untuk memastikan logo yang dipakai benar." });
  } else {
    checks.push({ key: "watermark", label: "Watermark logo", status: "pass", detail: "Watermark dinyatakan ada dan bukti screenshot terlampir. Kecocokan dengan logo resmi campaign dikonfirmasi Admin secara visual." });
  }

  // 4. Views
  const views = s.viewsClaimed;
  if (c.minViews > 0 && views < c.minViews) {
    checks.push({ key: "views", label: "Ketentuan views", status: "fail", detail: `Views yang diklaim (${views.toLocaleString("id-ID")}) di bawah minimum campaign (${c.minViews.toLocaleString("id-ID")}).` });
  } else if (views > 0 && !s.proofScreenshotFilename) {
    checks.push({ key: "views", label: "Ketentuan views", status: "review", detail: `Views diklaim ${views.toLocaleString("id-ID")} tanpa screenshot bukti. Views tanpa bukti tidak dapat dijadikan dasar pembayaran.` });
  } else if (views > 0) {
    checks.push({ key: "views", label: "Ketentuan views", status: "pass", detail: `Views ${views.toLocaleString("id-ID")} dinyatakan sesuai screenshot bukti yang dilampirkan${c.minViews > 0 ? ` (minimum ${c.minViews.toLocaleString("id-ID")})` : ""}.` });
  } else {
    checks.push({ key: "views", label: "Ketentuan views", status: "pass", detail: "Tidak ada views yang diklaim; pembayaran hanya memakai komponen tetap per submission (jika ada)." });
  }

  // 5. Duplicate / reupload
  const sameOwnCampaign = duplicates.find((d) => d.creatorId === s.creatorId && d.campaignId === s.campaignId);
  const other = duplicates[0];
  if (sameOwnCampaign) {
    checks.push({ key: "duplicate", label: "Duplikat / reupload", status: "fail", detail: `Konten dengan URL yang sama sudah pernah kamu submit di campaign ini (submission ${submissionCode(sameOwnCampaign.sequenceNo)}).` });
  } else if (other) {
    const where = other.creatorId === s.creatorId ? "di campaign lain oleh akun yang sama" : "oleh creator lain";
    const status = c.duplicatePolicy === "fail" ? "fail" : "review";
    checks.push({ key: "duplicate", label: "Duplikat / reupload", status, detail: `Konten dengan URL yang sama pernah disubmit ${where} (ID submission ${other.id}). Sesuai aturan campaign ditandai ${status === "fail" ? "FAIL" : "NEED REVIEW"}.` });
  } else {
    checks.push({ key: "duplicate", label: "Duplikat / reupload", status: "pass", detail: "Tidak ditemukan submission lain dengan konten yang sama." });
  }

  // 6. Caption
  const captionKeywords = (c.requiredCaption ?? "")
    .split(/[,;|\n]/)
    .map((k) => k.trim())
    .filter(Boolean);
  if (captionKeywords.length === 0) {
    checks.push({ key: "caption", label: "Caption", status: "skip", detail: "Campaign tidak menetapkan ketentuan caption." });
  } else {
    const captionLower = s.caption.toLowerCase();
    const missing = captionKeywords.filter((k) => !captionLower.includes(k.toLowerCase()));
    if (missing.length > 0) {
      checks.push({ key: "caption", label: "Caption", status: "fail", detail: `Caption tidak memuat kata/kalimat wajib: ${missing.map((m) => `"${m}"`).join(", ")}.` });
    } else {
      checks.push({ key: "caption", label: "Caption", status: "pass", detail: `Caption memuat semua kata/kalimat wajib (${captionKeywords.length}).` });
    }
  }

  // 7. Hashtags
  const requiredTags = c.requiredHashtags.map(normalizeHashtag).filter(Boolean);
  if (requiredTags.length === 0) {
    checks.push({ key: "hashtags", label: "Hashtag", status: "skip", detail: "Campaign tidak menetapkan hashtag wajib." });
  } else {
    const present = new Set<string>([
      ...s.hashtags.map(normalizeHashtag),
      ...extractHashtags(s.caption),
    ]);
    const missingTags = requiredTags.filter((t) => !present.has(t));
    if (missingTags.length > 0) {
      checks.push({ key: "hashtags", label: "Hashtag", status: "fail", detail: `Hashtag wajib tidak ditemukan: ${missingTags.map((t) => "#" + t).join(" ")}.` });
    } else {
      checks.push({ key: "hashtags", label: "Hashtag", status: "pass", detail: `Semua hashtag wajib ada (${requiredTags.map((t) => "#" + t).join(" ")}).` });
    }
  }

  // 8. Editing requirement
  if (!c.editingRequirement) {
    checks.push({ key: "editing", label: "Requirement editing", status: "skip", detail: "Campaign tidak menetapkan requirement editing khusus." });
  } else if (!s.editingConfirmed) {
    checks.push({ key: "editing", label: "Requirement editing", status: "fail", detail: "Creator belum mengonfirmasi bahwa konten memenuhi requirement editing campaign." });
  } else {
    checks.push({ key: "editing", label: "Requirement editing", status: "pass", detail: "Creator mengonfirmasi requirement editing terpenuhi; Admin memastikan secara visual saat konfirmasi." });
  }

  // 9. Proof validity
  const needsProof = c.watermarkRequired || c.minViews > 0 || views > 0;
  if (s.proofScreenshotFilename) {
    if (!IMAGE_EXT.test(s.proofScreenshotFilename)) {
      checks.push({ key: "proof", label: "Validitas bukti", status: "fail", detail: "File bukti bukan berkas gambar (screenshot)." });
    } else {
      checks.push({ key: "proof", label: "Validitas bukti", status: "pass", detail: "Screenshot bukti terlampir dalam format gambar yang valid." });
    }
  } else if (needsProof) {
    checks.push({ key: "proof", label: "Validitas bukti", status: "review", detail: "Screenshot bukti tidak dilampirkan padahal campaign memerlukan bukti (views/watermark)." });
  } else {
    checks.push({ key: "proof", label: "Validitas bukti", status: "pass", detail: "Bukti minimal (URL konten) tersedia; campaign tidak mensyaratkan screenshot." });
  }

  // 10. Manipulation indications
  const manipulationFlags: string[] = [];
  if (views >= SUSPICIOUS_VIEWS) {
    manipulationFlags.push(`angka views sangat tinggi (${views.toLocaleString("id-ID")})`);
  }
  const earlierHigher = duplicates.find((d) => d.viewsClaimed > views);
  if (earlierHigher) {
    manipulationFlags.push(`views lebih rendah dari submission sebelumnya untuk konten yang sama (${earlierHigher.viewsClaimed.toLocaleString("id-ID")})`);
  }
  if (c.minViews > 0 && views >= c.minViews && views < c.minViews * 1.02 && views !== c.minViews) {
    manipulationFlags.push("angka views tepat di ambang minimum campaign");
  }
  if (manipulationFlags.length > 0) {
    checks.push({ key: "manipulation", label: "Indikasi manipulasi bukti", status: "review", detail: `Perlu verifikasi manual: ${manipulationFlags.join("; ")}.` });
  } else {
    checks.push({ key: "manipulation", label: "Indikasi manipulasi bukti", status: "pass", detail: "Tidak ditemukan indikasi manipulasi pada data submission." });
  }

  const fails = checks.filter((x) => x.status === "fail").length;
  const reviews = checks.filter((x) => x.status === "review").length;
  const passes = checks.filter((x) => x.status === "pass").length;
  const skips = checks.filter((x) => x.status === "skip").length;

  let result: AiResult;
  let summary: string;
  if (fails > 0) {
    result = "fail";
    summary = `FAIL — ${fails} requirement tidak terpenuhi, ${reviews} perlu review, ${passes} lolos${skips ? `, ${skips} tidak berlaku` : ""}. Creator dapat mengajukan sanggahan.`;
  } else if (reviews > 0) {
    result = "need_review";
    summary = `NEED REVIEW — ${passes} lolos, ${reviews} perlu pemeriksaan manual Admin${skips ? `, ${skips} tidak berlaku` : ""}.`;
  } else {
    result = "pass";
    summary = `PASS — ${passes} pemeriksaan lolos${skips ? `, ${skips} tidak berlaku` : ""}. Menunggu konfirmasi akhir Admin.`;
  }

  return { result, checks, summary };
}