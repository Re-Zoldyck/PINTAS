import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { CheckCircle2, XCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { ClaimsTable } from "../components/ClaimsTable";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { StatGrid, Stack, InlineAlert } from "../components/Layouts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { useClaimsList } from "../helpers/useSubmissions";
import { useConfirmPayment } from "../helpers/useAdminActions";
import type { ClaimInfo } from "../helpers/pintasTypes";
import { formatRupiah } from "../helpers/formatRupiah";
import styles from "./admin.payments.module.css";

export default function AdminPaymentsPage() {
  const pendingQ = useClaimsList({ status: "pending" });
  const paidQ = useClaimsList({ status: "paid" });
  const confirm = useConfirmPayment();
  const [target, setTarget] = useState<{ claim: ClaimInfo; mode: "paid" | "reject" } | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pending = pendingQ.data?.claims ?? [];
  const paid = paidQ.data?.claims ?? [];

  const open = (claim: ClaimInfo, mode: "paid" | "reject") => {
    setTarget({ claim, mode });
    setReference("");
    setNote("");
    setError(null);
  };

  const submit = () => {
    if (!target) return;
    setError(null);
    if (target.mode === "reject" && note.trim().length < 3) {
      setError("Tulis alasan penolakan claim.");
      return;
    }
    confirm.mutate(
      { claimId: target.claim.id, decision: target.mode, paymentReference: reference.trim() || null, note: note.trim() || null },
      {
        onSuccess: (r) => {
          toast.success(target.mode === "paid" ? `Pembayaran ${formatRupiah(r.amount)} dikonfirmasi — budget campaign diperbarui` : "Claim ditolak, submission kembali ke Siap Claim");
          setTarget(null);
        },
        onError: (e) => setError(e.message),
      }
    );
  };

  return (
    <>
      <Helmet>
        <title>Konfirmasi Pembayaran — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Pembayaran" title="Konfirmasi pembayaran" description="Transfer ke rekening creator, lalu konfirmasi di sini. Setiap konfirmasi langsung mengurangi budget tersisa campaign." />
      {(pendingQ.error || paidQ.error) && <InlineAlert tone="error">{pendingQ.error?.message ?? paidQ.error?.message}</InlineAlert>}
      <Stack gap="lg">
        <StatGrid>
          <StatCard label="Menunggu pembayaran" value={pending.length} tone="warning" hint={formatRupiah(pending.reduce((a, c) => a + c.amount, 0))} icon={<Wallet size={16} />} />
          <StatCard label="Sudah dibayar" value={paid.length} tone="success" hint={formatRupiah(paid.reduce((a, c) => a + c.amount, 0))} />
        </StatGrid>
        <SectionCard title="Payment pending" padded={false}>
          <ClaimsTable
            claims={pending}
            isLoading={pendingQ.isPending}
            showPersonal
            submissionLink={(c) => `/admin/submissions/${c.submissionId}`}
            emptyState={<EmptyState title="Tidak ada pembayaran menunggu" />}
            renderActions={(c) => (
              <>
                <Button size="sm" onClick={() => open(c, "paid")}>
                  <CheckCircle2 size={14} /> Dibayar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => open(c, "reject")}>
                  <XCircle size={14} /> Tolak
                </Button>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Riwayat pembayaran" padded={false}>
          <ClaimsTable claims={paid} isLoading={paidQ.isPending} showPersonal submissionLink={(c) => `/admin/submissions/${c.submissionId}`} emptyState={<EmptyState title="Belum ada pembayaran" />} />
        </SectionCard>
      </Stack>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          {target && (
            <>
              <DialogHeader>
                <DialogTitle>{target.mode === "paid" ? "Konfirmasi pembayaran" : "Tolak claim"}</DialogTitle>
                <DialogDescription>
                  {target.claim.code} · {target.claim.creatorName} · <strong>{formatRupiah(target.claim.amount)}</strong>
                  {target.claim.personal && (
                    <>
                      <br />
                      {target.claim.personal.bankName} {target.claim.personal.bankAccountNumber} a.n. {target.claim.personal.bankAccountHolder}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              {error && <InlineAlert tone="error">{error}</InlineAlert>}
              {target.mode === "paid" && (
                <div className={styles.field}>
                  <label className={styles.label}>Referensi transfer (opsional)</label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Mis. TRF-20260930-0003" />
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label}>Catatan {target.mode === "reject" ? "(wajib — dibaca creator)" : "(opsional)"}</label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={target.mode === "reject" ? "Mis. Nomor rekening tidak valid, mohon ajukan ulang." : ""} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setTarget(null)}>
                  Batal
                </Button>
                <Button variant={target.mode === "reject" ? "destructive" : "primary"} onClick={submit} disabled={confirm.isPending}>
                  {target.mode === "paid" ? "Konfirmasi dibayar" : "Tolak claim"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}