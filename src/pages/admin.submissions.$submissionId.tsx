import React from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SubmissionDetailView } from "../components/SubmissionDetailView";
import { AdminDecisionPanel } from "../components/AdminDecisionPanel";
import { Skeleton } from "../components/Skeleton";
import { InlineAlert, Stack } from "../components/Layouts";
import { useSubmissionDetail } from "../helpers/useSubmissions";
import styles from "./admin.submissions.$submissionId.module.css";

export default function AdminSubmissionReviewPage() {
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
          Review {s.code} {s.title} — PINTAS
        </title>
      </Helmet>
      <Link to="/admin/submissions" className={styles.back}>
        <ArrowLeft size={14} /> Antrian verifikasi
      </Link>
      <SubmissionDetailView submission={s} viewer="admin" sidePanel={<AdminDecisionPanel submission={s} />} />
    </>
  );
}