import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { SectionCard, KeyValueList } from "../components/SectionCard";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { TwoCol, Stack, InlineAlert } from "../components/Layouts";
import { useCreateClaim, useSubmissionDetail } from "../helpers/useSubmissions";
import { schema as claimSchema } from "../endpoints/claims/create_POST.schema";
import { formatRupiah, formatNumber } from "../helpers/formatRupiah";
import styles from "./creator.submissions.$submissionId.claim.module.css";

export default function CreatorClaimPage() {
  const { submissionId } = useParams();
  const id = Number(submissionId);
  const navigate = useNavigate();
  const { data, isPending, error } = useSubmissionDetail(id);
  const createClaim = useCreateClaim();
  const [form, setForm] = useState({ realName: "", phone: "", bankName: "", bankAccountNumber: "", bankAccountHolder: "" });
  const [formError, setFormError] = useState<string | null>(null);

  if (error) return <InlineAlert tone="error">{error.message}</InlineAlert>;
  if (isPending || !data) return <Skeleton className={styles.skeleton} />;
  const s = data.submission;

  if (s.status !== "claimable") {
    return (
      <InlineAlert tone="warning">
        {s.status === "claimed" || s.status === "paid"
          ? "Submission ini sudah di-claim. Claim hanya dapat dilakukan satu kali per submission."
          : "Submission ini belum dapat di-claim — dibutuhkan persetujuan Admin terlebih dahulu."}{" "}
        <Link to={`/creator/submissions/${s.id}`}>Kembali ke detail</Link>
      </InlineAlert>
    );
  }

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    setFormError(null);
    const parsed = claimSchema.safeParse({ submissionId: s.id, ...form });
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message ?? "Data belum lengkap");
      return;
    }
    createClaim.mutate(parsed.data, {
      onSuccess: (res) => {
        toast.success(`Claim ${formatRupiah(res.amount)} diajukan. Menunggu konfirmasi pembayaran Admin.`);
        navigate(`/creator/submissions/${s.id}`);
      },
      onError: (e) => setFormError(e.message),
    });
  };

  return (
    <>
      <Helmet>
        <title>Claim {s.code} — PINTAS</title>
      </Helmet>
      <Link to={`/creator/submissions/${s.id}`} className={styles.back}>
        <ArrowLeft size={14} /> Kembali ke submission {s.code}
      </Link>
      <PageHeader
        eyebrow="Claim pembayaran"
        title={`Claim ${formatRupiah(s.approvedAmount ?? 0)}`}
        description="Data di bawah hanya dipakai Admin untuk memproses transfer dan tidak ditampilkan ke pengguna lain."
      />
      {formError && <InlineAlert tone="error">{formError}</InlineAlert>}
      <TwoCol>
        <Stack>
          <SectionCard title="Data pembayaran" description="Diminta hanya saat claim, sesuai prinsip PINTAS.">
            <div className={styles.field}>
              <label className={styles.label}>Nama asli (sesuai KTP)</label>
              <Input value={form.realName} onChange={(e) => set("realName", e.target.value)} disabled={createClaim.isPending} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nomor HP</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08123456789" inputMode="tel" disabled={createClaim.isPending} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Bank</label>
                <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="BCA / Mandiri / BNI…" disabled={createClaim.isPending} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nomor rekening</label>
                <Input value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} inputMode="numeric" disabled={createClaim.isPending} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nama pemilik rekening</label>
              <Input value={form.bankAccountHolder} onChange={(e) => set("bankAccountHolder", e.target.value)} disabled={createClaim.isPending} />
            </div>
            <p className={styles.privacy}>
              <ShieldCheck size={14} /> Nomor rekening, nomor HP, dan nama asli hanya dapat dilihat oleh Admin yang memproses pembayaran.
            </p>
          </SectionCard>
          <div className={styles.actions}>
            <Button variant="ghost" asChild>
              <Link to={`/creator/submissions/${s.id}`}>Batal</Link>
            </Button>
            <Button onClick={submit} disabled={createClaim.isPending}>
              <HandCoins size={16} /> Ajukan claim
            </Button>
          </div>
        </Stack>
        <SectionCard title="Ringkasan">
          <KeyValueList
            items={[
              { label: "Submission", value: `${s.code} · ${s.title}` },
              { label: "Campaign", value: s.campaign.name },
              { label: "Views terverifikasi", value: formatNumber(s.verifiedViews ?? s.viewsClaimed) },
              { label: "Perhitungan", value: formatRupiah(s.calculatedAmount ?? 0) },
              { label: "Disetujui Admin", value: <strong>{formatRupiah(s.approvedAmount ?? 0)}</strong> },
            ]}
          />
          {s.calculatedAmount !== null && s.approvedAmount !== null && s.calculatedAmount > s.approvedAmount && (
            <p className={styles.capNote}>Nominal dibatasi oleh sisa budget campaign saat disetujui.</p>
          )}
        </SectionCard>
      </TwoCol>
    </>
  );
}