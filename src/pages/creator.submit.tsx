import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Circle, AlertTriangle, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { TwoCol, Stack, InlineAlert } from "../components/Layouts";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Checkbox } from "../components/Checkbox";
import { Button } from "../components/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { FileUploadField } from "../components/FileUploadField";
import { Skeleton } from "../components/Skeleton";
import { useCampaignsList } from "../helpers/useCampaigns";
import { useSaveSubmission, useSubmissionDetail } from "../helpers/useSubmissions";
import { useProfile } from "../helpers/useProfile";
import { schema as saveSchema } from "../endpoints/submissions/save_POST.schema";
import { SocialPlatformArrayValues, type SocialPlatform } from "../helpers/schema";
import { platformLabel } from "../helpers/pintasLabels";
import { analyzeContentUrl, extractHashtags, normalizeHashtag, normalizeHandle } from "../helpers/contentFingerprint";
import { calculatePayout, describePayoutRule } from "../helpers/payout";
import { formatNumber, formatRupiah } from "../helpers/formatRupiah";
import type { UploadedFile } from "../helpers/useFileUpload";
import styles from "./creator.submit.module.css";

type FormState = {
  campaignId: number | null;
  title: string;
  contentUrl: string;
  platform: SocialPlatform;
  accountHandle: string;
  caption: string;
  hashtagsText: string;
  viewsClaimed: string;
  proof: UploadedFile | null;
  watermarkApplied: boolean;
  editingConfirmed: boolean;
  creatorNotes: string;
};

const EMPTY: FormState = {
  campaignId: null,
  title: "",
  contentUrl: "",
  platform: "tiktok",
  accountHandle: "",
  caption: "",
  hashtagsText: "",
  viewsClaimed: "",
  proof: null,
  watermarkApplied: false,
  editingConfirmed: false,
  creatorNotes: "",
};

export default function CreatorSubmitPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("id") ? Number(params.get("id")) : null;
  const presetCampaignId = params.get("campaignId") ? Number(params.get("campaignId")) : null;

  const { data: joined, isPending: loadingCampaigns } = useCampaignsList({ scope: "joined" });
  const { data: available } = useCampaignsList({ scope: "available" });
  const { data: profile } = useProfile();
  const { data: existing, isPending: loadingExisting } = useSubmissionDetail(editId);
  const save = useSaveSubmission();

  const [form, setForm] = useState<FormState>({ ...EMPTY, campaignId: presetCampaignId });
  const [formError, setFormError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const campaigns = useMemo(() => {
    const map = new Map<number, NonNullable<typeof joined>["campaigns"][number]>();
    for (const c of available?.campaigns ?? []) map.set(c.id, c);
    for (const c of joined?.campaigns ?? []) map.set(c.id, c);
    return Array.from(map.values()).filter((c) => c.status === "active");
  }, [joined, available]);
  const campaign = campaigns.find((c) => c.id === form.campaignId) ?? null;

  // Prefill from an existing draft
  useEffect(() => {
    if (editId && existing && !prefilled) {
      const s = existing.submission;
      setForm({
        campaignId: s.campaignId,
        title: s.title,
        contentUrl: s.contentUrl,
        platform: s.platform,
        accountHandle: s.accountHandle,
        caption: s.caption,
        hashtagsText: s.hashtags.map((h) => "#" + h).join(" "),
        viewsClaimed: s.viewsClaimed ? String(s.viewsClaimed) : "",
        proof: s.proofScreenshotUrl ? { filename: "(tersimpan)", url: s.proofScreenshotUrl, name: "Screenshot tersimpan" } : null,
        watermarkApplied: s.watermarkApplied,
        editingConfirmed: s.editingConfirmed,
        creatorNotes: s.creatorNotes ?? "",
      });
      setPrefilled(true);
    }
  }, [editId, existing, prefilled]);

  // Lock platform to the campaign requirement and prefill the registered handle
  useEffect(() => {
    if (!campaign) return;
    setForm((prev) => {
      const platform = campaign.requiredPlatform !== "any" ? campaign.requiredPlatform : prev.platform;
      const registered = profile?.profile.socialAccounts.find((a) => a.platform === platform)?.handle;
      return {
        ...prev,
        platform,
        accountHandle: prev.accountHandle || registered || "",
      };
    });
  }, [campaign, profile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const hashtags = useMemo(() => {
    const fromText = form.hashtagsText.split(/[\s,]+/).map(normalizeHashtag).filter(Boolean);
    return Array.from(new Set([...fromText, ...extractHashtags(form.caption)]));
  }, [form.hashtagsText, form.caption]);
  const views = Math.max(0, Math.floor(Number(form.viewsClaimed) || 0));
  const urlInfo = analyzeContentUrl(form.contentUrl);
  const registeredHandle = profile?.profile.socialAccounts.find((a) => a.platform === form.platform)?.handle;

  const checks = campaign
    ? [
        {
          key: "url",
          label: "URL konten valid",
          ok: form.contentUrl.length > 0 && urlInfo.ok && (!urlInfo.platform || urlInfo.platform === form.platform),
          warn: form.contentUrl.length > 0 && urlInfo.ok && !urlInfo.platform,
        },
        {
          key: "account",
          label: registeredHandle ? `Akun terdaftar (@${registeredHandle})` : "Akun belum terdaftar di profil",
          ok: !!registeredHandle && normalizeHandle(form.accountHandle) === normalizeHandle(registeredHandle),
          warn: !registeredHandle,
        },
        ...(campaign.watermarkRequired ? [{ key: "wm", label: "Watermark logo campaign", ok: form.watermarkApplied, warn: false }] : []),
        ...(campaign.minViews > 0 ? [{ key: "views", label: `Minimal ${formatNumber(campaign.minViews)} views`, ok: views >= campaign.minViews, warn: false }] : []),
        { key: "proof", label: "Screenshot bukti", ok: !!form.proof, warn: !form.proof && views > 0 },
        ...(campaign.requiredCaption
          ? [
              {
                key: "caption",
                label: `Caption memuat "${campaign.requiredCaption}"`,
                ok: campaign.requiredCaption
                  .split(/[,;|\n]/)
                  .map((k) => k.trim())
                  .filter(Boolean)
                  .every((k) => form.caption.toLowerCase().includes(k.toLowerCase())),
                warn: false,
              },
            ]
          : []),
        ...(campaign.requiredHashtags.length
          ? [
              {
                key: "tags",
                label: `Hashtag ${campaign.requiredHashtags.map((t) => "#" + t).join(" ")}`,
                ok: campaign.requiredHashtags.every((t) => hashtags.includes(normalizeHashtag(t))),
                warn: false,
              },
            ]
          : []),
        ...(campaign.editingRequirement ? [{ key: "edit", label: "Requirement editing dikonfirmasi", ok: form.editingConfirmed, warn: false }] : []),
      ]
    : [];

  const estimate = campaign ? calculatePayout(campaign, views) : 0;

  const STORED = "(tersimpan)";
  const buildInput = (action: "save_draft" | "submit") => ({
    id: editId ?? undefined,
    campaignId: form.campaignId ?? 0,
    title: form.title,
    contentUrl: form.contentUrl,
    platform: form.platform,
    accountHandle: form.accountHandle,
    caption: form.caption,
    hashtags,
    viewsClaimed: views,
    proofScreenshotFilename: form.proof
      ? form.proof.filename === STORED
        ? existing?.submission.proofScreenshotFilename ?? null
        : form.proof.filename
      : null,
    watermarkApplied: form.watermarkApplied,
    editingConfirmed: form.editingConfirmed,
    creatorNotes: form.creatorNotes || null,
    action,
  });

  const submit = (action: "save_draft" | "submit") => {
    setFormError(null);
    if (!form.campaignId) {
      setFormError("Pilih campaign terlebih dahulu.");
      return;
    }
    const parsed = saveSchema.safeParse(buildInput(action));
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      setFormError(first?.message ?? "Data belum lengkap");
      return;
    }
    save.mutate(parsed.data, {
      onSuccess: (res) => {
        if (action === "submit") {
          toast.success(`Submission terkirim — hasil AI: ${res.aiResult?.toUpperCase().replace("_", " ")}`);
        } else {
          toast.success("Draft tersimpan");
        }
        navigate(`/creator/submissions/${res.id}`);
      },
      onError: (e) => setFormError(e.message),
    });
  };

  if (editId && loadingExisting) {
    return <Skeleton className={styles.skeleton} />;
  }
  if (editId && existing && existing.submission.status !== "draft") {
    return (
      <InlineAlert tone="warning">
        Submission ini sudah dikirim dan tidak dapat diubah. <Link to={`/creator/submissions/${editId}`}>Lihat detail</Link>
      </InlineAlert>
    );
  }

  const disabled = save.isPending;

  return (
    <>
      <Helmet>
        <title>{editId ? "Edit Draft Submission" : "Submit Konten"} — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Submission"
        title={editId ? "Edit draft submission" : "Submit konten"}
        description="Setiap konten adalah satu submission. Lengkapi bukti; AI akan memeriksa requirement campaign begitu dikirim."
      />
      {formError && <InlineAlert tone="error">{formError}</InlineAlert>}
      <TwoCol>
        <Stack>
          <SectionCard title="Campaign">
            {loadingCampaigns ? (
              <Skeleton className={styles.skeletonRow} />
            ) : (
              <Select
                value={form.campaignId ? String(form.campaignId) : ""}
                onValueChange={(v) => set("campaignId", Number(v))}
                disabled={disabled || !!editId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih campaign aktif" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {campaign && (
              <p className={styles.campaignHint}>
                {describePayoutRule(campaign, formatRupiah)} · {platformLabel[campaign.requiredPlatform]}
                {campaign.myParticipation !== "active" && " · Anda otomatis bergabung saat mengirim submission"}
              </p>
            )}
          </SectionCard>

          <SectionCard title="Konten">
            <div className={styles.field}>
              <label className={styles.label}>Judul konten</label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Mis. Ngopi pagi di teras rumah" disabled={disabled} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Platform</label>
                <Select value={form.platform} onValueChange={(v) => set("platform", v as SocialPlatform)} disabled={disabled || (campaign?.requiredPlatform ?? "any") !== "any"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SocialPlatformArrayValues.map((p) => (
                      <SelectItem key={p} value={p}>
                        {platformLabel[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Akun / handle</label>
                <Input value={form.accountHandle} onChange={(e) => set("accountHandle", e.target.value)} placeholder="@namaakun" disabled={disabled} />
                {registeredHandle ? (
                  <span className={styles.help}>Terdaftar di profil: @{registeredHandle}</span>
                ) : (
                  <span className={styles.helpWarn}>
                    Akun {platformLabel[form.platform]} belum terdaftar di <Link to="/creator/profile">profil</Link> — AI akan menandai NEED REVIEW.
                  </span>
                )}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>URL konten</label>
              <Input value={form.contentUrl} onChange={(e) => set("contentUrl", e.target.value)} placeholder="https://www.tiktok.com/@akun/video/…" disabled={disabled} />
              {form.contentUrl && urlInfo.ok && urlInfo.platform && urlInfo.platform !== form.platform && (
                <span className={styles.helpWarn}>URL ini terdeteksi sebagai {platformLabel[urlInfo.platform]}, bukan {platformLabel[form.platform]}.</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Caption</label>
              <Textarea rows={4} value={form.caption} onChange={(e) => set("caption", e.target.value)} placeholder="Salin caption persis seperti yang dipublikasikan" disabled={disabled} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Hashtag</label>
              <Input value={form.hashtagsText} onChange={(e) => set("hashtagsText", e.target.value)} placeholder="#kopinusantara #rasapagi" disabled={disabled} />
              <span className={styles.help}>Hashtag di dalam caption juga ikut dihitung. Terdeteksi: {hashtags.length ? hashtags.map((h) => "#" + h).join(" ") : "—"}</span>
            </div>
          </SectionCard>

          <SectionCard title="Bukti" description="Views dinilai hanya dari screenshot yang Anda lampirkan.">
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Jumlah views (sesuai screenshot)</label>
                <Input type="number" min={0} value={form.viewsClaimed} onChange={(e) => set("viewsClaimed", e.target.value)} placeholder="0" disabled={disabled} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Estimasi pembayaran</label>
                <div className={styles.estimate}>{formatRupiah(estimate)}</div>
                <span className={styles.help}>Final setelah konfirmasi Admin dan dibatasi sisa budget.</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Screenshot bukti (analytics / views)</label>
              <FileUploadField kind="proof" value={form.proof} onChange={(f) => set("proof", f)} disabled={disabled} />
            </div>
            {campaign?.watermarkRequired && (
              <label className={styles.checkRow}>
                <Checkbox checked={form.watermarkApplied} onChange={(e) => set("watermarkApplied", e.target.checked)} disabled={disabled} />
                <span>
                  Konten memakai watermark logo resmi campaign
                  {campaign.watermarkLogoUrl && <img src={campaign.watermarkLogoUrl} alt="Logo" className={styles.wmLogo} />}
                </span>
              </label>
            )}
            {campaign?.editingRequirement && (
              <label className={styles.checkRow}>
                <Checkbox checked={form.editingConfirmed} onChange={(e) => set("editingConfirmed", e.target.checked)} disabled={disabled} />
                <span>
                  Saya mengonfirmasi requirement editing terpenuhi: <em>{campaign.editingRequirement}</em>
                </span>
              </label>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Catatan untuk Admin (opsional)</label>
              <Textarea rows={2} value={form.creatorNotes} onChange={(e) => set("creatorNotes", e.target.value)} disabled={disabled} />
            </div>
          </SectionCard>

          <div className={styles.actions}>
            <Button variant="outline" onClick={() => submit("save_draft")} disabled={disabled}>
              <Save size={16} /> Simpan draft
            </Button>
            <Button onClick={() => submit("submit")} disabled={disabled}>
              <Send size={16} /> Kirim untuk verifikasi
            </Button>
          </div>
        </Stack>

        <Stack>
          <SectionCard title="Cek requirement" description="Pratinjau sebelum dikirim. Pemeriksaan resmi dilakukan AI dan Admin.">
            {!campaign ? (
              <p className={styles.help}>Pilih campaign untuk melihat requirement.</p>
            ) : (
              <ul className={styles.checkList}>
                {checks.map((c) => (
                  <li key={c.key} className={`${styles.checkItem} ${c.ok ? styles.ok : c.warn ? styles.warn : styles.todo}`}>
                    {c.ok ? <CheckCircle2 size={16} /> : c.warn ? <AlertTriangle size={16} /> : <Circle size={16} />}
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          {campaign && (
            <SectionCard title="Ringkasan campaign">
              <p className={styles.help}>{campaign.description}</p>
              <p className={styles.help}>
                <strong>Target:</strong> {campaign.target}
              </p>
            </SectionCard>
          )}
        </Stack>
      </TwoCol>
    </>
  );
}