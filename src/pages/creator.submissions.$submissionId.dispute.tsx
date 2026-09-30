import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { AiCheckList } from "../components/AiCheckList";
import { Textarea } from "../components/Textarea";
import { Button } from "../components/Button";
import { FileUploadField } from "../components/FileUploadField";
import { Skeleton } from "../components/Skeleton";
import { TwoCol, Stack, InlineAlert } from "../components/Layouts";
import { useCreateDispute, useSubmissionDetail } from "../helpers/useSubmissions";
import type { UploadedFile } from "../helpers/useFileUpload";
import styles from "./creator.submissions.$submissionId.dispute.module.css";

export default function CreatorDisputePage() {
  const { submissionId } = useParams();
  const id = Number(submissionId);
  const navigate = useNavigate();
  const { data, isPending, error } = useSubmissionDetail(id);
  const createDispute = useCreateDispute();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<UploadedFile | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (error) return <InlineAlert tone="error">{error.message}</InlineAlert>;
  if (isPending || !data) return <Skeleton className={styles.skeleton} />;
  const s = data.submission;

  if (s.status !== "ai_failed") {
    return (
      <InlineAlert tone="warning">
        Sanggahan hanya dapat diajukan untuk submission dengan hasil AI FAILED. Status saat ini: {s.status}.{" "}
        <Link to={`/creator/submissions/${s.id}`}>Kembali ke detail</Link>
      </InlineAlert>
    );
  }

  const submit = () => {
    setFormError(null);
    if (reason.trim().length < 10) {
      setFormError("Jelaskan alasan sanggahan minimal 10 karakter.");
      return;
    }
    createDispute.mutate(
      { submissionId: s.id, reason: reason.trim(), evidenceFilename: evidence?.filename ?? null },
      {
        onSuccess: () => {
          toast.success("Sanggahan terkirim. Admin akan memeriksanya.");
          navigate(`/creator/submissions/${s.id}`);
        },
        onError: (e) => setFormError(e.message),
      }
    );
  };

  return (
    <>
      <Helmet>
        <title>Sanggahan {s.code} — PINTAS</title>
      </Helmet>
      <Link to={`/creator/submissions/${s.id}`} className={styles.back}>
        <ArrowLeft size={14} /> Kembali ke submission {s.code}
      </Link>
      <PageHeader
        eyebrow="Sanggahan"
        title={`Ajukan sanggahan untuk ${s.code} · ${s.title}`}
        description="Jelaskan mengapa hasil AI tidak tepat dan lampirkan bukti tambahan bila ada. Admin menentukan hasil akhir sanggahan."
      />
      {formError && <InlineAlert tone="error">{formError}</InlineAlert>}
      <TwoCol>
        <Stack>
          <SectionCard title="Alasan sanggahan">
            <Textarea
              rows={6}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Watermark sudah ada di pojok kanan bawah sejak awal; screenshot bukti saya lampirkan…"
              disabled={createDispute.isPending}
            />
          </SectionCard>
          <SectionCard title="Bukti tambahan (opsional)">
            <FileUploadField kind="dispute" value={evidence} onChange={setEvidence} disabled={createDispute.isPending} />
          </SectionCard>
          <div className={styles.actions}>
            <Button variant="ghost" asChild>
              <Link to={`/creator/submissions/${s.id}`}>Batal</Link>
            </Button>
            <Button onClick={submit} disabled={createDispute.isPending}>
              <Send size={16} /> Kirim sanggahan
            </Button>
          </div>
        </Stack>
        <SectionCard title="Hasil AI yang disanggah" description={s.aiSummary ?? undefined}>
          {s.aiChecks && <AiCheckList checks={s.aiChecks.filter((c) => c.status !== "skip")} />}
        </SectionCard>
      </TwoCol>
    </>
  );
}