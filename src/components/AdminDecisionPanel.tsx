import React, { useState } from "react";
import { CheckCircle2, XCircle, Gavel } from "lucide-react";
import { toast } from "sonner";
import type { SubmissionDetail } from "../helpers/pintasTypes";
import { adminDecidableStatuses, submissionStatusLabel } from "../helpers/pintasLabels";
import { calculatePayout } from "../helpers/payout";
import { budgetView } from "../helpers/budgetView";
import { formatNumber, formatRupiah } from "../helpers/formatRupiah";
import { useDecideDispute, useReviewSubmission } from "../helpers/useAdminActions";
import { SectionCard } from "./SectionCard";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Button } from "./Button";
import { InlineAlert } from "./Layouts";
import styles from "./AdminDecisionPanel.module.css";

interface Props {
  submission: SubmissionDetail;
  className?: string;
}

export const AdminDecisionPanel: React.FC<Props> = ({ submission: s, className }) => {
  const review = useReviewSubmission();
  const decideDispute = useDecideDispute();
  const [views, setViews] = useState(String(s.verifiedViews ?? s.viewsClaimed));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decidable = adminDecidableStatuses.includes(s.status);
  const isDispute = s.status === "disputed" && s.dispute?.status === "pending";
  const verifiedViews = Math.max(0, Math.floor(Number(views) || 0));
  const calculated = calculatePayout(s.campaign, verifiedViews);
  const budget = budgetView(s.campaign);
  const willPay = Math.min(calculated, budget.remaining);
  const busy = review.isPending || decideDispute.isPending;

  if (!decidable) {
    return (
      <SectionCard title="Keputusan Admin" className={className}>
        <p className={styles.muted}>
          Status saat ini <strong>{submissionStatusLabel[s.status]}</strong> — tidak ada keputusan yang perlu diambil di tahap ini.
        </p>
      </SectionCard>
    );
  }

  const act = (decision: "approve" | "reject") => {
    setError(null);
    const trimmed = note.trim();
    if (decision === "reject" && trimmed.length < 3) {
      setError("Tulis alasan penolakan agar creator memahami keputusan ini.");
      return;
    }
    if (isDispute && trimmed.length < 3) {
      setError("Catatan keputusan sanggahan wajib diisi.");
      return;
    }
    const onSuccess = (res: { approvedAmount: number | null; capped: boolean; status: string }) => {
      if (decision === "approve") {
        toast.success(
          res.capped
            ? `Disetujui ${formatRupiah(res.approvedAmount ?? 0)} — dibatasi sisa budget campaign`
            : `Disetujui ${formatRupiah(res.approvedAmount ?? 0)} · siap di-claim creator`
        );
      } else {
        toast.success("Submission ditolak");
      }
      setNote("");
    };
    const onError = (e: Error) => setError(e.message);

    if (isDispute && s.dispute) {
      decideDispute.mutate(
        { disputeId: s.dispute.id, decision: decision === "approve" ? "accept" : "reject", note: trimmed, verifiedViews },
        { onSuccess: (r) => onSuccess({ approvedAmount: r.approvedAmount, capped: r.capped, status: r.status }), onError }
      );
    } else {
      review.mutate(
        { submissionId: s.id, decision, note: trimmed || null, verifiedViews },
        { onSuccess: (r) => onSuccess({ approvedAmount: r.approvedAmount, capped: r.capped, status: r.status }), onError }
      );
    }
  };

  return (
    <SectionCard
      title={isDispute ? "Putuskan sanggahan" : "Konfirmasi Admin"}
      description={isDispute ? "Menerima sanggahan = menyetujui submission; menolak = submission ditolak." : "Keputusan akhir ada pada Admin. AI hanya membantu."}
      className={className}
    >
      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      {s.aiResult === "fail" && !isDispute && (
        <InlineAlert tone="warning">AI menandai FAIL. Menyetujui berarti mengesampingkan hasil AI — tulis alasannya di catatan.</InlineAlert>
      )}
      <div className={styles.field}>
        <label className={styles.label}>Views terverifikasi (sesuai screenshot)</label>
        <Input type="number" min={0} value={views} onChange={(e) => setViews(e.target.value)} disabled={busy} />
        <span className={styles.help}>Creator mengklaim {formatNumber(s.viewsClaimed)} views. Ubah bila screenshot menunjukkan angka berbeda.</span>
      </div>
      <div className={styles.calc}>
        <div className={styles.calcRow}>
          <span>Perhitungan sesuai aturan</span>
          <strong>{formatRupiah(calculated)}</strong>
        </div>
        <div className={styles.calcRow}>
          <span>Sisa budget campaign</span>
          <strong className={budget.exhausted ? styles.danger : ""}>{formatRupiah(budget.remaining)}</strong>
        </div>
        <div className={`${styles.calcRow} ${styles.calcTotal}`}>
          <span>Akan dialokasikan</span>
          <strong>{formatRupiah(willPay)}</strong>
        </div>
        {budget.exhausted && <p className={styles.danger}>Budget campaign habis — persetujuan akan ditolak sistem sampai Owner menambah budget.</p>}
        {!budget.exhausted && willPay < calculated && <p className={styles.warn}>Nominal dibatasi sisa budget (budget protection).</p>}
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Catatan keputusan {isDispute ? "(wajib)" : "(wajib saat menolak)"}</label>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan yang akan dibaca creator dan owner" disabled={busy} />
      </div>
      <div className={styles.actions}>
        <Button variant="destructive" onClick={() => act("reject")} disabled={busy}>
          <XCircle size={16} /> {isDispute ? "Tolak sanggahan" : "Tolak"}
        </Button>
        <Button onClick={() => act("approve")} disabled={busy || budget.exhausted}>
          {isDispute ? <Gavel size={16} /> : <CheckCircle2 size={16} />} {isDispute ? "Terima & setujui" : "Setujui"}
        </Button>
      </div>
    </SectionCard>
  );
};