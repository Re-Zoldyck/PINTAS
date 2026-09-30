import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Rocket } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "./SectionCard";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Switch } from "./Switch";
import { Button } from "./Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { FileUploadField } from "./FileUploadField";
import { TwoCol, Stack, InlineAlert } from "./Layouts";
import { BudgetProgress } from "./BudgetProgress";
import { useSaveCampaign } from "../helpers/useCampaigns";
import { schema as saveSchema, MIN_CAMPAIGN_BUDGET } from "../endpoints/campaigns/save_POST.schema";
import { CampaignPlatformArrayValues, type CampaignPlatform, type DuplicatePolicy } from "../helpers/schema";
import { platformLabel } from "../helpers/pintasLabels";
import type { CampaignSummary } from "../helpers/pintasTypes";
import type { UploadedFile } from "../helpers/useFileUpload";
import { calculatePayout, describePayoutRule } from "../helpers/payout";
import { formatRupiah } from "../helpers/formatRupiah";
import styles from "./CampaignForm.module.css";

interface Props {
  existing?: CampaignSummary | null;
  className?: string;
}

const toDateInput = (d: Date | string | null | undefined) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const todayLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const CampaignForm: React.FC<Props> = ({ existing, className }) => {
  const navigate = useNavigate();
  const save = useSaveCampaign();
  const locked = !!existing && existing.status !== "draft";

  const [f, setF] = useState({
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    budgetTotal: existing ? String(existing.budgetTotal) : "4000000",
    startDate: toDateInput(existing?.startDate) || todayLocal(),
    endDate: toDateInput(existing?.endDate) || "",
    target: existing?.target ?? "",
    targetViews: existing?.targetViews ? String(existing.targetViews) : "",
    requiredPlatform: (existing?.requiredPlatform ?? "any") as CampaignPlatform,
    watermarkRequired: existing?.watermarkRequired ?? false,
    minViews: existing ? String(existing.minViews) : "0",
    duplicatePolicy: (existing?.duplicatePolicy ?? "need_review") as DuplicatePolicy,
    requiredCaption: existing?.requiredCaption ?? "",
    requiredHashtags: existing?.requiredHashtags.map((t) => "#" + t).join(" ") ?? "",
    editingRequirement: existing?.editingRequirement ?? "",
    ratePerThousandViews: existing ? String(existing.ratePerThousandViews) : "10000",
    feePerSubmission: existing ? String(existing.feePerSubmission) : "0",
    maxPayoutPerSubmission: existing ? String(existing.maxPayoutPerSubmission) : "0",
  });
  const [logo, setLogo] = useState<UploadedFile | null>(
    existing?.watermarkLogoUrl ? { filename: "(tersimpan)", url: existing.watermarkLogoUrl, name: "Logo tersimpan" } : null
  );
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const n = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  const rule = useMemo(
    () => ({ ratePerThousandViews: n(f.ratePerThousandViews), feePerSubmission: n(f.feePerSubmission), maxPayoutPerSubmission: n(f.maxPayoutPerSubmission) }),
    [f.ratePerThousandViews, f.feePerSubmission, f.maxPayoutPerSubmission]
  );
  const budget = n(f.budgetTotal);

  const build = (publish: boolean) => ({
    id: existing?.id,
    name: f.name,
    description: f.description,
    budgetTotal: budget,
    startDate: f.startDate,
    endDate: f.endDate,
    target: f.target,
    targetViews: f.targetViews ? n(f.targetViews) : null,
    requiredPlatform: f.requiredPlatform,
    watermarkRequired: f.watermarkRequired,
    watermarkLogoUrl: logo?.url ?? null,
    watermarkLogoFilename: logo && logo.filename !== "(tersimpan)" ? logo.filename : null,
    minViews: n(f.minViews),
    duplicatePolicy: f.duplicatePolicy,
    requiredCaption: f.requiredCaption || null,
    requiredHashtags: f.requiredHashtags.split(/[\s,]+/).map((t) => t.replace(/^#+/, "")).filter(Boolean),
    editingRequirement: f.editingRequirement || null,
    ratePerThousandViews: rule.ratePerThousandViews,
    feePerSubmission: rule.feePerSubmission,
    maxPayoutPerSubmission: rule.maxPayoutPerSubmission,
    publish,
  });

  const submit = (publish: boolean) => {
    setFormError(null);
    const parsed = saveSchema.safeParse(build(publish));
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message ?? "Data belum lengkap");
      return;
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      setFormError("Tanggal berakhir harus setelah tanggal mulai.");
      return;
    }
    if (publish && parsed.data.watermarkRequired && !logo) {
      setFormError("Unggah logo watermark PNG sebelum mengaktifkan campaign.");
      return;
    }
    save.mutate(parsed.data, {
      onSuccess: (res) => {
        toast.success(publish ? "Campaign aktif dan terlihat oleh creator" : existing ? "Perubahan tersimpan" : "Campaign tersimpan sebagai draft");
        navigate(`/owner/campaigns/${res.campaign.id}`);
      },
      onError: (e) => setFormError(e.message),
    });
  };

  const busy = save.isPending;

  return (
    <div className={className}>
      {formError && <InlineAlert tone="error">{formError}</InlineAlert>}
      {locked && (
        <InlineAlert tone="warning">
          Campaign sudah berjalan: hanya nama, deskripsi, target, tanggal berakhir, dan catatan editing yang dapat diubah agar adil bagi creator yang sudah bergabung. Budget dapat ditambah dari halaman detail.
        </InlineAlert>
      )}
      <TwoCol>
        <Stack>
          <SectionCard title="Informasi campaign">
            <div className={styles.field}>
              <label className={styles.label}>Nama campaign</label>
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Mis. Kopi Nusantara — Rasa Pagi Indonesia" disabled={busy} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Deskripsi</label>
              <Textarea rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief untuk creator: gaya konten, pesan utama, hal yang harus/tidak boleh dilakukan." disabled={busy} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Tanggal mulai</label>
                <Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} disabled={busy || locked} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tanggal berakhir</label>
                <Input type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} disabled={busy} />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Target campaign</label>
                <Input value={f.target} onChange={(e) => set("target", e.target.value)} placeholder="Mis. 100.000 total views dari 20 konten" disabled={busy} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Target views (angka, opsional)</label>
                <Input type="number" min={0} value={f.targetViews} onChange={(e) => set("targetViews", e.target.value)} disabled={busy} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Budget & aturan pembayaran" description={`Minimum budget campaign ${formatRupiah(MIN_CAMPAIGN_BUDGET)}.`}>
            <div className={styles.field}>
              <label className={styles.label}>Budget total (Rp)</label>
              <Input type="number" min={MIN_CAMPAIGN_BUDGET} step={100000} value={f.budgetTotal} onChange={(e) => set("budgetTotal", e.target.value)} disabled={busy || locked} />
              <span className={styles.help}>{formatRupiah(budget)}{budget < MIN_CAMPAIGN_BUDGET && ` — kurang dari minimum ${formatRupiah(MIN_CAMPAIGN_BUDGET)}`}</span>
            </div>
            <div className={styles.row3}>
              <div className={styles.field}>
                <label className={styles.label}>Tarif per 1.000 views (Rp)</label>
                <Input type="number" min={0} step={1000} value={f.ratePerThousandViews} onChange={(e) => set("ratePerThousandViews", e.target.value)} disabled={busy || locked} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Fee tetap per submission (Rp)</label>
                <Input type="number" min={0} step={5000} value={f.feePerSubmission} onChange={(e) => set("feePerSubmission", e.target.value)} disabled={busy || locked} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Maks. per submission (Rp, 0 = tanpa batas)</label>
                <Input type="number" min={0} step={50000} value={f.maxPayoutPerSubmission} onChange={(e) => set("maxPayoutPerSubmission", e.target.value)} disabled={busy || locked} />
              </div>
            </div>
            <p className={styles.ruleSummary}>
              {describePayoutRule(rule, formatRupiah)}. Contoh: konten 10.000 views = <strong>{formatRupiah(calculatePayout(rule, 10000))}</strong>.
            </p>
          </SectionCard>

          <SectionCard title="Requirement konten" description="Dipakai AI untuk memverifikasi setiap submission.">
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Platform yang diwajibkan</label>
                <Select value={f.requiredPlatform} onValueChange={(v) => set("requiredPlatform", v as CampaignPlatform)} disabled={busy || locked}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CampaignPlatformArrayValues.map((p) => (
                      <SelectItem key={p} value={p}>
                        {platformLabel[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Minimum views per konten</label>
                <Input type="number" min={0} step={100} value={f.minViews} onChange={(e) => set("minViews", e.target.value)} disabled={busy || locked} />
              </div>
            </div>
            <div className={styles.switchRow}>
              <div>
                <span className={styles.label}>Wajib watermark logo</span>
                <span className={styles.help}>Konten tanpa watermark otomatis dianggap tidak memenuhi requirement.</span>
              </div>
              <Switch checked={f.watermarkRequired} onCheckedChange={(v) => set("watermarkRequired", v)} disabled={busy || locked} />
            </div>
            {f.watermarkRequired && (
              <div className={styles.field}>
                <label className={styles.label}>Logo watermark (PNG)</label>
                <FileUploadField kind="watermark" value={logo} onChange={setLogo} accept="image/png" title="Unggah logo PNG" subtitle="PNG transparan disarankan — maks. 4 MB" disabled={busy || locked} />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Duplicate / reupload</label>
              <Select value={f.duplicatePolicy} onValueChange={(v) => set("duplicatePolicy", v as DuplicatePolicy)} disabled={busy || locked}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="need_review">Tandai NEED REVIEW (Admin memeriksa)</SelectItem>
                  <SelectItem value="fail">Tandai FAIL (langsung tidak lolos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Kata/kalimat wajib di caption</label>
                <Input value={f.requiredCaption} onChange={(e) => set("requiredCaption", e.target.value)} placeholder="Pisahkan dengan koma, mis. Kopi Nusantara, promo" disabled={busy || locked} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Hashtag wajib</label>
                <Input value={f.requiredHashtags} onChange={(e) => set("requiredHashtags", e.target.value)} placeholder="#kopinusantara #rasapagi" disabled={busy || locked} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Requirement editing</label>
              <Textarea rows={3} value={f.editingRequirement} onChange={(e) => set("editingRequirement", e.target.value)} placeholder="Mis. Cuplikan produk minimal 3 detik, CTA di akhir, durasi 20–60 detik." disabled={busy} />
            </div>
          </SectionCard>

          <div className={styles.actions}>
            {(!existing || existing.status === "draft") && (
              <Button variant="outline" onClick={() => submit(false)} disabled={busy}>
                <Save size={16} /> {existing ? "Simpan draft" : "Simpan sebagai draft"}
              </Button>
            )}
            {locked ? (
              <Button onClick={() => submit(false)} disabled={busy}>
                <Save size={16} /> Simpan perubahan
              </Button>
            ) : (
              <Button onClick={() => submit(true)} disabled={busy}>
                <Rocket size={16} /> {existing ? "Simpan & aktifkan" : "Buat & aktifkan campaign"}
              </Button>
            )}
          </div>
        </Stack>

        <Stack>
          <SectionCard title="Pratinjau budget">
            <BudgetProgress budgetTotal={Math.max(budget, 1)} budgetUsed={existing?.budgetUsed ?? 0} budgetReserved={existing?.budgetReserved ?? 0} variant="full" />
            <p className={styles.help}>Budget dikurangi hanya saat submission disetujui Admin (dialokasikan) dan saat pembayaran dikonfirmasi (dibayar). Sistem tidak pernah membayar melebihi budget.</p>
          </SectionCard>
          <SectionCard title="Yang dilihat creator">
            <ul className={styles.previewList}>
              <li>{platformLabel[f.requiredPlatform]}{f.watermarkRequired ? " · watermark wajib" : ""}</li>
              <li>{n(f.minViews) > 0 ? `Min. ${n(f.minViews).toLocaleString("id-ID")} views` : "Tanpa minimum views"}</li>
              <li>{f.requiredHashtags ? f.requiredHashtags : "Hashtag bebas"}</li>
              <li>{describePayoutRule(rule, formatRupiah)}</li>
            </ul>
          </SectionCard>
        </Stack>
      </TwoCol>
    </div>
  );
};