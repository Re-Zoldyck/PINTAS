import React from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { HandCoins, MessageSquareWarning, Pencil, ArrowLeft } from "lucide-react";
import { SubmissionDetailView } from "../components/SubmissionDetailView";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { InlineAlert, Stack } from "../components/Layouts";
import { useSubmissionDetail } from "../helpers/useSubmissions";
import { formatRupiah } from "../helpers/formatRupiah";
import styles from "./creator.submissions.$submissionId.module.css";

export default function CreatorSubmissionDetailPage() {
  const { submissionId } = useParams();
  const id = Number(submissionId);
  const { data, isPending, error } = useSubmissionDetail(id);

  if (error) return <InlineAlert tone="error">{error.message}</InlineAlert>;
  if (isPending || !data) {
    return (
      <Stack>
        <Skeleton className={styles.skeletonHead} />
        <Skeleton className={styles.skeletonBody} />
      </Stack>
    );
  }
  const s = data.submission;

  return (
    <>
      <Helmet>
        <title>
          {s.code} {s.title} — PINTAS
        </title>
      </Helmet>
      <Link to="/creator/submissions" className={styles.back}>
        <ArrowLeft size={14} /> Semua submission
      </Link>
      <SubmissionDetailView
        submission={s}
        viewer="creator"
        actions={
          <>
            {s.status === "draft" && (
              <Button asChild>
                <Link to={`/creator/submit?id=${s.id}`}>
                  <Pencil size={16} /> Lanjutkan draft
                </Link>
              </Button>
            )}
            {s.status === "ai_failed" && (
              <Button asChild variant="secondary">
                <Link to={`/creator/submissions/${s.id}/dispute`}>
                  <MessageSquareWarning size={16} /> Ajukan sanggahan
                </Link>
              </Button>
            )}
            {s.status === "claimable" && (
              <Button asChild>
                <Link to={`/creator/submissions/${s.id}/claim`}>
                  <HandCoins size={16} /> Claim {formatRupiah(s.approvedAmount ?? 0)}
                </Link>
              </Button>
            )}
          </>
        }
      />
    </>
  );
}